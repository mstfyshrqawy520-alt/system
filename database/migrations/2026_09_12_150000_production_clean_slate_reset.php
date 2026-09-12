<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Performs a one-time clean-slate reset on deployment for production readiness.
     * Completely zeroes all operational records (PRs, POs, Receipts, Quotes, Invoices, Payments, Events)
     * while preserving 100% of users, roles, permissions, departments, suppliers, and items.
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

        if (Schema::hasTable('supplier_balances')) {
            DB::table('supplier_balances')->update([
                'total_invoiced' => 0,
                'total_paid' => 0,
                'balance' => 0,
                'last_activity_at' => null,
                'updated_at' => now(),
            ]);
        }

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Irreversible clean-slate reset
    }
};
