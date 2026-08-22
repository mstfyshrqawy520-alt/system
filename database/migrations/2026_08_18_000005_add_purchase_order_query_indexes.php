<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table): void {
            $table->index(['status', 'updated_at'], 'idx_po_status_updated');
            $table->index(['supplier_id', 'updated_at'], 'idx_po_supplier_updated');
            $table->index(['purchase_request_id', 'updated_at'], 'idx_po_pr_updated');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table): void {
            $table->dropIndex('idx_po_status_updated');
            $table->dropIndex('idx_po_supplier_updated');
            $table->dropIndex('idx_po_pr_updated');
        });
    }
};
