<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Completely and safely removes PO-2026-00001 and all related records from MySQL / SQLite.
     */
    public function up(): void
    {
        try {
            Schema::disableForeignKeyConstraints();
        } catch (\Throwable $e) {}

        try {
            // 1. Find PO-2026-00001
            $poIds = [];
            $prIds = [];

            if (Schema::hasTable('purchase_orders')) {
                $pos = DB::table('purchase_orders')
                    ->where('po_number', 'PO-2026-00001')
                    ->get();

                $poIds = $pos->pluck('id')->filter()->toArray();
                $prIds = $pos->pluck('purchase_request_id')->filter()->unique()->toArray();
            }

            // 2. Find any PR created for "حديد دور ارضى" or parcel "1358"
            $extraPrIds = [];
            if (Schema::hasTable('purchase_request_items')) {
                $extraPrIds = DB::table('purchase_request_items')
                    ->where('item_description', 'like', '%حديد دور ارضى%')
                    ->orWhere('item_reference', '1358')
                    ->pluck('purchase_request_id')
                    ->filter()
                    ->unique()
                    ->toArray();
            }

            $allPrIds = array_values(array_unique(array_merge($prIds, $extraPrIds)));

            // 3. Delete Purchase Receipts linked to the PO
            if (!empty($poIds) && Schema::hasTable('purchase_receipts')) {
                $receiptIds = DB::table('purchase_receipts')
                    ->whereIn('purchase_order_id', $poIds)
                    ->pluck('id')
                    ->toArray();

                if (!empty($receiptIds) && Schema::hasTable('purchase_receipt_items')) {
                    DB::table('purchase_receipt_items')->whereIn('purchase_receipt_id', $receiptIds)->delete();
                }
                DB::table('purchase_receipts')->whereIn('purchase_order_id', $poIds)->delete();
            }

            // Also check receipts by PR if column exists
            if (!empty($allPrIds) && Schema::hasTable('purchase_receipts') && Schema::hasColumn('purchase_receipts', 'purchase_request_id')) {
                $prReceiptIds = DB::table('purchase_receipts')
                    ->whereIn('purchase_request_id', $allPrIds)
                    ->pluck('id')
                    ->toArray();

                if (!empty($prReceiptIds) && Schema::hasTable('purchase_receipt_items')) {
                    DB::table('purchase_receipt_items')->whereIn('purchase_receipt_id', $prReceiptIds)->delete();
                }
                DB::table('purchase_receipts')->whereIn('purchase_request_id', $allPrIds)->delete();
            }

            // 4. Delete Supplier Invoices linked to the PO
            if (!empty($poIds) && Schema::hasTable('supplier_invoices')) {
                $invoiceIds = DB::table('supplier_invoices')
                    ->whereIn('purchase_order_id', $poIds)
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
            }

            // 5. Delete Purchase Order Items & Purchase Order
            if (!empty($poIds)) {
                if (Schema::hasTable('purchase_order_items')) {
                    DB::table('purchase_order_items')->whereIn('purchase_order_id', $poIds)->delete();
                }
                if (Schema::hasTable('purchase_orders')) {
                    DB::table('purchase_orders')->whereIn('id', $poIds)->delete();
                }
            }
            if (Schema::hasTable('purchase_orders')) {
                DB::table('purchase_orders')->where('po_number', 'PO-2026-00001')->delete();
            }

            // 6. Delete Purchase Requests & Quotes
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
                if (Schema::hasTable('purchase_requests')) {
                    DB::table('purchase_requests')->whereIn('id', $allPrIds)->delete();
                }
            }

            // 7. Clean notifications, events, approval history
            try {
                if (Schema::hasTable('notifications')) {
                    DB::table('notifications')
                        ->where('data', 'like', '%PO-2026-00001%')
                        ->orWhere('data', 'like', '%حديد دور ارضى%')
                        ->delete();
                }
            } catch (\Throwable $e) {}

            try {
                if (Schema::hasTable('system_events') && !empty($poIds)) {
                    DB::table('system_events')
                        ->where('entity_type', 'PurchaseOrder')
                        ->whereIn('entity_id', $poIds)
                        ->delete();
                }
            } catch (\Throwable $e) {}

            try {
                if (Schema::hasTable('approval_history') && !empty($poIds)) {
                    DB::table('approval_history')
                        ->where('approvable_type', 'App\\Models\\PurchaseOrder')
                        ->whereIn('approvable_id', $poIds)
                        ->delete();
                }
            } catch (\Throwable $e) {}

        } catch (\Throwable $e) {
            // Log but don't fail deployment
            logger()->error('Cleanup error: ' . $e->getMessage());
        } finally {
            try {
                Schema::enableForeignKeyConstraints();
            } catch (\Throwable $e) {}
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
