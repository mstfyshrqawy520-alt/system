<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Clear all purchase requests, orders, quotes, receipts, invoices, payments, allocations, and transaction logs.
     * Keeps all master data (users, roles, permissions, departments, suppliers, items, categories, land parcels) intact.
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        $tablesToClear = [
            'supplier_invoice_land_allocations',
            'land_parcel_transactions',
            'supplier_payment_allocations',
            'supplier_payments',
            'supplier_invoices',
            'purchase_receipt_items',
            'purchase_receipts',
            'purchase_order_items',
            'purchase_orders',
            'purchase_request_quote_recommendations',
            'purchase_quote_recommendations',
            'purchase_request_quotes',
            'purchase_request_items',
            'purchase_requests',
            'approval_history',
            'audit_logs',
            'system_events',
            'notifications',
            'attachments',
        ];

        foreach ($tablesToClear as $table) {
            if (Schema::hasTable($table)) {
                DB::table($table)->delete();
            }
        }

        // Reset supplier balances
        if (Schema::hasTable('supplier_balances')) {
            DB::table('supplier_balances')->delete();
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
