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
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->string('po_number', 35)->unique();
            $table->foreignId('purchase_request_id')
                ->index('idx_po_pr')
                ->constrained('purchase_requests')
                ->onDelete('restrict');
            $table->foreignId('supplier_id')
                ->index('idx_po_supplier')
                ->constrained('suppliers')
                ->onDelete('restrict');
            $table->foreignId('created_by_user_id')
                ->constrained('users')
                ->onDelete('restrict');
            $table->string('status', 35)->default('PO_DRAFT')->index('idx_po_status');
            $table->decimal('subtotal', 12, 2)->default(0.00);
            $table->decimal('discount_amount', 12, 2)->default(0.00);
            $table->decimal('tax_amount', 12, 2)->default(0.00);
            $table->decimal('grand_total', 12, 2)->default(0.00);
            $table->string('payment_terms', 150)->nullable();
            $table->string('delivery_terms', 150)->nullable();
            $table->date('delivery_date')->nullable();
            $table->string('budget_code', 50)->nullable();
            $table->text('financial_notes')->nullable();
            $table->foreignId('reviewed_by_accounting_user_id')
                ->nullable()
                ->constrained('users')
                ->onDelete('restrict');
            $table->timestamp('reviewed_at_accounting')->nullable();
            $table->text('notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('created_at', 'idx_po_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};
