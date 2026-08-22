<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->unsignedBigInteger('purchase_order_id')->nullable()->after('notifiable_id');
            $table->unsignedBigInteger('purchase_receipt_id')->nullable()->after('purchase_order_id');
            $table->index('purchase_order_id', 'idx_notif_purchase_order');
            $table->index('purchase_receipt_id', 'idx_notif_purchase_receipt');
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('idx_notif_purchase_order');
            $table->dropIndex('idx_notif_purchase_receipt');
            $table->dropColumn(['purchase_order_id', 'purchase_receipt_id']);
        });
    }
};
