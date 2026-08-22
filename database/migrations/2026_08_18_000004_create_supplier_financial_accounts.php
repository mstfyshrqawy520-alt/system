<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supplier_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id');
            $table->foreign('supplier_id', 'fk_balances_supplier')->references('id')->on('suppliers')->restrictOnDelete();
            $table->unique('supplier_id', 'uq_balances_supplier');
            $table->decimal('total_invoiced', 15, 2)->default(0);
            $table->decimal('total_paid', 15, 2)->default(0);
            $table->decimal('balance', 15, 2)->default(0);
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamps();
        });

        Schema::create('supplier_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id');
            $table->foreignId('purchase_order_id');
            $table->foreignId('purchase_receipt_id');
            $table->foreignId('created_by_user_id');
            $table->foreign('supplier_id', 'fk_invoices_supplier')->references('id')->on('suppliers')->restrictOnDelete();
            $table->foreign('purchase_order_id', 'fk_invoices_order')->references('id')->on('purchase_orders')->restrictOnDelete();
            $table->foreign('purchase_receipt_id', 'fk_invoices_receipt')->references('id')->on('purchase_receipts')->restrictOnDelete();
            $table->foreign('created_by_user_id', 'fk_invoices_creator')->references('id')->on('users')->restrictOnDelete();
            $table->string('invoice_number', 100);
            $table->unique('invoice_number', 'uq_invoices_number');
            $table->decimal('amount', 15, 2);
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->string('status', 30)->default('DRAFT');
            $table->string('matching_status', 30)->default('PENDING');
            $table->timestamp('matched_at')->nullable();
            $table->foreignId('matched_by_user_id')->nullable();
            $table->foreign('matched_by_user_id', 'fk_invoices_matcher')->references('id')->on('users')->nullOnDelete();
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('outstanding_amount', 15, 2)->default(0);
            $table->text('matching_notes')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['supplier_id', 'status']);
            $table->index(['purchase_order_id', 'purchase_receipt_id']);
        });

        Schema::create('supplier_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id');
            $table->foreignId('accountant_user_id');
            $table->foreign('supplier_id', 'fk_payments_supplier')->references('id')->on('suppliers')->restrictOnDelete();
            $table->foreign('accountant_user_id', 'fk_payments_accountant')->references('id')->on('users')->restrictOnDelete();
            $table->string('payment_number', 40);
            $table->unique('payment_number', 'uq_payments_number');
            $table->decimal('amount', 15, 2);
            $table->date('payment_date');
            $table->string('payment_method', 40)->default('BANK_TRANSFER');
            $table->string('reference_number', 100)->nullable();
            $table->decimal('allocated_amount', 15, 2)->default(0);
            $table->decimal('overpayment_amount', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['supplier_id', 'payment_date']);
        });

        Schema::create('supplier_payment_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_payment_id');
            $table->foreignId('supplier_invoice_id');
            $table->foreign('supplier_payment_id', 'fk_allocations_payment')->references('id')->on('supplier_payments')->cascadeOnDelete();
            $table->foreign('supplier_invoice_id', 'fk_allocations_invoice')->references('id')->on('supplier_invoices')->restrictOnDelete();
            $table->decimal('amount', 15, 2);
            $table->timestamps();
            $table->unique(['supplier_payment_id', 'supplier_invoice_id'], 'uq_payment_invoice');
            $table->index('supplier_invoice_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_payment_allocations');
        Schema::dropIfExists('supplier_payments');
        Schema::dropIfExists('supplier_invoices');
        Schema::dropIfExists('supplier_balances');
    }
};
