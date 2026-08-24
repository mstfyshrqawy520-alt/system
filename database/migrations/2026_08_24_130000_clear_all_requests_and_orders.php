<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Clear all purchase requests, orders, quotes, receipts, invoices, and related transaction logs.
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        $tables = [
            'supplier_invoice_land_allocations',
            'supplier_payment_allocations',
            'supplier_payments',
            'supplier_invoices',
            'supplier_balances',
            'purchase_receipt_items',
            'purchase_receipts',
            'purchase_order_items',
            'purchase_orders',
            'purchase_quote_recommendations',
            'purchase_request_quotes',
            'purchase_request_items',
            'purchase_requests',
            'approval_history',
            'audit_logs',
            'system_events',
            'notifications',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                DB::table($table)->delete();
            }
        }

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
