<?php

namespace Tests\Feature\Api\V1;

use App\Models\Category;
use App\Models\Department;
use App\Models\Item;
use App\Models\PurchaseRequest;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\User;
use App\Services\ProcurementPurchaseRequestService;
use App\Services\PurchaseQuoteService;
use App\Services\PurchaseRequestService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PurchaseQuoteWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private Department $department;
    private User $employee;
    private User $reviewer;
    private User $accountant;
    private User $procurement;
    private User $executive;
    private Item $item;
    /** @var array<int, Supplier> */
    private array $suppliers;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->department = Department::create(['name' => 'التنفيذ', 'code' => 'EXECUTION', 'is_active' => true]);
        $this->employee = $this->makeUser('quote.employee@test', 'الموظف', 'employee');
        $this->reviewer = $this->makeUser('quote.reviewer@test', 'مدير القسم', 'reviewer');
        $this->accountant = $this->makeUser('quote.accountant@test', 'الحسابات', 'accountant');
        $this->procurement = $this->makeUser('quote.procurement@test', 'مدير المشتريات', 'procurement_manager');
        $this->executive = $this->makeUser('quote.executive@test', 'المهندس محمد عبدالكريم', 'general_manager');
        $this->department->update(['manager_user_id' => $this->reviewer->id]);

        $category = Category::create(['name' => 'مواد البناء', 'code' => 'BUILDING', 'is_active' => true]);
        $this->item = Item::create([
            'sku' => 'QUOTE-ITEM-001',
            'name' => 'أسمنت',
            'category_id' => $category->id,
            'uom' => 'PCS',
            'default_estimated_price' => 200,
            'is_active' => true,
        ]);

        $this->suppliers = [];
        foreach (['مورد ألف', 'مورد باء', 'مورد جيم', 'مورد دال'] as $index => $name) {
            $this->suppliers[] = Supplier::create([
                'code' => 'QUOTE-SUP-' . ($index + 1),
                'company_name' => $name,
                'is_active' => true,
            ]);
        }
    }

    public function test_supplier_quotes_are_recommended_and_executive_selects_one(): void
    {
        $request = $this->makeRequest();

        $started = app(ProcurementPurchaseRequestService::class)
            ->approvePurchaseRequest($this->procurement, $request, 'بدء عروض الأسعار');
        $this->assertSame('PENDING_QUOTE_RECOMMENDATIONS', $started->status);

        $withQuotes = app(PurchaseQuoteService::class)->createQuotes($this->procurement, $started, [
            ['supplier_id' => $this->suppliers[0]->id, 'total_amount' => 1100, 'notes' => 'العرض الأول'],
            ['supplier_id' => $this->suppliers[1]->id, 'total_amount' => 950, 'notes' => 'العرض الثاني'],
            ['supplier_id' => $this->suppliers[2]->id, 'total_amount' => 1200, 'notes' => 'العرض الثالث'],
        ]);
        $this->assertSame('PENDING_QUOTE_RECOMMENDATIONS', $withQuotes->status);
        $this->assertCount(3, $withQuotes->quotes);

        $accountantResult = app(PurchaseQuoteService::class)->recommend(
            $this->accountant,
            $withQuotes->quotes[1],
            'RECOMMEND',
            'الأفضل ماليًا.'
        );
        $this->assertSame('PENDING_QUOTE_RECOMMENDATIONS', $accountantResult->status);

        $reviewerResult = app(PurchaseQuoteService::class)->recommend(
            $this->reviewer,
            $accountantResult->quotes[0],
            'RECOMMEND',
            'مناسب فنيًا.'
        );
        $this->assertSame('PENDING_EXECUTIVE_QUOTE_DECISION', $reviewerResult->status);

        $selected = app(PurchaseQuoteService::class)->decide(
            $this->executive,
            $reviewerResult->quotes[1],
            'SELECT',
            'تم اختيار العرض بعد مراجعة الترشيحين.'
        );

        $this->assertSame('APPROVED_BY_PROCUREMENT', $selected->status);
        $this->assertSame($this->suppliers[1]->id, $selected->selectedQuote->supplier_id);
        $this->assertDatabaseHas('purchase_request_quotes', [
            'id' => $selected->selected_quote_id,
            'status' => 'SELECTED',
        ]);
    }

    public function test_general_manager_request_skips_reviewer_and_goes_to_procurement(): void
    {
        $request = $this->makeExecutiveRequest('DRAFT');

        $submitted = app(PurchaseRequestService::class)->submitRequest($this->executive, $request);

        $this->assertSame('PENDING_PROCUREMENT_APPROVAL', $submitted->status);
        $this->assertNull($submitted->reviewer_user_id);
        $this->assertDatabaseHas('purchase_requests', [
            'id' => $request->id,
            'status' => 'PENDING_PROCUREMENT_APPROVAL',
            'reviewer_user_id' => null,
        ]);
    }

    public function test_general_manager_quote_path_blocks_department_recommendation(): void
    {
        $request = $this->makeExecutiveRequest();
        $started = app(ProcurementPurchaseRequestService::class)
            ->approvePurchaseRequest($this->procurement, $request, 'بدء عروض أسعار لطلب المدير العام');
        $withQuotes = app(PurchaseQuoteService::class)->createQuotes($this->procurement, $started, [
            ['supplier_id' => $this->suppliers[0]->id, 'total_amount' => 1100],
            ['supplier_id' => $this->suppliers[1]->id, 'total_amount' => 950],
            ['supplier_id' => $this->suppliers[2]->id, 'total_amount' => 1200],
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('يحتاج ترشيح الحسابات فقط');
        app(PurchaseQuoteService::class)->recommend(
            $this->reviewer,
            $withQuotes->quotes[0],
            'RECOMMEND',
            'محاولة ترشيح غير مسموحة لطلب المدير العام.'
        );
    }

    public function test_general_manager_quote_path_requires_accounting_only_then_executive_decides(): void
    {
        $request = $this->makeExecutiveRequest();
        $started = app(ProcurementPurchaseRequestService::class)
            ->approvePurchaseRequest($this->procurement, $request, 'بدء عروض أسعار لطلب المدير العام');
        $withQuotes = app(PurchaseQuoteService::class)->createQuotes($this->procurement, $started, [
            ['supplier_id' => $this->suppliers[0]->id, 'total_amount' => 1100],
            ['supplier_id' => $this->suppliers[1]->id, 'total_amount' => 950],
            ['supplier_id' => $this->suppliers[2]->id, 'total_amount' => 1200],
        ]);

        $recommended = app(PurchaseQuoteService::class)->recommend(
            $this->accountant,
            $withQuotes->quotes[1],
            'RECOMMEND',
            'ترشيح الحسابات للمدير العام.'
        );

        $this->assertSame('PENDING_EXECUTIVE_QUOTE_DECISION', $recommended->status);
        $this->assertCount(1, $recommended->quotes[1]->recommendations);
        $this->assertSame('ACCOUNTING', $recommended->quotes[1]->recommendations[0]->role_type);
    }

    public function test_procurement_endpoint_starts_quote_route_when_requested(): void
    {
        $request = $this->makeRequest();

        $response = $this->actingAs($this->procurement, 'sanctum')
            ->postJson("/api/v1/procurement/purchase-requests/{$request->id}/approve", [
                'use_quotes' => true,
                'comment' => 'بدء مسار عروض الأسعار.',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'PENDING_QUOTE_RECOMMENDATIONS');
    }

    public function test_quote_creation_rejects_duplicate_suppliers(): void
    {
        $request = $this->makeRequest();
        $request->update(['status' => 'PENDING_QUOTE_RECOMMENDATIONS']);

        $this->expectException(\Illuminate\Validation\ValidationException::class);
        app(PurchaseQuoteService::class)->createQuotes($this->procurement, $request, [
            ['supplier_id' => $this->suppliers[0]->id, 'total_amount' => 1],
            ['supplier_id' => $this->suppliers[0]->id, 'total_amount' => 2],
            ['supplier_id' => $this->suppliers[1]->id, 'total_amount' => 3],
        ]);
    }

    public function test_quote_creation_accepts_two_quotes(): void
    {
        $request = $this->makeRequest();
        $request->update(['status' => 'PENDING_QUOTE_RECOMMENDATIONS']);

        $result = app(PurchaseQuoteService::class)->createQuotes($this->procurement, $request, [
            ['supplier_id' => $this->suppliers[0]->id, 'total_amount' => 1100],
            ['supplier_id' => $this->suppliers[1]->id, 'total_amount' => 950],
        ]);

        $this->assertSame('PENDING_QUOTE_RECOMMENDATIONS', $result->status);
        $this->assertCount(2, $result->quotes);
    }

    public function test_quote_creation_accepts_more_than_three_quotes(): void
    {
        $request = $this->makeRequest();
        $request->update(['status' => 'PENDING_QUOTE_RECOMMENDATIONS']);

        $result = app(PurchaseQuoteService::class)->createQuotes($this->procurement, $request, [
            ['supplier_id' => $this->suppliers[0]->id, 'total_amount' => 1100],
            ['supplier_id' => $this->suppliers[1]->id, 'total_amount' => 950],
            ['supplier_id' => $this->suppliers[2]->id, 'total_amount' => 1200],
            ['supplier_id' => $this->suppliers[3]->id, 'total_amount' => 980],
        ]);

        $this->assertSame('PENDING_QUOTE_RECOMMENDATIONS', $result->status);
        $this->assertCount(4, $result->quotes);
    }

    private function makeExecutiveRequest(string $status = 'PENDING_PROCUREMENT_APPROVAL'): PurchaseRequest
    {
        $request = PurchaseRequest::create([
            'request_number' => 'PR-GM-QUOTE-' . uniqid(),
            'user_id' => $this->executive->id,
            'department_id' => $this->department->id,
            'target_department_id' => $this->department->id,
            'reviewer_user_id' => $this->reviewer->id,
            'site_engineer_user_id' => $this->reviewer->id,
            'priority' => 'NORMAL',
            'status' => $status,
            'total_estimated_cost' => 0,
            'date_needed' => now()->toDateString(),
        ]);
        $request->items()->create([
            'item_id' => $this->item->id,
            'item_description' => 'أسمنت طلب المدير العام',
            'item_reference' => 'GM-QUOTE-PART-001',
            'region' => 'المنطقة السابعة والعشرون',
            'quantity' => 5,
            'uom' => 'PCS',
        ]);
        return $request->fresh();
    }

    private function makeRequest(): PurchaseRequest
    {
        $request = PurchaseRequest::create([
            'request_number' => 'PR-QUOTE-' . uniqid(),
            'user_id' => $this->employee->id,
            'department_id' => $this->department->id,
            'reviewer_user_id' => $this->reviewer->id,
            'site_engineer_user_id' => $this->reviewer->id,
            'priority' => 'NORMAL',
            'status' => 'PENDING_PROCUREMENT_APPROVAL',
            'total_estimated_cost' => 1000,
            'date_needed' => now()->toDateString(),
        ]);
        $request->items()->create([
            'item_id' => $this->item->id,
            'item_description' => 'أسمنت',
            'item_reference' => 'QUOTE-PART-001',
            'region' => 'المنطقة السابعة والعشرون',
            'quantity' => 5,
            'uom' => 'PCS',
            'estimated_unit_price' => 200,
            'estimated_line_total' => 1000,
        ]);
        return $request->fresh();
    }

    private function makeUser(string $email, string $name, string $roleSlug): User
    {
        $user = User::create([
            'department_id' => $this->department->id,
            'name' => $name,
            'email' => $email,
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $user->roles()->attach(Role::where('slug', $roleSlug)->firstOrFail()->id);
        return $user;
    }
}
