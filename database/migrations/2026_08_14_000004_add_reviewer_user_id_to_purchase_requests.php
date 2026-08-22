<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table): void {
            $table->foreignId('reviewer_user_id')
                ->nullable()
                ->after('department_id')
                ->index('idx_pr_reviewer')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table): void {
            $table->dropForeign(['reviewer_user_id']);
            $table->dropIndex('idx_pr_reviewer');
            $table->dropColumn('reviewer_user_id');
        });
    }
};
