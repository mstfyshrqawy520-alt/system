<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table): void {
            $table->string('procurement_route', 20)
                ->default('UNDECIDED')
                ->after('status')
                ->index('idx_pr_procurement_route');
            $table->foreignId('direct_supplier_id')
                ->nullable()
                ->after('procurement_route')
                ->constrained('suppliers')
                ->nullOnDelete()
                ->index('idx_pr_direct_supplier');
        });

        // Existing no-quotes requests are the only historical records that can
        // be safely identified as the direct-accounting route.
        DB::table('purchase_requests')
            ->whereIn('status', ['PENDING_ACCOUNTING_APPROVAL', 'APPROVED_BY_ACCOUNTING'])
            ->update(['procurement_route' => 'DIRECT']);
    }

    public function down(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table): void {
            $table->dropIndex('idx_pr_procurement_route');
            $table->dropIndex('idx_pr_direct_supplier');
            $table->dropForeign(['direct_supplier_id']);
            $table->dropColumn(['procurement_route', 'direct_supplier_id']);
        });
    }
};
