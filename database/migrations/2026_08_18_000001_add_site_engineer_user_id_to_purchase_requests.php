<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table): void {
            $table->foreignId('site_engineer_user_id')
                ->nullable()
                ->after('reviewer_user_id')
                ->index('idx_pr_site_engineer')
                ->constrained('users')
                ->nullOnDelete();
        });

        // Preserve existing pilot requests by assigning their current reviewer
        // as the default site engineer. New requests are validated explicitly.
        DB::statement(
            'UPDATE purchase_requests SET site_engineer_user_id = reviewer_user_id WHERE site_engineer_user_id IS NULL AND reviewer_user_id IS NOT NULL'
        );
    }

    public function down(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table): void {
            $table->dropForeign(['site_engineer_user_id']);
            $table->dropIndex('idx_pr_site_engineer');
            $table->dropColumn('site_engineer_user_id');
        });
    }
};
