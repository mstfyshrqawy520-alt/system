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
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')
                ->index('idx_items_category')
                ->constrained('categories')
                ->onDelete('restrict');
            $table->string('sku', 50)->unique();
            $table->string('name', 150);
            $table->string('uom', 20)->default('PCS');
            $table->text('description')->nullable();
            $table->decimal('default_estimated_price', 12, 2)->default(0.00);
            $table->boolean('is_active')->default(true)->index('idx_items_active');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
