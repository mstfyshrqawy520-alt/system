<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\LandParcel;
use App\Models\PurchaseOrder;
use App\Models\PurchaseReceipt;
use App\Models\PurchaseRequest;
use App\Models\PurchaseRequestQuote;
use App\Models\SupplierInvoice;
use App\Models\SupplierInvoiceLandAllocation;
use App\Models\SupplierPayment;
use Database\Seeders\DemoFullWorkflowSeeder;
use Database\Seeders\DemoUserSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DemoFullWorkflowSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_seeder_creates_a_linked_full_cycle_and_is_idempotent(): void
    {
        $this->seed([
            RolePermissionSeeder::class,
            DemoUserSeeder::class,
        ]);

        $this->seed(DemoFullWorkflowSeeder::class);
        $this->seed(DemoFullWorkflowSeeder::class);

        $requests = PurchaseRequest::query()->where('request_number', 'like', 'TEST-FULL-PR-%')->get();
        $orders = PurchaseOrder::query()->where('po_number', 'like', 'TEST-FULL-PO-%')->with(['purchaseRequest', 'items'])->get();
        $receipts = PurchaseReceipt::query()->where('receipt_number', 'like', 'TEST-FULL-GRN-%')->with(['purchaseOrder', 'items'])->get();
        $invoices = SupplierInvoice::query()->where('invoice_number', 'like', 'TEST-FULL-INV-%')->with(['purchaseOrder', 'purchaseReceipt'])->get();
        $payments = SupplierPayment::query()->where('payment_number', 'like', 'TEST-FULL-PAY-%')->get();

        $this->assertCount(13, $requests);
        $this->assertCount(3, $orders);
        $this->assertCount(2, $receipts);
        $this->assertCount(1, $invoices);
        $this->assertCount(1, $payments);
        $this->assertCount(3, LandParcel::query()->where('parcel_reference', 'like', 'TEST-FULL-PARCEL-%')->get());
        $this->assertCount(15, PurchaseRequestQuote::query()->where('notes', 'like', 'TEST-FULL-WORKFLOW%')->get());

        foreach ($orders as $order) {
            $this->assertNotNull($order->purchaseRequest);
            $this->assertGreaterThan(0, $order->items->count());
            $this->assertSame($order->purchaseRequest->id, $order->purchase_request_id);
        }

        foreach ($receipts as $receipt) {
            $this->assertNotNull($receipt->purchaseOrder);
            $this->assertGreaterThan(0, $receipt->items->count());
            $this->assertSame($receipt->purchaseOrder->id, $receipt->purchase_order_id);
        }

        $invoice = $invoices->sole();
        $this->assertNotNull($invoice->purchaseOrder);
        $this->assertNotNull($invoice->purchaseReceipt);
        $this->assertSame($invoice->purchaseOrder->id, $invoice->purchase_order_id);
        $this->assertSame($invoice->purchaseReceipt->id, $invoice->purchase_receipt_id);
        $this->assertEqualsWithDelta(
            (float) $invoice->amount,
            (float) SupplierInvoiceLandAllocation::where('supplier_invoice_id', $invoice->id)->sum('amount'),
            0.01,
        );
        $this->assertEqualsWithDelta(
            (float) $invoice->paid_amount,
            (float) DB::table('supplier_payment_allocations')->where('supplier_invoice_id', $invoice->id)->sum('amount'),
            0.01,
        );
        $this->assertGreaterThanOrEqual(13, DB::table('system_events')->where('description', 'like', '%TEST-FULL-WORKFLOW%')->count());
    }
}
