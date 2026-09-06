<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add parcel_reference, region, and optional land_parcel_id to purchase_requests.
     * Each purchase request represents a single land parcel and region for all its items.
     */
    public function up(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->string('parcel_reference', 100)->nullable()->after('request_type');
            $table->string('region', 150)->nullable()->after('parcel_reference');
            $table->foreignId('land_parcel_id')
                ->nullable()
                ->after('region')
                ->constrained('land_parcels')
                ->nullOnDelete();

            $table->index(['parcel_reference', 'region'], 'idx_pr_parcel_region');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->dropForeign(['land_parcel_id']);
            $table->dropIndex('idx_pr_parcel_region');
            $table->dropColumn(['parcel_reference', 'region', 'land_parcel_id']);
        });
    }
};
