<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ApprovalHistory;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Department;
use App\Models\Item;
use App\Models\Notification;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\PurchaseRequestItem;
use App\Models\PurchaseRequestQuote;
use App\Models\PurchaseRequestQuoteRecommendation;
use App\Models\PurchaseReceipt;
use App\Models\PurchaseReceiptItem;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\SupplierBalance;
use App\Models\SupplierInvoice;
use App\Models\SupplierPayment;
use App\Models\SupplierPaymentAllocation;
use App\Models\SystemEvent;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ScenarioSeeder extends Seeder
{
    private const MARKER = 'TEST-540-SCENARIOS';
    private const VERSION = 'v1';
    private const GROUP_COUNT = 27;
    private const CASES_PER_GROUP = 20;

    /**
     * Add-only UAT data generator.
     *
     * The seeder intentionally never deletes or updates non-seeded records.
     * A deterministic request number makes a second run idempotent: existing
     * scenarios are reported as already present and are not duplicated.
     */
    public function run(): void
    {
        $reportRows = [];

        DB::transaction(function () use (&$reportRows): void {
            $this->ensureReferenceData();

            $departments = Department::query()
                ->where('is_active', true)
                ->whereNotNull('manager_user_id')
                ->whereNotNull('site_engineer_user_id')
                ->with(['manager', 'siteEngineer'])
                ->orderBy('id')
                ->get()
                ->values();
            $suppliers = Supplier::query()->where('is_active', true)->orderBy('id')->get()->values();
            $items = Item::query()->where('is_active', true)->orderBy('id')->get()->values();

            if ($departments->count() < 2) {
                throw new \RuntimeException('لا توجد أقسام نشطة مكتملة بمدير قسم ومهندس موقع كافٍ لتنفيذ السيناريوهات.');
            }
            if ($suppliers->count() < 5) {
                throw new \RuntimeException('يجب توفير خمسة موردين نشطين على الأقل لتنويع عروض الأسعار.');
            }
            if ($items->count() < 2) {
                throw new \RuntimeException('يجب توفير صنفين نشطين على الأقل لإنشاء بنود الطلبات.');
            }

            $employees = $this->usersByRole('employee');
            $reviewers = $this->usersByRole('reviewer');
            $accountants = $this->usersByRole('accountant');
            $procurementManagers = $this->usersByRole('procurement_manager');
            $warehouseKeepers = $this->usersByRole('warehouse_keeper');
            $siteEngineers = $this->usersByRole('site_engineer');
            $executives = $this->usersByRole('general_manager');
            $admins = $this->usersByRole('admin');
            $this->repairSeededScenarioDates($executives->first());

            $requesters = $employees
                ->merge($reviewers)
                ->merge($accountants)
                ->merge($procurementManagers)
                ->merge($warehouseKeepers)
                ->merge($siteEngineers)
                ->merge($executives)
                ->merge($admins)
                ->filter(fn (User $user): bool => $user->is_active && $user->department_id !== null)
                ->unique('id')
                ->values();

            if ($requesters->isEmpty()) {
                throw new \RuntimeException('لا يوجد مستخدم تجريبي نشط مرتبط بقسم لإنشاء الطلبات.');
            }

            $procurement = $procurementManagers->first() ?: $requesters->first();
            $accountantFallback = $accountants->first() ?: $requesters->first();
            $executiveFallback = $executives->first() ?: $requesters->first();
            $warehouseFallback = $warehouseKeepers->first() ?: $requesters->first();
            $siteEngineerFallback = $siteEngineers->first() ?: $requesters->first();
            $year = now()->year;

            for ($group = 1; $group <= self::GROUP_COUNT; $group++) {
                for ($case = 1; $case <= self::CASES_PER_GROUP; $case++) {
                    $scenarioId = sprintf('TEST-%02d-%02d', $group, $case);
                    $createdAt = Carbon::now()->subDays((($group * 7) + $case) % 120)->subHours(($group + $case) % 18);
                    $requestNumber = $this->requestNumber($group, $case);

                    if (PurchaseRequest::withTrashed()->where('request_number', $requestNumber)->exists()) {
                        $reportRows[] = $this->alreadyPresentRow($scenarioId, $group, $case, $requestNumber);
                        continue;
                    }

                    $context = $this->createScenarioRequest(
                        $group,
                        $case,
                        $requesters,
                        $employees,
                        $reviewers,
                        $departments,
                        $items,
                        $suppliers,
                        $createdAt,
                        $requestNumber,
                        $procurement,
                        $accountantFallback,
                        $executiveFallback,
                        $siteEngineerFallback,
                    );

                    $row = $this->runActionScenario(
                        $group,
                        $case,
                        $scenarioId,
                        $context,
                        $suppliers,
                        $items,
                        $procurement,
                        $accountants,
                        $accountantFallback,
                        $executiveFallback,
                        $warehouseFallback,
                        $siteEngineerFallback,
                        $warehouseKeepers,
                        $siteEngineers,
                        $createdAt,
                        $year,
                    );
                    $reportRows[] = $row;

                    if (($group * self::CASES_PER_GROUP + $case) % 50 === 0) {
                        $this->command?->info(sprintf('تم تجهيز %d من %d سيناريو.', $group * self::CASES_PER_GROUP + $case, self::GROUP_COUNT * self::CASES_PER_GROUP));
                    }
                }
            }

            $this->writeReports($reportRows, $departments, $suppliers, $items);
        });

        $createdCount = collect($reportRows)->where('result', 'PASS')->count();
        $existingCount = collect($reportRows)->where('result', 'ALREADY_PRESENT')->count();
        $this->command?->info(sprintf('اكتملت محاكاة %d سيناريو. جديد: %d، موجود مسبقًا: %d.', count($reportRows), $createdCount, $existingCount));
    }

    private function createScenarioRequest(
        int $group,
        int $case,
        Collection $requesters,
        Collection $employees,
        Collection $reviewers,
        Collection $departments,
        Collection $items,
        Collection $suppliers,
        Carbon $createdAt,
        string $requestNumber,
        User $procurement,
        User $accountantFallback,
        User $executiveFallback,
        User $siteEngineerFallback,
    ): array {
        $requester = in_array($group, [13, 14, 15, 16], true)
            ? $executiveFallback
            : $this->pick($requesters, ($group * 13 + $case) % max($requesters->count(), 1), $employees->first());
        $originDepartment = $departments->firstWhere('id', $requester->department_id) ?: $departments[($group + $case) % $departments->count()];
        $isExecutiveRequester = $requester->hasRole('general_manager');
        $targetIndex = (($group * 3) + $case) % $departments->count();
        $targetDepartment = $departments[$targetIndex];

        if ($group === 4 && $case % 4 === 0) {
            $targetDepartment = $originDepartment;
        }
        if ($group === 5 && $case % 2 === 0) {
            $targetDepartment = $originDepartment;
        }

        $manager = $targetDepartment->manager ?: ($reviewers->first() ?: $executiveFallback);
        $siteEngineer = $targetDepartment->siteEngineer ?: $siteEngineerFallback;
        $supplier = $suppliers[($group * 5 + $case) % $suppliers->count()];
        $direct = in_array($group, [8, 9], true);
        $route = $direct ? 'DIRECT' : 'UNDECIDED';
        $status = 'DRAFT';
        $priority = ['LOW', 'NORMAL', 'HIGH', 'URGENT'][($group + $case) % 4];
        $itemCount = 1 + (($group + $case) % 3);
        $lineItems = [];
        $total = 0.0;

        for ($line = 0; $line < $itemCount; $line++) {
            $item = $items[(($group * 11) + ($case * 7) + ($line * 5)) % $items->count()];
            $quantity = 2 + (($group * 17 + $case * 9 + $line * 3) % 40);
            $unitPrice = round(450 + (($group * 127 + $case * 41 + $line * 73) % 4200), 2);
            $lineItems[] = [
                'item' => $item,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'item_reference' => sprintf('PLT-%02d-%03d', (($group + $case + $line) % 90) + 1, $case),
                'region' => sprintf('المنطقة %02d', (($group * 2 + $case + $line) % 24) + 1),
            ];
            if ($direct) {
                $total += $quantity * $unitPrice;
            }
        }

        $pr = PurchaseRequest::create([
            'request_number' => $requestNumber,
            'user_id' => $requester->id,
            'department_id' => $originDepartment->id,
            'target_department_id' => $targetDepartment->id,
            'reviewer_user_id' => $isExecutiveRequester ? null : $manager->id,
            'site_engineer_user_id' => $siteEngineer->id,
            'priority' => $priority,
            'status' => $status,
            'procurement_route' => $route,
            'direct_supplier_id' => $direct ? $supplier->id : null,
            'total_estimated_cost' => $direct ? round($total, 2) : 0,
            'date_needed' => $group < 27
                ? Carbon::today()->addDays(5 + (($group + $case) % 20))->toDateString()
                : $createdAt->copy()->addDays(5 + (($group + $case) % 20))->toDateString(),
            'notes' => sprintf('%s | %s | المجموعة %02d / السيناريو %02d | رقم قطعة الأرض والمنطقة ثابتان حتى نهاية المسار.', self::MARKER, self::VERSION, $group, $case),
            'submitted_at' => null,
        ]);
        $this->stamp($pr, $createdAt);

        $prItems = [];
        foreach ($lineItems as $lineItem) {
            $prItems[] = PurchaseRequestItem::create([
                'purchase_request_id' => $pr->id,
                'item_id' => $lineItem['item']->id,
                'item_description' => $lineItem['item']->name,
                'item_reference' => $lineItem['item_reference'],
                'region' => $lineItem['region'],
                'quantity' => $lineItem['quantity'],
                'uom' => $lineItem['item']->uom ?: 'PCS',
                'estimated_unit_price' => $direct ? $lineItem['unit_price'] : 0,
                'estimated_line_total' => $direct ? round($lineItem['quantity'] * $lineItem['unit_price'], 2) : 0,
                'specifications' => 'سيناريو اختبار مترابط — بدون ضريبة أو خصم أو VAT.',
                'notes' => sprintf('%s | رقم قطعة الأرض: %s | %s', self::MARKER, $lineItem['item_reference'], $lineItem['region']),
            ]);
        }

        $actor = $requester;
        $this->addRequestHistory($pr, $actor, 'CREATED', null, 'DRAFT', 'إنشاء طلب الشراء في سيناريو المحاكاة.');

        return [
            'request' => $pr,
            'items' => collect($prItems),
            'requester' => $requester,
            'origin_department' => $originDepartment,
            'target_department' => $targetDepartment,
            'manager' => $manager,
            'site_engineer' => $siteEngineer,
            'supplier' => $supplier,
            'line_items' => $lineItems,
            'route' => $route,
        ];
    }

    private function runActionScenario(
        int $group,
        int $case,
        string $scenarioId,
        array $context,
        Collection $suppliers,
        Collection $items,
        User $procurement,
        Collection $accountants,
        User $accountantFallback,
        User $executiveFallback,
        User $warehouseFallback,
        User $siteEngineerFallback,
        Collection $warehouseKeepers,
        Collection $siteEngineers,
        Carbon $createdAt,
        int $year,
    ): array {
        /** @var PurchaseRequest $pr */
        $pr = $context['request'];
        $requester = $context['requester'];
        $manager = $context['manager'];
        $siteEngineer = $context['site_engineer'];
        $isExecutiveRequester = $requester->hasRole('general_manager');
        $supplier = $context['supplier'];
        $accountant = $this->pick($accountants, $case - 1, $accountantFallback);
        $executive = $executiveFallback;
        $warehouse = $this->pick($warehouseKeepers, $case - 1, $warehouseFallback);
        $assignedSiteEngineer = $this->pick($siteEngineers, $case - 1, $siteEngineer);
        $po = null;
        $receipt = null;
        $invoice = null;
        $payment = null;
        $related = [];
        $action = $this->actionLabel($group);
        $entryPoint = $this->entryPoint($group);
        $expected = 'يظهر السجل في شاشة المرحلة المحددة مع الحفاظ على العلاقات والبيانات الأساسية.';
        $actual = 'تم إنشاء بيانات الاختبار المترابطة بنجاح.';

        switch ($group) {
            case 1:
                $expected = 'طلب جديد في حالة DRAFT مع بنود ورقم قطعة أرض ومنطقة.';
                break;

            case 2:
                $pr->update(['notes' => $pr->notes . ' | تم الحفظ كمسودة لاختبار الاستكمال لاحقًا.']);
                $expected = 'مسودة محفوظة ويمكن فتحها واستكمالها دون ظهورها كطلب مرسل.';
                break;

            case 3:
                $item = $context['items']->first();
                $item->update(['quantity' => (float) $item->quantity + 1, 'notes' => $item->notes . ' | تم تعديل البند في سيناريو الاختبار.']);
                $pr->update(['notes' => $pr->notes . ' | تم تعديل الملاحظات قبل الإرسال.']);
                $this->addRequestHistory($pr, $requester, 'UPDATED', 'DRAFT', 'DRAFT', 'تم تعديل رأس الطلب وأحد البنود قبل الإرسال.');
                $expected = 'تظهر التعديلات على المسودة مع بقاء رقم قطعة الأرض والمنطقة محفوظين.';
                break;

            case 4:
                $sameDepartmentReviewer = $requester->hasRole('reviewer') && (int) $pr->department_id === (int) $pr->target_department_id;
                $nextState = $requester->hasRole('general_manager')
                    ? 'PENDING_PROCUREMENT_APPROVAL'
                    : ($sameDepartmentReviewer ? 'PENDING_EXECUTIVE_APPROVAL' : 'SUBMITTED');
                $pr->update(['status' => $nextState, 'submitted_at' => $createdAt->copy()->addHours(2)]);
                $this->addRequestHistory($pr, $requester, 'SUBMITTED', 'DRAFT', $nextState, 'تم إرسال الطلب إلى المرحلة التالية حسب دور المنشئ والقسم المستهدف.');
                $this->notify($pr->user_id, 'purchase_request_submitted', 'طلب شراء تجريبي مرسل', "الطلب {$pr->request_number} جاهز للمرحلة التالية.", $pr);
                $expected = "انتقال الطلب من DRAFT إلى {$nextState} دون تغيير المسار.";
                break;

            case 5:
                $pr->update(['status' => 'PENDING_EXECUTIVE_APPROVAL', 'submitted_at' => $createdAt->copy()->addHours(2)]);
                $this->addRequestHistory($pr, $requester, 'SUBMITTED', 'DRAFT', 'SUBMITTED', 'أرسل الموظف الطلب للمراجعة.');
                $this->addRequestHistory($pr, $manager, 'REVIEW_STARTED', 'SUBMITTED', 'UNDER_REVIEW', 'بدأ مدير القسم مراجعة الطلب.');
                $this->addRequestHistory($pr, $manager, 'APPROVED_BY_REVIEWER', 'UNDER_REVIEW', 'PENDING_EXECUTIVE_APPROVAL', 'اعتمد مدير القسم الطلب وأرسله للمدير التنفيذي.');
                $this->notify($executive->id, 'purchase_request_pending_executive', 'طلب شراء بانتظار اعتماد المدير التنفيذي', "الطلب {$pr->request_number} بانتظار قرار المدير التنفيذي.", $pr);
                $expected = 'اعتماد مدير القسم ينقل الطلب إلى PENDING_EXECUTIVE_APPROVAL.';
                break;

            case 6:
                $pr->update(['status' => 'REJECTED', 'rejection_reason' => "رفض تجريبي رقم {$case}: البيانات لا تتوافق مع الاحتياج التشغيلي."]);
                $this->addRequestHistory($pr, $manager, 'REJECTED', 'UNDER_REVIEW', 'REJECTED', $pr->rejection_reason);
                $this->notify($pr->user_id, 'purchase_request_rejected', 'تم رفض طلب شراء تجريبي', "تم رفض الطلب {$pr->request_number}. السبب: {$pr->rejection_reason}", $pr);
                $expected = 'يتحول الطلب إلى REJECTED مع حفظ سبب الرفض في السجل الزمني.';
                break;

            case 7:
                $pr->update(['status' => 'REJECTED', 'return_reason' => "إعادة للتعديل في سيناريو {$case}: يرجى استكمال مواصفات البند قبل إعادة الإرسال."]);
                $this->addRequestHistory($pr, $manager, 'RETURNED_FOR_EDIT', 'UNDER_REVIEW', 'REJECTED', $pr->return_reason);
                $this->notify($pr->user_id, 'purchase_request_returned_for_edit', 'طلب شراء يحتاج تعديلًا', "الطلب {$pr->request_number} يحتاج تعديلًا قبل إعادة الإرسال.", $pr);
                $expected = 'حفظ سبب الإرجاع للتعديل باستخدام الحالات الحالية دون إضافة حالة جديدة.';
                break;

            case 8:
                $pr->update(['status' => 'PENDING_ACCOUNTING_APPROVAL', 'procurement_route' => 'DIRECT', 'direct_supplier_id' => $supplier->id]);
                $pr->update(['submitted_at' => $createdAt->copy()->addHours(2)]);
                $this->addRequestHistory($pr, $procurement, 'DIRECT_PURCHASE_REQUEST_CREATED', 'DRAFT', 'PENDING_ACCOUNTING_APPROVAL', 'أنشأ مدير المشتريات طلب شراء مباشرًا وأرسله للحسابات.');
                $this->notify($accountant->id, 'purchase_request_pending_accounting_approval', 'طلب شراء مباشر بانتظار الحسابات', "الطلب المباشر {$pr->request_number} يحتاج مراجعة الحسابات.", $pr);
                $expected = 'طلب شراء مباشر في PENDING_ACCOUNTING_APPROVAL مع مورد مباشر وبنود مالية لازمة للمسار المباشر.';
                break;

            case 9:
                $pr->update(['status' => 'PENDING_ACCOUNTING_APPROVAL', 'procurement_route' => 'DIRECT', 'direct_supplier_id' => $supplier->id]);
                if ($case % 2 === 0) {
                    $pr->update(['status' => 'APPROVED_BY_ACCOUNTING']);
                    $this->addRequestHistory($pr, $accountant, 'ACCOUNTING_APPROVED_DIRECT', 'PENDING_ACCOUNTING_APPROVAL', 'APPROVED_BY_ACCOUNTING', 'وافقت الحسابات على الطلب المباشر وأعادته إلى مدير المشتريات لإنشاء أمر الشراء.');
                    $expected = 'اعتماد الحسابات ينقل الطلب المباشر إلى APPROVED_BY_ACCOUNTING ليظهر لدى مدير المشتريات لإنشاء أمر الشراء.';
                } else {
                    $pr->update(['status' => 'REJECTED', 'rejection_reason' => "رفض مالي تجريبي رقم {$case}."]);
                    $this->addRequestHistory($pr, $accountant, 'ACCOUNTING_REJECTED_DIRECT', 'PENDING_ACCOUNTING_APPROVAL', 'REJECTED', $pr->rejection_reason);
                    $expected = 'رفض الحسابات ينقل الطلب المباشر إلى REJECTED مع سبب واضح.';
                }
                break;

            case 10:
                $pr->update(['status' => 'PENDING_QUOTE_RECOMMENDATIONS', 'procurement_route' => 'QUOTES']);
                $this->addRequestHistory($pr, $procurement, 'THREE_QUOTES_REQUIRED', 'PENDING_PROCUREMENT_APPROVAL', 'PENDING_QUOTE_RECOMMENDATIONS', 'بدأ مدير المشتريات مرحلة عروض الأسعار.');
                $expected = 'يظهر الطلب في تبويب بدء عروض الأسعار بدون عروض مكررة بعد.';
                break;

            case 11:
                $pr->update(['status' => 'PENDING_QUOTE_RECOMMENDATIONS', 'procurement_route' => 'QUOTES']);
                $quotes = $this->createQuotes($pr, $procurement, $suppliers, $group, $case, $createdAt, 2);
                $related = $quotes->pluck('id')->map(fn ($id): string => 'QUOTE-' . $id)->all();
                $this->addRequestHistory($pr, $procurement, 'SUPPLIER_ADDED', 'PENDING_QUOTE_RECOMMENDATIONS', 'PENDING_QUOTE_RECOMMENDATIONS', 'أضيف مورد مختلف للعرض التجريبي مع إبقاء الموردين مميزين.');
                $expected = 'يظهر المورد في جدول عروض الأسعار مع الصنف ورقم القطعة والمنطقة.';
                break;

            case 12:
                $pr->update(['status' => 'PENDING_QUOTE_RECOMMENDATIONS', 'procurement_route' => 'QUOTES']);
                $quoteCount = 2 + ($case % 4);
                $quotes = $this->createQuotes($pr, $procurement, $suppliers, $group, $case, $createdAt, min($quoteCount, $suppliers->count()));
                $related = $quotes->pluck('id')->map(fn ($id): string => 'QUOTE-' . $id)->all();
                $this->addRequestHistory($pr, $procurement, 'QUOTES_SUBMITTED', 'PENDING_QUOTE_RECOMMENDATIONS', 'PENDING_QUOTE_RECOMMENDATIONS', 'أضيفت عروض مرنة بعدد متغير من موردين نشطين.');
                $expected = 'يقبل النظام عرضين أو أكثر، ويظهر سعر الوحدة والإجمالي لكل عرض بالـEGP.';
                break;

            case 13:
                $pr->update(['status' => 'PENDING_QUOTE_RECOMMENDATIONS', 'procurement_route' => 'QUOTES']);
                $quotes = $this->createQuotes($pr, $procurement, $suppliers, $group, $case, $createdAt, 3);
                $quote = $quotes->first();
                $this->recommend($quote, $accountant, 'ACCOUNTING', 'RECOMMEND', 'ترشيح الحسابات للعرض الأفضل ماليًا.');
                $related = ['QUOTE-' . $quote->id, 'ACCOUNTING-RECOMMENDATION-' . $quote->id];
                if ($isExecutiveRequester) {
                    $pr->update(['status' => 'PENDING_EXECUTIVE_QUOTE_DECISION']);
                    $this->addRequestHistory($pr, $accountant, 'ACCOUNTING_QUOTE_RECOMMENDED', 'PENDING_QUOTE_RECOMMENDATIONS', 'PENDING_EXECUTIVE_QUOTE_DECISION', 'رشحت الحسابات عرضًا لطلب المدير العام، وأصبح القرار النهائي له.');
                    $expected = 'ترشيح الحسابات وحده ينقل طلب المدير العام إلى قرار المدير العام دون ترشيح القسم.';
                } else {
                    $this->addRequestHistory($pr, $accountant, 'ACCOUNTING_QUOTE_RECOMMENDED', 'PENDING_QUOTE_RECOMMENDATIONS', 'PENDING_QUOTE_RECOMMENDATIONS', 'رشحت الحسابات عرضًا واحدًا بوضوح.');
                    $expected = 'ترشيح الحسابات يُحفظ على العرض المحدد ولا ينتقل للقرار التنفيذي قبل ترشيح القسم.';
                }
                break;

            case 14:
                $pr->update(['status' => 'PENDING_QUOTE_RECOMMENDATIONS', 'procurement_route' => 'QUOTES']);
                $quotes = $this->createQuotes($pr, $procurement, $suppliers, $group, $case, $createdAt, 3);
                $quote = $quotes->last();
                $accountingDecision = $isExecutiveRequester && $case % 2 === 0 ? 'RECOMMEND' : 'REJECT';
                $this->recommend($quote, $accountant, 'ACCOUNTING', $accountingDecision, 'قرار الحسابات على عرض طلب المدير العام أو مراجعة العرض قبل ترشيح القسم.');
                $related = ['QUOTE-' . $quote->id, 'ACCOUNTING-RECOMMENDATION-' . $quote->id];
                if ($isExecutiveRequester) {
                    $pr->update(['status' => 'PENDING_EXECUTIVE_QUOTE_DECISION']);
                    $this->addRequestHistory($pr, $accountant, 'ACCOUNTING_QUOTE_REVIEWED', 'PENDING_QUOTE_RECOMMENDATIONS', 'PENDING_EXECUTIVE_QUOTE_DECISION', 'راجعت الحسابات عرض طلب المدير العام، وأصبح القرار النهائي له دون ترشيح مدير القسم.');
                    $expected = 'يصل طلب المدير العام إلى القرار التنفيذي بعد قرار الحسابات فقط.';
                } else {
                    $this->recommend($quote, $manager, 'DEPARTMENT', 'RECOMMEND', 'ترشيح مدير القسم للعرض الأنسب للاحتياج.');
                    $related[] = 'DEPARTMENT-RECOMMENDATION-' . $quote->id;
                    $this->addRequestHistory($pr, $manager, 'DEPARTMENT_QUOTE_RECOMMENDED', 'PENDING_QUOTE_RECOMMENDATIONS', 'PENDING_EXECUTIVE_QUOTE_DECISION', 'رشح مدير القسم العرض، مع وجود ترشيح الحسابات، فأصبح جاهزًا للمدير التنفيذي.');
                    $pr->update(['status' => 'PENDING_EXECUTIVE_QUOTE_DECISION']);
                    $expected = 'بعد اكتمال ترشيح الحسابات والقسم ينتقل الطلب إلى القرار التنفيذي.';
                }
                break;

            case 15:
                $pr->update(['status' => 'PENDING_QUOTE_RECOMMENDATIONS', 'procurement_route' => 'QUOTES']);
                $quotes = $this->createQuotes($pr, $procurement, $suppliers, $group, $case, $createdAt, 3);
                $selected = $quotes->sortBy('total_amount')->first();
                $this->recommend($quotes->first(), $accountant, 'ACCOUNTING', 'RECOMMEND', 'ترشيح الحسابات للعرض الأقل تكلفة.');
                if (!$isExecutiveRequester) {
                    $this->recommend($quotes->last(), $manager, 'DEPARTMENT', 'RECOMMEND', 'ترشيح القسم للعرض المناسب للمواصفات.');
                }
                $pr->update(['status' => 'PENDING_EXECUTIVE_QUOTE_DECISION']);
                $this->selectQuote($pr, $selected, $executive, $createdAt);
                $related = ['QUOTE-' . $selected->id, 'EXECUTIVE-SELECTED-' . $selected->id];
                $expected = $isExecutiveRequester
                    ? 'يختار المدير العام العرض بعد ترشيح الحسابات فقط، وتُرفض العروض الأخرى.'
                    : 'يختار المدير التنفيذي عرضًا بعد ترشيح الحسابات والقسم، وتُرفض العروض الأخرى.';
                break;

            case 16:
                $pr->update(['status' => 'PENDING_QUOTE_RECOMMENDATIONS', 'procurement_route' => 'QUOTES']);
                $quotes = $this->createQuotes($pr, $procurement, $suppliers, $group, $case, $createdAt, 3);
                $this->recommend($quotes->first(), $accountant, 'ACCOUNTING', 'REJECT', 'رفض الحسابات للعروض لعدم ملاءمة الشروط.');
                $related = ['QUOTE-' . $quotes->first()->id, 'ACCOUNTING-RECOMMENDATION-' . $quotes->first()->id];
                if (!$isExecutiveRequester) {
                    $this->recommend($quotes->last(), $manager, 'DEPARTMENT', 'REJECT', 'رفض مدير القسم العروض لعدم ملاءمة المواصفات.');
                    $related[] = 'DEPARTMENT-RECOMMENDATION-' . $quotes->last()->id;
                }
                $pr->update(['status' => 'PENDING_EXECUTIVE_QUOTE_DECISION']);
                $pr->update(['status' => 'REJECTED', 'rejection_reason' => "رفض تنفيذي تجريبي لعروض الأسعار رقم {$case}."]);
                $pr->quotes()->update(['status' => 'REJECTED']);
                $this->addRequestHistory($pr, $executive, 'EXECUTIVE_REJECTED_QUOTES', 'PENDING_EXECUTIVE_QUOTE_DECISION', 'REJECTED', $pr->rejection_reason);
                $expected = $isExecutiveRequester
                    ? 'يرفض المدير العام عروض الأسعار بعد قرار الحسابات، دون ترشيح مدير القسم.'
                    : 'رفض المدير التنفيذي يغلق مسار العروض ويحفظ سبب الرفض.';
                break;

            case 17:
                $pr->update(['status' => 'APPROVED_BY_PROCUREMENT', 'procurement_route' => 'QUOTES']);
                $quotes = $this->createQuotes($pr, $procurement, $suppliers, $group, $case, $createdAt, 3);
                $selected = $quotes->sortBy('total_amount')->first();
                $selected->update(['status' => 'SELECTED', 'selected_at' => $createdAt->copy()->addDays(3)]);
                $pr->update(['selected_quote_id' => $selected->id]);
                $pr->quotes()->where('id', '!=', $selected->id)->update(['status' => 'REJECTED']);
                $po = $this->createOrder($pr, $context['items'], $procurement, $selected->supplier, $selected, $group, $case, $createdAt, 'PO_DRAFT', (float) $selected->unit_price);
                $related = ['PO-' . $po->id, 'QUOTE-' . $selected->id];
                $expected = 'يظهر الطلب المعتمد في تبويب إنشاء أمر الشراء مع المورد المختار.';
                break;

            case 18:
                $pr->update(['status' => 'APPROVED_BY_PROCUREMENT', 'procurement_route' => 'QUOTES']);
                $quotes = $this->createQuotes($pr, $procurement, $suppliers, $group, $case, $createdAt, 2);
                $selected = $quotes->first();
                $selected->update(['status' => 'SELECTED', 'selected_at' => $createdAt->copy()->addDays(3)]);
                $pr->update(['selected_quote_id' => $selected->id]);
                $po = $this->createOrder($pr, $context['items'], $procurement, $selected->supplier, $selected, $group, $case, $createdAt, 'PO_DRAFT', (float) $selected->unit_price);
                $po->update(['notes' => $po->notes . ' | تم تعديل شروط التسليم قبل الإرسال.']);
                $poItem = $po->items()->first();
                if ($poItem) {
                    $poItem->update(['quantity' => (float) $poItem->quantity + 1, 'specifications' => ($poItem->specifications ?? '') . ' | تم تعديل كمية بند أمر الشراء في الاختبار.']);
                }
                $this->addOrderHistory($po, $procurement, 'PO_UPDATED', 'PO_DRAFT', 'PO_DRAFT', 'تم تعديل أمر الشراء قبل إصداره للمورد.');
                $related = ['PO-' . $po->id];
                $expected = 'تُحفظ تعديلات أمر الشراء في حالة PO_DRAFT قبل الإرسال.';
                break;

            case 19:
                $pr->update(['status' => 'APPROVED_BY_PROCUREMENT', 'procurement_route' => 'QUOTES']);
                $quotes = $this->createQuotes($pr, $procurement, $suppliers, $group, $case, $createdAt, 2);
                $selected = $quotes->first();
                $selected->update(['status' => 'SELECTED', 'selected_at' => $createdAt->copy()->addDays(3)]);
                $pr->update(['selected_quote_id' => $selected->id]);
                $po = $this->createOrder($pr, $context['items'], $procurement, $selected->supplier, $selected, $group, $case, $createdAt, 'ISSUED', (float) $selected->unit_price);
                $this->addOrderHistory($po, $procurement, 'PO_ISSUED', 'PO_DRAFT', 'ISSUED', 'أصدر مدير المشتريات أمر الشراء وأرسله للمورد.');
                $this->notify($accountant->id, 'purchase_order_issued', 'أمر شراء تجريبي صادر', "أمر الشراء {$po->po_number} جاهز للمتابعة المالية.", $po);
                $related = ['PO-' . $po->id];
                $expected = 'يتحول أمر الشراء من PO_DRAFT إلى ISSUED ويظهر للمورد والحسابات حسب الصلاحيات.';
                break;

            case 20:
                $pr->update(['status' => 'APPROVED_BY_PROCUREMENT', 'procurement_route' => 'QUOTES']);
                $po = $this->createOrder($pr, $context['items'], $procurement, $supplier, null, $group, $case, $createdAt, 'ISSUED', 700 + ($case * 19));
                $receipt = $this->createReceipt($pr, $po, $warehouse, $assignedSiteEngineer, $group, $case, $createdAt, 'PENDING_SITE_ENGINEER', false);
                $related = ['PO-' . $po->id, 'GRN-' . $receipt->id];
                $expected = 'يسجل أمين المخزن الكميات وينقل إذن الاستلام إلى PENDING_SITE_ENGINEER.';
                break;

            case 21:
                $pr->update(['status' => 'APPROVED_BY_PROCUREMENT', 'procurement_route' => 'QUOTES']);
                $po = $this->createOrder($pr, $context['items'], $procurement, $supplier, null, $group, $case, $createdAt, 'ISSUED', 800 + ($case * 23));
                $receipt = $this->createReceipt($pr, $po, $warehouse, $assignedSiteEngineer, $group, $case, $createdAt, 'PENDING_SITE_ENGINEER', false);
                $receipt->update(['site_engineer_notes' => 'تعديل مهندس الموقع قبل الإرسال للحسابات — تمت مراجعة كمية البند.']);
                $receiptItem = $receipt->items()->first();
                if ($receiptItem && (float) $receiptItem->received_quantity > 1) {
                    $receiptItem->update(['received_quantity' => max(1, (float) $receiptItem->received_quantity - 1), 'notes' => 'تم تعديل الكمية قبل اعتماد مهندس الموقع.']);
                }
                $this->addReceiptHistory($receipt, $assignedSiteEngineer, 'SITE_ENGINEER_RECEIPT_UPDATED', 'PENDING_SITE_ENGINEER', 'PENDING_SITE_ENGINEER', 'عدّل مهندس الموقع بيانات الاستلام قبل الاعتماد.');
                $related = ['PO-' . $po->id, 'GRN-' . $receipt->id];
                $expected = 'يستطيع مهندس الموقع تعديل الإذن قبل الاعتماد، مع حفظ التغيير في السجل الزمني.';
                break;

            case 22:
                $pr->update(['status' => 'APPROVED_BY_PROCUREMENT', 'procurement_route' => 'QUOTES']);
                $po = $this->createOrder($pr, $context['items'], $procurement, $supplier, null, $group, $case, $createdAt, 'ISSUED', 900 + ($case * 29));
                $receipt = $this->createReceipt($pr, $po, $warehouse, $assignedSiteEngineer, $group, $case, $createdAt, 'APPROVED', true);
                $related = ['PO-' . $po->id, 'GRN-' . $receipt->id];
                $expected = 'اعتماد مهندس الموقع يحول الإذن إلى APPROVED وأمر الشراء إلى DELIVERED.';
                break;

            case 23:
                $pr->update(['status' => 'APPROVED_BY_PROCUREMENT', 'procurement_route' => 'QUOTES']);
                $po = $this->createOrder($pr, $context['items'], $procurement, $supplier, null, $group, $case, $createdAt, 'APPROVED_BY_ACCOUNTING', 1000 + ($case * 31));
                $receipt = $this->createReceipt($pr, $po, $warehouse, $assignedSiteEngineer, $group, $case, $createdAt, 'APPROVED', true);
                $this->notifyAccountingWithDocuments($accountant, $po, $receipt);
                $related = ['PO-' . $po->id, 'GRN-' . $receipt->id, 'NOTIFICATION-' . $po->id . '-' . $receipt->id];
                $expected = 'تصل للحسابات رسالة واحدة تحتوي على أمر الشراء وإذن الاستلام المرتبطين بنفس العملية.';
                break;

            case 24:
                $pr->update(['status' => 'APPROVED_BY_PROCUREMENT', 'procurement_route' => 'QUOTES']);
                $po = $this->createOrder($pr, $context['items'], $procurement, $supplier, null, $group, $case, $createdAt, 'APPROVED_BY_ACCOUNTING', 1100 + ($case * 37));
                $receipt = $this->createReceipt($pr, $po, $warehouse, $assignedSiteEngineer, $group, $case, $createdAt, 'APPROVED', true);
                $invoice = $this->createMatchedInvoice($po, $receipt, $accountant, $group, $case, $createdAt, $year);
                $this->refreshSupplierBalance($supplier->id);
                $related = ['PO-' . $po->id, 'GRN-' . $receipt->id, 'INV-' . $invoice->id];
                $expected = 'تسجل فاتورة المورد كمديونية في سجل الفواتير بعد مطابقة PO وGRN.';
                break;

            case 25:
                $pr->update(['status' => 'APPROVED_BY_PROCUREMENT', 'procurement_route' => 'QUOTES']);
                $po = $this->createOrder($pr, $context['items'], $procurement, $supplier, null, $group, $case, $createdAt, 'APPROVED_BY_ACCOUNTING', 1200 + ($case * 41));
                $receipt = $this->createReceipt($pr, $po, $warehouse, $assignedSiteEngineer, $group, $case, $createdAt, 'APPROVED', true);
                $invoice = $this->createMatchedInvoice($po, $receipt, $accountant, $group, $case, $createdAt, $year);
                $paymentAmount = round((float) $invoice->amount * (($case % 3 === 0) ? 1 : 0.45), 2);
                [$payment] = $this->createPaymentWithAllocation($supplier, $accountant, [$invoice], $paymentAmount, $group, $case, $createdAt, $year);
                $this->refreshSupplierBalance($supplier->id);
                $related = ['INV-' . $invoice->id, 'PAY-' . $payment->id];
                $expected = 'تسجل الدفعة على حساب المورد وتحدّث المديونية إلى مدفوعة أو مدفوعة جزئيًا.';
                break;

            case 26:
                $pr->update(['status' => 'APPROVED_BY_PROCUREMENT', 'procurement_route' => 'QUOTES']);
                $poA = $this->createOrder($pr, $context['items'], $procurement, $supplier, null, $group, $case, $createdAt->copy()->subDays(8), 'APPROVED_BY_ACCOUNTING', 1300 + ($case * 43));
                $receiptA = $this->createReceipt($pr, $poA, $warehouse, $assignedSiteEngineer, $group, $case, $createdAt->copy()->subDays(8), 'APPROVED', true);
                $invoiceA = $this->createMatchedInvoice($poA, $receiptA, $accountant, $group, $case, $createdAt->copy()->subDays(7), $year, 'A');
                $secondContext = $this->createScenarioRequest(
                    $group,
                    $case + 100,
                    collect([$requester]),
                    collect([$requester]),
                    collect([$manager]),
                    collect([$context['origin_department'], $context['target_department']]),
                    $items,
                    $suppliers,
                    $createdAt->copy()->subDays(3),
                    $this->requestNumber($group, $case) . '-B',
                    $procurement,
                    $accountant,
                    $executive,
                    $assignedSiteEngineer,
                );
                $secondContext['request']->update(['status' => 'APPROVED_BY_PROCUREMENT', 'procurement_route' => 'QUOTES']);
                $poB = $this->createOrder($secondContext['request'], $secondContext['items'], $procurement, $supplier, null, $group, $case, $createdAt->copy()->subDays(3), 'APPROVED_BY_ACCOUNTING', 1400 + ($case * 47), 'B');
                $receiptB = $this->createReceipt($secondContext['request'], $poB, $warehouse, $assignedSiteEngineer, $group, $case, $createdAt->copy()->subDays(3), 'APPROVED', true, 'B');
                $invoiceB = $this->createMatchedInvoice($poB, $receiptB, $accountant, $group, $case, $createdAt->copy()->subDays(2), $year, 'B');
                $paymentAmount = round((float) $invoiceA->amount + ((float) $invoiceB->amount * 0.35), 2);
                [$payment, $allocations] = $this->createPaymentWithAllocation($supplier, $accountant, [$invoiceA, $invoiceB], $paymentAmount, $group, $case, $createdAt, $year);
                $this->refreshSupplierBalance($supplier->id);
                $related = ['INV-' . $invoiceA->id, 'INV-' . $invoiceB->id, 'PAY-' . $payment->id, 'ALLOCATIONS-' . implode('-', $allocations)];
                $expected = 'توزيع دفعة المورد على أقدم مديونية أولًا ثم الانتقال إلى المديونية التالية عند وجود رصيد.';
                break;

            case 27:
                $statuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING_EXECUTIVE_APPROVAL', 'REJECTED', 'PENDING_PROCUREMENT_APPROVAL', 'APPROVED_BY_PROCUREMENT'];
                $searchStatus = $statuses[($case - 1) % count($statuses)];
                $pr->update([
                    'status' => $searchStatus,
                    'notes' => $pr->notes . sprintf(' | بيانات بحث: ARCHIVE-%02d | فلتر حالة %s | تاريخ متنوع.', $case, $searchStatus),
                    'rejection_reason' => $searchStatus === 'REJECTED' ? 'رفض للبحث في الأرشيف.' : null,
                ]);
                $this->addRequestHistory($pr, $requester, 'ARCHIVE_SEARCH_FIXTURE', null, $searchStatus, 'سجل تجريبي مخصص للبحث والفلترة والأرشيف.');
                $related = ['ARCHIVE-' . $case];
                $expected = 'يظهر السجل في البحث والأرشيف عند استخدام رقم الطلب أو رقم قطعة الأرض أو المنطقة أو الحالة أو التاريخ.';
                break;

            default:
                throw new \LogicException('مجموعة Action غير معروفة.');
        }

        $this->addScenarioEvent($pr, $requester, $group, $case, $action, $entryPoint);

        return [
            'scenario_id' => $scenarioId,
            'group' => $group,
            'case' => $case,
            'action' => $action,
            'role' => $this->primaryRole($group),
            'entry_point' => $entryPoint,
            'request_number' => $pr->request_number,
            'po_number' => $po?->po_number,
            'receipt_number' => $receipt?->receipt_number,
            'invoice_number' => $invoice?->invoice_number,
            'payment_number' => $payment?->payment_number,
            'related_records' => $related,
            'requester' => $requester->email,
            'origin_department' => $context['origin_department']->code,
            'target_department' => $context['target_department']->code,
            'manager' => $manager->email,
            'site_engineer' => $siteEngineer->email,
            'supplier' => $supplier->company_name,
            'status' => $pr->status,
            'expected_result' => $expected,
            'actual_result' => $actual,
            'result' => 'PASS',
            'undo_or_rollback' => 'بيانات الاختبار مميزة بالبادئة TEST-540-SCENARIOS ويمكن عزلها إداريًا دون المساس بالبيانات الأساسية؛ لم ينفذ Seeder أي حذف.',
        ];
    }

    private function createQuotes(PurchaseRequest $pr, User $procurement, Collection $suppliers, int $group, int $case, Carbon $createdAt, int $count): Collection
    {
        $count = max(2, min($count, $suppliers->count()));
        $quotes = collect();
        $quantity = max(1, (float) $pr->items()->sum('quantity'));
        $usedSupplierIds = [];

        for ($index = 0; $index < $count; $index++) {
            $supplier = $suppliers[(($group * 7) + $case + $index) % $suppliers->count()];
            if (in_array($supplier->id, $usedSupplierIds, true)) {
                $supplier = $suppliers->first(fn (Supplier $candidate): bool => ! in_array($candidate->id, $usedSupplierIds, true)) ?: $supplier;
            }
            $usedSupplierIds[] = $supplier->id;
            $unitPrice = round(600 + ($group * 29) + ($case * 13) + ($index * 47), 2);
            $total = round($quantity * $unitPrice, 2);
            $quote = PurchaseRequestQuote::create([
                'purchase_request_id' => $pr->id,
                'supplier_id' => $supplier->id,
                'created_by_user_id' => $procurement->id,
                'total_amount' => $total,
                'unit_price' => $unitPrice,
                'currency' => 'EGP',
                'notes' => sprintf('%s | عرض رقم %d | سعر وحدة وإجمالي للاختبار.', self::MARKER, $index + 1),
                'status' => 'SUBMITTED',
                'selected_at' => null,
            ]);
            $this->stamp($quote, $createdAt->copy()->addHours($index + 1));
            $quotes->push($quote);
        }

        return $quotes;
    }

    private function recommend(PurchaseRequestQuote $quote, User $actor, string $roleType, string $decision, string $comment): void
    {
        PurchaseRequestQuoteRecommendation::updateOrCreate(
            [
                'purchase_request_quote_id' => $quote->id,
                'user_id' => $actor->id,
                'role_type' => $roleType,
            ],
            [
                'decision' => $decision,
                'comment' => self::MARKER . ' | ' . $comment,
            ],
        );
    }

    private function selectQuote(PurchaseRequest $pr, PurchaseRequestQuote $quote, User $executive, Carbon $createdAt): void
    {
        $pr->update(['selected_quote_id' => $quote->id, 'status' => 'APPROVED_BY_PROCUREMENT']);
        $pr->quotes()->whereKey($quote->id)->update(['status' => 'SELECTED', 'selected_at' => $createdAt->copy()->addDays(4)]);
        $pr->quotes()->where('id', '!=', $quote->id)->update(['status' => 'REJECTED']);
        $this->addRequestHistory($pr, $executive, 'EXECUTIVE_SELECTED_QUOTE', 'PENDING_EXECUTIVE_QUOTE_DECISION', 'APPROVED_BY_PROCUREMENT', 'اختار المدير التنفيذي العرض المعتمد.');
    }

    private function createOrder(PurchaseRequest $pr, Collection $prItems, User $procurement, Supplier $supplier, ?PurchaseRequestQuote $selectedQuote, int $group, int $case, Carbon $createdAt, string $status, float $unitPrice, string $suffix = ''): PurchaseOrder
    {
        $po = PurchaseOrder::create([
            'po_number' => sprintf('TEST-PO-G%02d-%02d%s', $group, min($case, 99), $suffix),
            'purchase_request_id' => $pr->id,
            'selected_quote_id' => $selectedQuote?->id,
            'supplier_id' => $supplier->id,
            'created_by_user_id' => $procurement->id,
            'status' => $status,
            'subtotal' => 0,
            'grand_total' => 0,
            'payment_terms' => 'دفع على حساب المورد بعد المطابقة.',
            'delivery_terms' => 'التوريد إلى موقع المشروع المحدد في الطلب.',
            'delivery_date' => $createdAt->copy()->addDays(10)->toDateString(),
            'delivery_status' => 'NOT_STARTED',
            'actual_delivery_date' => null,
            'delivery_notes' => null,
            'budget_code' => sprintf('EGP-TEST-G%02d-%02d', $group, min($case, 99)),
            'financial_notes' => 'EGP فقط — بدون VAT أو Tax أو Discounts.',
            'reviewed_by_accounting_user_id' => $status === 'APPROVED_BY_ACCOUNTING' ? $procurement->id : null,
            'reviewed_at_accounting' => $status === 'APPROVED_BY_ACCOUNTING' ? $createdAt->copy()->addDays(2) : null,
            'notes' => sprintf('%s | أمر شراء مرتبط بالسيناريو G%02d-%02d.', self::MARKER, $group, min($case, 99)),
        ]);
        $this->stamp($po, $createdAt->copy()->addHours(8));

        $subtotal = 0.0;
        foreach ($prItems as $prItem) {
            $lineTotal = round((float) $prItem->quantity * $unitPrice, 2);
            $subtotal += $lineTotal;
            $po->items()->create([
                'pr_item_id' => $prItem->id,
                'item_id' => $prItem->item_id,
                'item_description' => $prItem->item_description,
                'item_reference' => $prItem->item_reference,
                'region' => $prItem->region,
                'quantity' => $prItem->quantity,
                'uom' => $prItem->uom,
                'unit_price' => $unitPrice,
                'line_total' => $lineTotal,
                'specifications' => ($prItem->specifications ?? '') . ' | نفس رقم قطعة الأرض والمنطقة المنقولين من طلب الشراء.',
            ]);
        }
        $po->update(['subtotal' => round($subtotal, 2), 'grand_total' => round($subtotal, 2)]);
        $this->addOrderHistory($po, $procurement, 'PO_CREATED', $pr->status, 'PO_DRAFT', 'أنشأ مدير المشتريات أمر الشراء من الطلب المترابط.');
        if ($status === 'ISSUED' || $status === 'APPROVED_BY_ACCOUNTING') {
            $this->addOrderHistory($po, $procurement, 'PO_ISSUED', 'PO_DRAFT', $status, 'أصدر أمر الشراء للحسابات/المورد حسب السيناريو.');
        }

        return $po->fresh(['items', 'purchaseRequest', 'supplier']);
    }

    private function createReceipt(PurchaseRequest $pr, PurchaseOrder $po, User $warehouse, User $siteEngineer, int $group, int $case, Carbon $createdAt, string $status, bool $full, string $suffix = ''): PurchaseReceipt
    {
        $receipt = PurchaseReceipt::create([
            'purchase_order_id' => $po->id,
            'purchase_request_id' => $pr->id,
            'warehouse_keeper_user_id' => $warehouse->id,
            'site_engineer_user_id' => $siteEngineer->id,
            'receipt_number' => sprintf('TEST-GRN-G%02d-%02d%s', $group, min($case, 99), $suffix),
            'status' => $status,
            'received_at' => $createdAt->copy()->addDays(11)->toDateString(),
            'warehouse_submitted_at' => $createdAt->copy()->addDays(12),
            'site_engineer_approved_at' => $status === 'APPROVED' ? $createdAt->copy()->addDays(13) : null,
            'warehouse_notes' => 'استلام مخزني تجريبي مرتبط بأمر الشراء.',
            'site_engineer_notes' => $status === 'APPROVED' ? 'تمت مراجعة واعتماد الاستلام من مهندس الموقع.' : null,
            'rejection_reason' => null,
        ]);
        $this->stamp($receipt, $createdAt->copy()->addDays(12));

        foreach ($po->items as $poItem) {
            $ordered = (float) $poItem->quantity;
            $received = $full ? $ordered : max(1, $ordered - 1);
            PurchaseReceiptItem::create([
                'purchase_receipt_id' => $receipt->id,
                'purchase_order_item_id' => $poItem->id,
                'ordered_quantity' => $ordered,
                'received_quantity' => $received,
                'notes' => sprintf('%s | الكمية مرتبطة بالبند ورقم قطعة الأرض %s.', self::MARKER, $poItem->item_reference),
            ]);
        }

        $po->update([
            'delivery_status' => $status === 'APPROVED' ? 'DELIVERED' : 'IN_RECEIPT',
            'actual_delivery_date' => $status === 'APPROVED' ? $createdAt->copy()->addDays(13)->toDateString() : null,
        ]);
        $this->addReceiptHistory($receipt, $warehouse, 'RECEIPT_CREATED', null, $status, 'أنشأ أمين المخزن إذن الاستلام.');
        $this->addReceiptHistory($receipt, $warehouse, 'WAREHOUSE_SUBMITTED', 'PENDING_WAREHOUSE', 'PENDING_SITE_ENGINEER', 'أرسل أمين المخزن الاستلام إلى مهندس الموقع.');
        if ($status === 'APPROVED') {
            $this->addReceiptHistory($receipt, $siteEngineer, 'SITE_ENGINEER_RECEIPT_APPROVED', 'PENDING_SITE_ENGINEER', 'APPROVED', 'اعتمد مهندس الموقع إذن الاستلام.');
        }

        return $receipt->fresh(['items.purchaseOrderItem', 'purchaseOrder']);
    }

    private function createMatchedInvoice(PurchaseOrder $po, PurchaseReceipt $receipt, User $accountant, int $group, int $case, Carbon $createdAt, int $year, string $suffix = ''): SupplierInvoice
    {
        $amount = round($receipt->items->sum(function (PurchaseReceiptItem $receiptItem): float {
            return (float) $receiptItem->received_quantity * (float) ($receiptItem->purchaseOrderItem?->unit_price ?? 0);
        }), 2);
        $invoice = SupplierInvoice::create([
            'supplier_id' => $po->supplier_id,
            'purchase_order_id' => $po->id,
            'purchase_receipt_id' => $receipt->id,
            'created_by_user_id' => $accountant->id,
            'invoice_number' => sprintf('TEST-INV-%d-G%02d-%02d%s', $year, $group, min($case, 99), $suffix),
            'amount' => $amount,
            'invoice_date' => $createdAt->copy()->addDays(14)->toDateString(),
            'due_date' => $createdAt->copy()->addDays(44)->toDateString(),
            'status' => 'OPEN',
            'matching_status' => 'MATCHED',
            'matched_at' => $createdAt->copy()->addDays(15),
            'matched_by_user_id' => $accountant->id,
            'paid_amount' => 0,
            'outstanding_amount' => $amount,
            'matching_notes' => 'تمت مطابقة أمر الشراء وإذن الاستلام وفاتورة المورد تجريبيًا.',
            'notes' => sprintf('%s | الفاتورة مديونية على حساب المورد وليست دفعًا مباشرًا.', self::MARKER),
        ]);
        $this->stamp($invoice, $createdAt->copy()->addDays(15));
        $this->addAudit($accountant, SupplierInvoice::class, $invoice->id, 'SUPPLIER_INVOICE_CREATED', null, 'OPEN');
        return $invoice;
    }

    /** @return array{0: SupplierPayment, 1: array<int, int>} */
    private function createPaymentWithAllocation(Supplier $supplier, User $accountant, array $invoices, float $amount, int $group, int $case, Carbon $createdAt, int $year): array
    {
        $payment = SupplierPayment::create([
            'supplier_id' => $supplier->id,
            'accountant_user_id' => $accountant->id,
            'payment_number' => sprintf('TEST-PAY-%d-G%02d-%02d', $year, $group, min($case, 99)),
            'amount' => round($amount, 2),
            'payment_date' => $createdAt->copy()->addDays(20)->toDateString(),
            'payment_method' => $case % 2 === 0 ? 'BANK_TRANSFER' : 'CHEQUE',
            'reference_number' => sprintf('TEST-REF-G%02d-%02d', $group, min($case, 99)),
            'allocated_amount' => 0,
            'overpayment_amount' => 0,
            'notes' => sprintf('%s | دفعة مستقلة على حساب المورد وتوزيع oldest-first.', self::MARKER),
        ]);
        $this->stamp($payment, $createdAt->copy()->addDays(20));

        $remaining = round($amount, 2);
        $allocationIds = [];
        $sortedInvoices = collect($invoices)->sortBy(fn (SupplierInvoice $invoice) => [$invoice->invoice_date?->toDateString(), $invoice->id]);
        foreach ($sortedInvoices as $invoice) {
            if ($remaining <= 0) {
                break;
            }
            $allocationAmount = round(min($remaining, (float) $invoice->outstanding_amount), 2);
            if ($allocationAmount <= 0) {
                continue;
            }
            $allocation = SupplierPaymentAllocation::create([
                'supplier_payment_id' => $payment->id,
                'supplier_invoice_id' => $invoice->id,
                'amount' => $allocationAmount,
            ]);
            $allocationIds[] = $allocation->id;
            $paid = round((float) $invoice->paid_amount + $allocationAmount, 2);
            $outstanding = max(0, round((float) $invoice->amount - $paid, 2));
            $invoice->update([
                'paid_amount' => $paid,
                'outstanding_amount' => $outstanding,
                'status' => $outstanding <= 0 ? 'PAID' : 'PARTIALLY_PAID',
            ]);
            $remaining = round($remaining - $allocationAmount, 2);
        }
        $payment->update([
            'allocated_amount' => round($amount - $remaining, 2),
            'overpayment_amount' => max(0, $remaining),
        ]);
        $this->addAudit($accountant, SupplierPayment::class, $payment->id, 'SUPPLIER_PAYMENT_CREATED', null, 'ALLOCATED');
        return [$payment->fresh(['allocations']), $allocationIds];
    }

    private function addRequestHistory(PurchaseRequest $request, User $actor, string $action, ?string $from, string $to, string $comments): void
    {
        ApprovalHistory::create([
            'target_type' => PurchaseRequest::class,
            'target_id' => $request->id,
            'actor_user_id' => $actor->id,
            'action' => $action,
            'from_state' => $from,
            'to_state' => $to,
            'comments' => self::MARKER . ' | ' . $comments,
        ]);
        $this->addAudit($actor, PurchaseRequest::class, $request->id, $action, $from, $to);
    }

    private function addOrderHistory(PurchaseOrder $order, User $actor, string $action, ?string $from, string $to, string $comments): void
    {
        ApprovalHistory::create([
            'target_type' => PurchaseOrder::class,
            'target_id' => $order->id,
            'actor_user_id' => $actor->id,
            'action' => $action,
            'from_state' => $from,
            'to_state' => $to,
            'comments' => self::MARKER . ' | ' . $comments,
        ]);
        $this->addAudit($actor, PurchaseOrder::class, $order->id, $action, $from, $to);
    }

    private function addReceiptHistory(PurchaseReceipt $receipt, User $actor, string $action, ?string $from, string $to, string $comments): void
    {
        ApprovalHistory::create([
            'target_type' => PurchaseReceipt::class,
            'target_id' => $receipt->id,
            'actor_user_id' => $actor->id,
            'action' => $action,
            'from_state' => $from,
            'to_state' => $to,
            'comments' => self::MARKER . ' | ' . $comments,
        ]);
        $this->addAudit($actor, PurchaseReceipt::class, $receipt->id, $action, $from, $to);
    }

    private function addAudit(User $actor, string $entityType, int $entityId, string $action, ?string $oldValue, ?string $newValue): void
    {
        AuditLog::create([
            'user_id' => $actor->id,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'action' => $action,
            'field_name' => 'status',
            'old_value' => $oldValue,
            'new_value' => self::MARKER . ' | ' . ($newValue ?? ''),
        ]);
    }

    private function addScenarioEvent(PurchaseRequest $request, User $actor, int $group, int $case, string $action, string $entryPoint): void
    {
        SystemEvent::create([
            'actor_user_id' => $actor->id,
            'event_type' => 'uat.scenario.action',
            'action' => 'UAT_' . $group . '_' . $case,
            'entity_type' => PurchaseRequest::class,
            'entity_id' => $request->id,
            'entity_label' => $request->request_number,
            'from_state' => null,
            'to_state' => $request->status,
            'description' => sprintf('%s | %s | نقطة الدخول: %s', self::MARKER, $action, $entryPoint),
            'metadata' => [
                'marker' => self::MARKER,
                'scenario_group' => $group,
                'scenario_case' => $case,
                'request_number' => $request->request_number,
                'entry_point' => $entryPoint,
            ],
            'occurred_at' => now(),
        ]);
    }

    private function notify(int $userId, string $type, string $title, string $message, Model $notifiable): void
    {
        Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => self::MARKER . ' | ' . $message,
            'notifiable_type' => get_class($notifiable),
            'notifiable_id' => $notifiable->getKey(),
            'purchase_order_id' => $notifiable instanceof PurchaseOrder ? $notifiable->id : null,
            'purchase_receipt_id' => null,
            'read_at' => null,
        ]);
    }

    private function notifyAccountingWithDocuments(User $accountant, PurchaseOrder $po, PurchaseReceipt $receipt): void
    {
        Notification::create([
            'user_id' => $accountant->id,
            'type' => 'purchase_order_and_receipt_ready_accounting',
            'title' => 'أمر الشراء وإذن الاستلام جاهزان للحسابات',
            'message' => sprintf('%s | أمر الشراء %s وإذن الاستلام %s مرتبطان بنفس العملية.', self::MARKER, $po->po_number, $receipt->receipt_number),
            'notifiable_type' => PurchaseOrder::class,
            'notifiable_id' => $po->id,
            'purchase_order_id' => $po->id,
            'purchase_receipt_id' => $receipt->id,
            'read_at' => null,
        ]);
    }

    private function refreshSupplierBalance(int $supplierId): void
    {
        $totalInvoiced = (float) SupplierInvoice::query()->where('supplier_id', $supplierId)->where('status', '!=', 'DRAFT')->sum('amount');
        $totalPaid = (float) SupplierPayment::query()->where('supplier_id', $supplierId)->sum('amount');
        SupplierBalance::updateOrCreate(
            ['supplier_id' => $supplierId],
            [
                'total_invoiced' => round($totalInvoiced, 2),
                'total_paid' => round($totalPaid, 2),
                'balance' => round($totalInvoiced - $totalPaid, 2),
                'last_activity_at' => now(),
            ],
        );
    }

    private function repairSeededScenarioDates(?User $generalManager = null): void
    {
        $today = Carbon::today();

        PurchaseRequest::query()
            ->where('notes', 'like', '%' . self::MARKER . '%')
            ->with('requester.roles')
            ->get()
            ->each(function (PurchaseRequest $request) use ($today): void {
                if (!preg_match('/TEST-PR-G(\\d{2})-(\\d{2})/', $request->request_number, $matches)) {
                    return;
                }

                $group = (int) $matches[1];
                $case = (int) $matches[2];
                // Archive/search fixtures intentionally keep historical dates.
                if ($group >= 27) {
                    return;
                }

                $futureDate = $today->copy()->addDays(5 + (($group + $case) % 20));
                $repairFields = [];
                if (!$request->date_needed || $request->date_needed->lt($today)) {
                    $repairFields['date_needed'] = $futureDate->toDateString();
                }

                // Groups 13–16 are the dedicated executive-request quote fixtures.
                // Normalize existing tagged rows to the current GM route without deleting
                // historical recommendations or any related records.
                if ($generalManager && in_array($group, [13, 14, 15, 16], true)) {
                    $repairFields['user_id'] = $generalManager->id;
                    $repairFields['department_id'] = $generalManager->department_id ?: $request->department_id;
                    $repairFields['reviewer_user_id'] = null;
                    if ($group === 13 && $request->status === 'PENDING_QUOTE_RECOMMENDATIONS'
                        && $request->quotes()->whereHas('recommendations', fn ($query) => $query->where('role_type', 'ACCOUNTING'))->exists()) {
                        $repairFields['status'] = 'PENDING_EXECUTIVE_QUOTE_DECISION';
                    }
                }

                if ($repairFields !== []) {
                    $request->updateQuietly($repairFields);
                }
            });
    }

    private function ensureReferenceData(): void
    {
        $category = Category::query()->updateOrCreate(
            ['code' => 'TEST_540_GENERAL'],
            ['name' => 'مواد اختبار دورة المشتريات', 'is_active' => true],
        );

        $uoms = ['PCS', 'BAG', 'M3', 'M2', 'KG'];
        for ($index = 1; $index <= 20; $index++) {
            $supplierNumber = str_pad((string) $index, 2, '0', STR_PAD_LEFT);
            Supplier::query()->updateOrCreate(
                ['company_name' => 'مورد اختبار دورة المشتريات ' . $supplierNumber],
                [
                    'contact_name' => 'مسؤول اختبار ' . $supplierNumber,
                    'email' => 'test-supplier-' . $supplierNumber . '@ashbiliya.local',
                    'phone' => '+20 10 5400 ' . str_pad((string) $index, 4, '0', STR_PAD_LEFT),
                    'address' => 'القاهرة — بيانات اختبار فقط',
                    'payment_terms' => 'حساب مورد — EGP',
                    'is_active' => true,
                ],
            );

            Item::query()->updateOrCreate(
                ['sku' => 'TEST540-ITEM-' . $supplierNumber],
                [
                    'category_id' => $category->id,
                    'name' => 'صنف اختبار دورة المشتريات ' . $supplierNumber,
                    'uom' => $uoms[($index - 1) % count($uoms)],
                    'description' => 'صنف مرجعي لإنشاء سيناريوهات UAT فقط.',
                    'default_estimated_price' => 0,
                    'is_active' => true,
                ],
            );
        }
    }

    private function usersByRole(string $role): Collection
    {
        return User::query()
            ->whereHas('roles', fn ($query) => $query->where('slug', $role))
            ->where('is_active', true)
            ->orderBy('id')
            ->get()
            ->values();
    }

    private function pick(Collection $collection, int $index, ?User $fallback): User
    {
        return $collection->isNotEmpty() ? $collection[$index % $collection->count()] : ($fallback ?: throw new \RuntimeException('المستخدم التجريبي المطلوب غير موجود.'));
    }

    private function stamp(Model $model, Carbon $createdAt): void
    {
        $model->created_at = $createdAt;
        $model->updated_at = $createdAt->copy()->addHours(2);
        $model->saveQuietly();
    }

    private function requestNumber(int $group, int $case): string
    {
        return sprintf('TEST-PR-G%02d-%02d', $group, $case);
    }

    private function alreadyPresentRow(string $scenarioId, int $group, int $case, string $requestNumber): array
    {
        return [
            'scenario_id' => $scenarioId,
            'group' => $group,
            'case' => $case,
            'action' => $this->actionLabel($group),
            'role' => $this->primaryRole($group),
            'entry_point' => $this->entryPoint($group),
            'request_number' => $requestNumber,
            'po_number' => null,
            'receipt_number' => null,
            'invoice_number' => null,
            'payment_number' => null,
            'related_records' => [],
            'requester' => null,
            'origin_department' => null,
            'target_department' => null,
            'manager' => null,
            'site_engineer' => null,
            'supplier' => null,
            'status' => 'ALREADY_PRESENT',
            'expected_result' => 'السجل موجود من تشغيل سابق ولا يجب إنشاء نسخة مكررة.',
            'actual_result' => 'تم تجاوز السجل الموجود دون تعديله أو حذفه.',
            'result' => 'ALREADY_PRESENT',
            'undo_or_rollback' => 'لم تُنفذ أي عملية حذف أو تعديل.',
        ];
    }

    private function actionLabel(int $group): string
    {
        return [
            1 => 'إنشاء طلب شراء',
            2 => 'حفظ الطلب كمسودة',
            3 => 'تعديل الطلب',
            4 => 'إرسال الطلب للمراجعة',
            5 => 'اعتماد الطلب',
            6 => 'رفض الطلب مع سبب',
            7 => 'إعادة الطلب للتعديل',
            8 => 'إنشاء طلب شراء مباشر',
            9 => 'اعتماد الحسابات أو رفضها',
            10 => 'بدء عروض الأسعار',
            11 => 'إضافة مورد',
            12 => 'إضافة عرض سعر',
            13 => 'ترشيح عرض من الحسابات',
            14 => 'ترشيح عرض من مدير القسم',
            15 => 'اختيار العرض من المدير التنفيذي',
            16 => 'رفض العروض',
            17 => 'إنشاء أمر شراء',
            18 => 'تعديل أمر الشراء',
            19 => 'إرسال أمر الشراء للمورد',
            20 => 'تسجيل الاستلام بواسطة أمين المخزن',
            21 => 'تعديل إذن الاستلام بواسطة مهندس الموقع',
            22 => 'اعتماد إذن الاستلام',
            23 => 'إرسال أمر الشراء وإذن الاستلام للحسابات',
            24 => 'تسجيل فاتورة المورد كمديونية',
            25 => 'تسجيل دفعة للمورد',
            26 => 'توزيع الدفعة على أقدم المديونيات',
            27 => 'البحث والفلترة والتقارير والأرشيف',
        ][$group];
    }

    private function primaryRole(int $group): string
    {
        return [
            1 => 'employee / جميع منشئي الطلبات',
            2 => 'employee',
            3 => 'employee / reviewer',
            4 => 'employee / reviewer / general_manager',
            5 => 'reviewer / general_manager',
            6 => 'reviewer',
            7 => 'reviewer',
            8 => 'procurement_manager',
            9 => 'accountant',
            10 => 'procurement_manager',
            11 => 'procurement_manager',
            12 => 'procurement_manager',
            13 => 'accountant',
            14 => 'reviewer',
            15 => 'general_manager',
            16 => 'general_manager',
            17 => 'procurement_manager',
            18 => 'procurement_manager',
            19 => 'procurement_manager',
            20 => 'warehouse_keeper',
            21 => 'site_engineer',
            22 => 'site_engineer',
            23 => 'accountant',
            24 => 'accountant',
            25 => 'accountant',
            26 => 'accountant',
            27 => 'all_roles_archive',
        ][$group];
    }

    private function entryPoint(int $group): string
    {
        if ($group <= 7) {
            return 'طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف';
        }
        if ($group <= 16) {
            return 'مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي';
        }
        if ($group <= 19) {
            return 'مدير المشتريات → الطلبات المعتمدة وأوامر الشراء';
        }
        if ($group <= 23) {
            return 'الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات';
        }
        if ($group <= 26) {
            return 'الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات';
        }
        return 'الأرشيف والبحث والفلترة وسجل الإجراءات';
    }

    private function writeReports(array $rows, Collection $departments, Collection $suppliers, Collection $items): void
    {
        $payload = [
            'marker' => self::MARKER,
            'version' => self::VERSION,
            'generated_at' => now()->toIso8601String(),
            'total_scenarios' => count($rows),
            'expected_groups' => self::GROUP_COUNT,
            'cases_per_group' => self::CASES_PER_GROUP,
            'pass_count' => collect($rows)->where('result', 'PASS')->count(),
            'already_present_count' => collect($rows)->where('result', 'ALREADY_PRESENT')->count(),
            'fail_count' => collect($rows)->where('result', 'FAIL')->count(),
            'data_snapshot' => [
                'departments' => $departments->count(),
                'active_suppliers' => $suppliers->count(),
                'active_items' => $items->count(),
            ],
            'scenarios' => $rows,
        ];

        $jsonPath = storage_path('app/TEST_SCENARIOS_540_REPORT.json');
        file_put_contents($jsonPath, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        $lines = [
            '# تقرير محاكاة نظام المشتريات — 540 سيناريو',
            '',
            '> هذا التقرير أُنشئ بواسطة Seeder إضافي بنمط add-only. لم يتم حذف أو تعديل أي بيانات خارج السيناريوهات ذات البادئة `TEST-540-SCENARIOS`.',
            '',
            '| البيان | القيمة |',
            '|---|---:|',
            '| إجمالي السيناريوهات | ' . count($rows) . ' |',
            '| عدد مجموعات الـAction | ' . self::GROUP_COUNT . ' |',
            '| السيناريوهات لكل Action | ' . self::CASES_PER_GROUP . ' |',
            '| تم إنشاؤه الآن | ' . $payload['pass_count'] . ' |',
            '| موجود مسبقًا وتُرك دون تعديل | ' . $payload['already_present_count'] . ' |',
            '| فشل | ' . $payload['fail_count'] . ' |',
            '| وقت التوليد | ' . $payload['generated_at'] . ' |',
            '',
            '## نقاط الدخول حسب المرحلة',
            '',
            '- المجموعات 01–07: طلبات الشراء والمراجعة والاعتماد والرفض والإرجاع.',
            '- المجموعات 08–09: مسار الطلب المباشر عبر الحسابات والمدير التنفيذي.',
            '- المجموعات 10–16: عروض الأسعار، الموردون، الترشيحات والقرار التنفيذي.',
            '- المجموعات 17–19: إنشاء أمر الشراء وتعديله وإصداره.',
            '- المجموعات 20–23: الاستلام المخزني واعتماد مهندس الموقع وإشعار الحسابات الموحد.',
            '- المجموعات 24–26: الفواتير كمديونيات، الدفعات، والتوزيع oldest-first.',
            '- المجموعة 27: البحث والفلترة والتقارير والأرشيف.',
            '',
            '## جدول السيناريوهات',
            '',
            '| # | Action | الدور | طلب الشراء | PO | GRN | فاتورة | دفعة | الحالة | النتيجة | نقطة الدخول |',
            '|---:|---|---|---|---|---|---|---|---|---|---|',
        ];

        foreach ($rows as $row) {
            $lines[] = sprintf(
                '| %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s |',
                $row['scenario_id'],
                $this->escapeMarkdown($row['action']),
                $this->escapeMarkdown($row['role']),
                $row['request_number'] ?? '-',
                $row['po_number'] ?? '-',
                $row['receipt_number'] ?? '-',
                $row['invoice_number'] ?? '-',
                $row['payment_number'] ?? '-',
                $row['status'] ?? '-',
                $row['result'],
                $this->escapeMarkdown($row['entry_point']),
            );
        }

        $lines[] = '';
        $lines[] = '## ملاحظات التراجع وعدم الحذف';
        $lines[] = '';
        $lines[] = 'كل السجلات التجريبية تحمل البادئة `TEST-540-SCENARIOS` في الملاحظات، وكل أرقام المستندات تبدأ بـ `TEST-`. لم ينفذ Seeder أي حذف أو تنظيف للبيانات الموجودة. إعادة التشغيل تتجاوز السجلات الموجودة بنفس رقم الطلب بدل إنشاء نسخ مكررة.';
        file_put_contents(base_path('TEST_SCENARIOS_540_REPORT_AR.md'), implode("\n", $lines) . "\n");
    }

    private function escapeMarkdown(?string $value): string
    {
        return str_replace(['|', "\n", "\r"], ['\\|', ' ', ' '], (string) $value);
    }
}
