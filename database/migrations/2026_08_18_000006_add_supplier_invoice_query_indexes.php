<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supplier_invoices', function (Blueprint $table): void {
            $table->index(
                ['supplier_id', 'matching_status', 'outstanding_amount', 'invoice_date', 'id'],
                'idx_invoice_supplier_debt_age'
            );
        });
    }

    public function down(): void
    {
        Schema::table('supplier_invoices', function (Blueprint $table): void {
            $table->dropIndex('idx_invoice_supplier_debt_age');
        });
    }
};
