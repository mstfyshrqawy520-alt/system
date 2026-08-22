<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class ClearPurchaseCycleDemoDataSeeder extends Seeder
{
    /**
     * يحذف بيانات دورة الشراء التشغيلية فقط، ولا يلمس المستخدمين أو الموردين
     * أو الأصناف أو الأقسام أو الصلاحيات أو الأدوار.
     */
    public function run(): void
    {
        $deleted = DB::transaction(function (): array {
            $counts = [];

            // التبعيات المالية والاستلامية أولًا بسبب القيود المرجعية.
            $this->deleteTable($counts, 'supplier_payment_allocations');
            $this->deleteTable($counts, 'purchase_receipt_items');
            $this->deleteTable($counts, 'supplier_payments');
            $this->deleteTable($counts, 'supplier_invoices');
            $this->deleteTable($counts, 'purchase_receipts');

            // عروض الأسعار وترشيحاتها قبل حذف طلبات الشراء.
            $this->deleteTable($counts, 'purchase_request_quote_recommendations');
            $this->deleteTable($counts, 'purchase_request_quotes');

            // مرفقات وحركات الطلبات والأوامر.
            $this->deleteTable($counts, 'attachments');
            $this->deleteTable($counts, 'approval_history');
            $this->deleteTable($counts, 'audit_logs');
            $this->deleteTable($counts, 'system_events');
            $this->deleteTable($counts, 'notifications');

            // عناصر الأوامر ثم الأوامر نفسها.
            $this->deleteTable($counts, 'purchase_order_items');
            $this->deleteTable($counts, 'purchase_orders');

            // عناصر الطلبات ثم الطلبات نفسها.
            $this->deleteTable($counts, 'purchase_request_items');
            $this->deleteTable($counts, 'purchase_requests');

            // حسابات الموردين جداول مرجعية للرصيد؛ نحافظ على الحسابات ونصفر
            // ملخصها بعد حذف كل الفواتير والدفعات التجريبية.
            if (Schema::hasTable('supplier_balances')) {
                $counts['supplier_balances_reset'] = DB::table('supplier_balances')->update([
                    'total_invoiced' => 0,
                    'total_paid' => 0,
                    'balance' => 0,
                    'last_activity_at' => null,
                    'updated_at' => now(),
                ]);
            }

            return $counts;
        });

        $this->command?->info('تم حذف بيانات دورة الشراء التجريبية فقط بنجاح.');
        $this->command?->line(json_encode($deleted, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        $this->command?->line('تم الحفاظ على المستخدمين والموردين والأصناف والأقسام والأدوار والصلاحيات.');
    }

    /**
     * @param array<string, int> $counts
     */
    private function deleteTable(array &$counts, string $table): void
    {
        if (! Schema::hasTable($table)) {
            $counts[$table] = 0;
            return;
        }

        /** @var Builder $query */
        $query = DB::table($table);
        $counts[$table] = $query->count();
        $query->delete();
    }
}
