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
        Schema::create('purchase_request_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_request_id')
                ->index('idx_pr_items_pr')
                ->constrained('purchase_requests')
                ->onDelete('cascade');
            $table->foreignId('item_id')
                ->nullable()
                ->constrained('items')
                ->onDelete('restrict');
            $table->string('item_description', 255);
            $table->decimal('quantity', 10, 2);
            $table->string('uom', 20)->default('PCS');
            $table->decimal('estimated_unit_price', 12, 2)->default(0.00);
            $table->decimal('estimated_line_total', 12, 2)->default(0.00);
            $table->text('specifications')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_request_items');
    }
};
