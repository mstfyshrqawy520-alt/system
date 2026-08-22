<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table): void {
            $table->index(['reviewer_user_id', 'status', 'updated_at'], 'idx_pr_reviewer_status_updated_p3');
        });

        Schema::table('notifications', function (Blueprint $table): void {
            $table->index(['user_id', 'id'], 'idx_notif_user_id_cursor_p3');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table): void {
            $table->dropIndex('idx_pr_reviewer_status_updated_p3');
        });

        Schema::table('notifications', function (Blueprint $table): void {
            $table->dropIndex('idx_notif_user_id_cursor_p3');
        });
    }
};
