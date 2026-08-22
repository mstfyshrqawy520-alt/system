<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id');
            $table->foreignId('purchase_request_id')->nullable();
            $table->foreignId('warehouse_keeper_user_id')->nullable();
            $table->foreignId('site_engineer_user_id')->nullable();
            $table->foreign('purchase_order_id', 'fk_receipts_order')->references('id')->on('purchase_orders')->cascadeOnDelete();
            $table->foreign('purchase_request_id', 'fk_receipts_request')->references('id')->on('purchase_requests')->nullOnDelete();
            $table->foreign('warehouse_keeper_user_id', 'fk_receipts_keeper')->references('id')->on('users')->nullOnDelete();
            $table->foreign('site_engineer_user_id', 'fk_receipts_engineer')->references('id')->on('users')->nullOnDelete();
            $table->string('receipt_number');
            $table->unique('receipt_number', 'uq_receipts_number');
            $table->string('status', 40)->default('PENDING_WAREHOUSE');
            $table->date('received_at')->nullable();
            $table->dateTime('warehouse_submitted_at')->nullable();
            $table->dateTime('site_engineer_approved_at')->nullable();
            $table->text('warehouse_notes')->nullable();
            $table->text('site_engineer_notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
            $table->index(['status', 'site_engineer_user_id']);
            $table->index(['purchase_order_id', 'status']);
        });

        Schema::create('purchase_receipt_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_receipt_id');
            $table->foreignId('purchase_order_item_id');
            $table->foreign('purchase_receipt_id', 'fk_receipt_items_receipt')->references('id')->on('purchase_receipts')->cascadeOnDelete();
            $table->foreign('purchase_order_item_id', 'fk_receipt_items_order_item')->references('id')->on('purchase_order_items')->cascadeOnDelete();
            $table->decimal('ordered_quantity', 15, 3);
            $table->decimal('received_quantity', 15, 3);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['purchase_receipt_id', 'purchase_order_item_id'], 'uq_receipt_item');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_receipt_items');
        Schema::dropIfExists('purchase_receipts');
    }
};
