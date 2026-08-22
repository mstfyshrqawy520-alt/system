<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table): void {
            // Employee queue: filter by owner and sort by newest first.
            $table->index(['user_id', 'created_at'], 'idx_pr_user_created');

            // Reviewer queue: assigned reviewer + status, sorted by recent updates.
            $table->index(['reviewer_user_id', 'status', 'updated_at'], 'idx_pr_reviewer_status_updated');

            // Legacy reviewer fallback: unassigned requests from the reviewer's department.
            $table->index(['department_id', 'status', 'updated_at'], 'idx_pr_dept_status_updated');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table): void {
            $table->dropIndex('idx_pr_user_created');
            $table->dropIndex('idx_pr_reviewer_status_updated');
            $table->dropIndex('idx_pr_dept_status_updated');
        });
    }
};

