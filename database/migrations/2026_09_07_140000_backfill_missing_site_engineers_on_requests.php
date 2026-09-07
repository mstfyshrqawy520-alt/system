<?php

use App\Models\PurchaseRequest;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $fallbackSiteEngineerId = User::whereHas('roles', function ($query) {
            $query->where('slug', 'site_engineer');
        })->where('is_active', true)->value('id');

        if (! $fallbackSiteEngineerId) {
            return;
        }

        $prsWithoutSiteEngineer = PurchaseRequest::with(['targetDepartment', 'department'])
            ->whereNull('site_engineer_user_id')
            ->get();

        foreach ($prsWithoutSiteEngineer as $pr) {
            $engineerId = $pr->targetDepartment?->site_engineer_user_id
                ?: $pr->department?->site_engineer_user_id
                ?: $fallbackSiteEngineerId;

            $pr->update(['site_engineer_user_id' => $engineerId]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
