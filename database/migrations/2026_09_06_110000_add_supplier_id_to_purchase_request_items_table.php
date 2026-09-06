<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add nullable supplier_id to purchase_request_items so that each line item
     * in a direct purchase can reference its own supplier.
     */
    public function up(): void
    {
        Schema::table('purchase_request_items', function (Blueprint $table) {
            $table->foreignId('supplier_id')
                ->nullable()
                ->after('item_id')
                ->constrained('suppliers')
                ->onDelete('set null');

            $table->index('supplier_id', 'idx_pr_items_supplier');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_request_items', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
            $table->dropIndex('idx_pr_items_supplier');
            $table->dropColumn('supplier_id');
        });
    }
};
