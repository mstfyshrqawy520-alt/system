<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table): void {
            $table->index(['status', 'created_at'], 'idx_po_status_created');
        });

        Schema::table('purchase_requests', function (Blueprint $table): void {
            $table->index(['status', 'created_at'], 'idx_pr_status_created');
        });

        Schema::table('notifications', function (Blueprint $table): void {
            $table->index(['user_id', 'id'], 'idx_notif_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table): void {
            $table->dropIndex('idx_po_status_created');
        });

        Schema::table('purchase_requests', function (Blueprint $table): void {
            $table->dropIndex('idx_pr_status_created');
        });

        Schema::table('notifications', function (Blueprint $table): void {
            $table->dropIndex('idx_notif_user_id');
        });
    }
};
