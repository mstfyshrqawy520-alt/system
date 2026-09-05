<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Clear all transactional & testing data for Production Launch:
     * - Purchase requests, items, quotes, recommendations
     * - Purchase orders, items
     * - Purchase receipts, items
     * - Supplier invoices, payments, allocations
     * - Land parcel allocations & transactions
     * - Approval history, audit logs, system events, notifications, attachments
     * 
     * Master data PRESERVED intact:
     * - Users & Passwords
     * - Roles & Permissions
     * - Departments & Managers
     * - Suppliers Directory & Opening Balances
     * - Categories & Items Catalog
     * - Land Parcels Directory
     * - Push Device Tokens & Sanctum Sessions
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

        // Reset supplier financial balances summaries
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
        // No-op
    }
};
