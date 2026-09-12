<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Completely removes PO-2026-00001 and all related records (PR, items, receipts, invoices, events, notifications).
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        // 1. Locate PO-2026-00001
        $pos = DB::table('purchase_orders')
            ->where('po_number', 'PO-2026-00001')
            ->get();

        $poIds = $pos->pluck('id')->toArray();
        $prIds = $pos->pluck('purchase_request_id')->filter()->unique()->toArray();

        // Also find any PR that might have created this order by looking for item "حديد دور ارضى" and parcel "1358"
        $relatedPrItems = DB::table('purchase_request_items')
            ->where(function ($q) {
                $q->where('item_description', 'like', '%حديد دور ارضى%')
                  ->orWhere('item_reference', '1358');
            })
            ->pluck('purchase_request_id')
            ->filter()
            ->unique()
            ->toArray();

        $allPrIds = array_unique(array_merge($prIds, $relatedPrItems));

        // 2. Delete Purchase Receipts linked to PO or PR
        $receiptIds = DB::table('purchase_receipts')
            ->whereIn('purchase_order_id', $poIds)
            ->orWhereIn('purchase_request_id', $allPrIds)
            ->pluck('id')
            ->toArray();

        if (!empty($receiptIds)) {
            DB::table('purchase_receipt_items')->whereIn('purchase_receipt_id', $receiptIds)->delete();
            DB::table('purchase_receipts')->whereIn('id', $receiptIds)->delete();
        }

        // 3. Delete Supplier Invoices and Allocations linked to PO or PR
        $invoiceIds = DB::table('supplier_invoices')
            ->whereIn('purchase_order_id', $poIds)
            ->orWhereIn('purchase_request_id', $allPrIds)
            ->pluck('id')
            ->toArray();

        if (!empty($invoiceIds)) {
            if (Schema::hasTable('supplier_invoice_land_allocations')) {
                DB::table('supplier_invoice_land_allocations')->whereIn('supplier_invoice_id', $invoiceIds)->delete();
            }
            if (Schema::hasTable('supplier_payment_allocations')) {
                DB::table('supplier_payment_allocations')->whereIn('supplier_invoice_id', $invoiceIds)->delete();
            }
            DB::table('supplier_invoices')->whereIn('id', $invoiceIds)->delete();
        }

        // 4. Delete Purchase Order Items & Purchase Order
        if (!empty($poIds)) {
            DB::table('purchase_order_items')->whereIn('purchase_order_id', $poIds)->delete();
            DB::table('purchase_orders')->whereIn('id', $poIds)->delete();
        }
        // Also ensure any leftover by po_number is gone
        DB::table('purchase_orders')->where('po_number', 'PO-2026-00001')->delete();

        // 5. Delete Purchase Request & its items/quotes
        if (!empty($allPrIds)) {
            if (Schema::hasTable('purchase_request_quote_recommendations')) {
                DB::table('purchase_request_quote_recommendations')->whereIn('purchase_request_id', $allPrIds)->delete();
            }
            if (Schema::hasTable('purchase_request_quotes')) {
                DB::table('purchase_request_quotes')->whereIn('purchase_request_id', $allPrIds)->delete();
            }
            if (Schema::hasTable('purchase_request_items')) {
                DB::table('purchase_request_items')->whereIn('purchase_request_id', $allPrIds)->delete();
            }
            DB::table('purchase_requests')->whereIn('id', $allPrIds)->delete();
        }

        // 6. Delete related Notifications, System Events, Audit Logs
        if (!empty($poIds) || !empty($allPrIds)) {
            DB::table('notifications')
                ->where(function ($q) use ($poIds, $allPrIds) {
                    if (!empty($poIds)) {
                        $q->whereIn('document_id', $poIds);
                    }
                    $q->orWhere('data', 'like', '%PO-2026-00001%');
                    foreach ($poIds as $pId) {
                        $q->orWhere('data', 'like', "%\"purchase_order_id\":{$pId}%");
                    }
                    foreach ($allPrIds as $prId) {
                        $q->orWhere('data', 'like', "%\"purchase_request_id\":{$prId}%");
                    }
                })
                ->delete();

            if (Schema::hasTable('system_events')) {
                DB::table('system_events')
                    ->where(function ($q) use ($poIds, $allPrIds) {
                        $q->where(function ($sub) use ($poIds) {
                            $sub->where('entity_type', 'PurchaseOrder')
                                ->whereIn('entity_id', $poIds);
                        });
                        if (!empty($allPrIds)) {
                            $q->orWhere(function ($sub) use ($allPrIds) {
                                $sub->where('entity_type', 'PurchaseRequest')
                                    ->whereIn('entity_id', $allPrIds);
                            });
                        }
                    })
                    ->delete();
            }

            if (Schema::hasTable('approval_history')) {
                DB::table('approval_history')
                    ->where(function ($q) use ($poIds, $allPrIds) {
                        $q->where(function ($sub) use ($poIds) {
                            $sub->where('approvable_type', 'App\\Models\\PurchaseOrder')
                                ->whereIn('approvable_id', $poIds);
                        });
                        if (!empty($allPrIds)) {
                            $q->orWhere(function ($sub) use ($allPrIds) {
                                $sub->where('approvable_type', 'App\\Models\\PurchaseRequest')
                                    ->whereIn('approvable_id', $allPrIds);
                            });
                        }
                    })
                    ->delete();
            }
        }

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Deletion of test order is intentional and irreversible
    }
};
