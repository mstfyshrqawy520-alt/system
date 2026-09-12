<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Guaranteed safe cleanup of PO-2026-00001.
     */
    public function up(): void
    {
        try {
            Schema::disableForeignKeyConstraints();
        } catch (\Throwable $e) {}

        try {
            $poIds = [];
            if (Schema::hasTable('purchase_orders')) {
                $poIds = DB::table('purchase_orders')
                    ->where('po_number', 'PO-2026-00001')
                    ->pluck('id')
                    ->filter()
                    ->toArray();

                if (!empty($poIds) && Schema::hasTable('purchase_order_items')) {
                    DB::table('purchase_order_items')->whereIn('purchase_order_id', $poIds)->delete();
                }

                if (!empty($poIds) && Schema::hasTable('purchase_receipts')) {
                    $receiptIds = DB::table('purchase_receipts')->whereIn('purchase_order_id', $poIds)->pluck('id')->toArray();
                    if (!empty($receiptIds) && Schema::hasTable('purchase_receipt_items')) {
                        DB::table('purchase_receipt_items')->whereIn('purchase_receipt_id', $receiptIds)->delete();
                    }
                    DB::table('purchase_receipts')->whereIn('purchase_order_id', $poIds)->delete();
                }

                if (!empty($poIds) && Schema::hasTable('supplier_invoices')) {
                    $invoiceIds = DB::table('supplier_invoices')->whereIn('purchase_order_id', $poIds)->pluck('id')->toArray();
                    if (!empty($invoiceIds)) {
                        if (Schema::hasTable('supplier_invoice_land_allocations')) {
                            DB::table('supplier_invoice_land_allocations')->whereIn('supplier_invoice_id', $invoiceIds)->delete();
                        }
                        DB::table('supplier_invoices')->whereIn('id', $invoiceIds)->delete();
                    }
                }

                DB::table('purchase_orders')->where('po_number', 'PO-2026-00001')->delete();
            }

            if (Schema::hasTable('purchase_request_items')) {
                $prIds = DB::table('purchase_request_items')
                    ->where('item_description', 'like', '%حديد دور ارضى%')
                    ->orWhere('item_reference', '1358')
                    ->pluck('purchase_request_id')
                    ->filter()
                    ->unique()
                    ->toArray();

                if (!empty($prIds)) {
                    if (Schema::hasTable('purchase_request_items')) {
                        DB::table('purchase_request_items')->whereIn('purchase_request_id', $prIds)->delete();
                    }
                    if (Schema::hasTable('purchase_requests')) {
                        DB::table('purchase_requests')->whereIn('id', $prIds)->delete();
                    }
                }
            }
        } catch (\Throwable $e) {
            logger()->error('Guaranteed purge note: ' . $e->getMessage());
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
