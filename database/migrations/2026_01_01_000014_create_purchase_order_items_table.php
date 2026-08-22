<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')
                ->index('idx_po_items_po')
                ->constrained('purchase_orders')
                ->onDelete('cascade');
            $table->foreignId('pr_item_id')
                ->nullable()
                ->constrained('purchase_request_items')
                ->onDelete('set null');
            $table->foreignId('item_id')
                ->nullable()
                ->constrained('items')
                ->onDelete('restrict');
            $table->string('item_description', 255);
            $table->decimal('quantity', 10, 2);
            $table->string('uom', 20)->default('PCS');
            $table->decimal('unit_price', 12, 2)->default(0.00);
            $table->decimal('discount_amount', 12, 2)->default(0.00);
            $table->decimal('tax_amount', 12, 2)->default(0.00);
            $table->decimal('line_total', 12, 2)->default(0.00);
            $table->text('specifications')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_order_items');
    }
};
