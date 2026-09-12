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
        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->index(['department_id', 'status', 'created_at'], 'idx_pr_dept_status_created');
            $table->index(['target_department_id', 'status', 'created_at'], 'idx_pr_target_dept_status_created');
            $table->index(['user_id', 'status'], 'idx_pr_user_status');
        });

        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->index(['status', 'supplier_id', 'created_at'], 'idx_po_status_supplier_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->dropIndex('idx_pr_dept_status_created');
            $table->dropIndex('idx_pr_target_dept_status_created');
            $table->dropIndex('idx_pr_user_status');
        });

        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropIndex('idx_po_status_supplier_created');
        });
    }
};
