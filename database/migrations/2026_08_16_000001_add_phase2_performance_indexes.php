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
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->index(['status', 'deleted_at', 'updated_at'], 'idx_po_status_deleted_updated_p2');
            $table->index('supplier_id', 'idx_po_supplier_p2');
        });

        Schema::table('approval_history', function (Blueprint $table) {
            $table->index(['target_type', 'target_id'], 'idx_approval_history_target_p2');
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->index(['entity_type', 'entity_id'], 'idx_audit_logs_entity_p2');
        });

        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->index(['status', 'user_id', 'updated_at'], 'idx_pr_status_user_updated_p2');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropIndex('idx_po_status_deleted_updated_p2');
            $table->dropIndex('idx_po_supplier_p2');
        });

        Schema::table('approval_history', function (Blueprint $table) {
            $table->dropIndex('idx_approval_history_target_p2');
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex('idx_audit_logs_entity_p2');
        });

        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->dropIndex('idx_pr_status_user_updated_p2');
        });
    }
};
