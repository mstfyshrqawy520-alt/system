<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ResetSystemTransactions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'system:reset-transactions {--force : Force operation without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Zero out all transactional data (PRs, POs, Receipts, Quotes, Invoices, Payments, Notifications) while preserving users, roles, permissions, departments, suppliers, and catalog items.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if (! $this->option('force') && ! $this->confirm('هل أنت متأكد من رغبتك في تصفير جميع حركات المعاملات والطلبات والفواتير والإشعارات في النظام والبدء من الصفر؟ (لن يتم المساس بالمستخدمين أو الصلاحيات)')) {
            $this->warn('تم إلغاء العملية.');
            return self::SUCCESS;
        }

        $this->info('جاري تصفير معاملات النظام للإنتاج...');

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
                $count = DB::table($table)->count();
                DB::table($table)->delete();
                $this->line(" - تم تفريغ جدول: {$table} ({$count} سجل)");
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
            $this->line(' - تم تصفير أرصدة الموردين.');
        }

        Schema::enableForeignKeyConstraints();

        $this->info('✅ تم تصفير السيستم بنجاح تام! النظام الآن نظيف 100% للإنتاج، مع بقاء كافة المستخدمين والأدوار والبيانات الأساسية.');

        return self::SUCCESS;
    }
}
