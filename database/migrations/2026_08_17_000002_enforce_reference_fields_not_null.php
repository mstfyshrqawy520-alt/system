<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Backfill historical empty values, then make traceability fields mandatory.
     */
    public function up(): void
    {
        foreach (['purchase_request_items', 'purchase_order_items'] as $table) {
            DB::table($table)
                ->where(function ($query) {
                    $query->whereNull('item_reference')
                        ->orWhere('item_reference', '')
                        ->orWhereRaw('TRIM(item_reference) = ?', ['']);
                })
                ->update(['item_reference' => 'UNKNOWN']);

            DB::table($table)
                ->where(function ($query) {
                    $query->whereNull('region')
                        ->orWhere('region', '')
                        ->orWhereRaw('TRIM(region) = ?', ['']);
                })
                ->update(['region' => 'UNKNOWN']);
        }

        Schema::table('purchase_request_items', function (Blueprint $table) {
            $table->string('item_reference', 100)->nullable(false)->change();
            $table->string('region', 150)->nullable(false)->change();
        });

        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->string('item_reference', 100)->nullable(false)->change();
            $table->string('region', 150)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->string('item_reference', 100)->nullable()->change();
            $table->string('region', 150)->nullable()->change();
        });

        Schema::table('purchase_request_items', function (Blueprint $table) {
            $table->string('item_reference', 100)->nullable()->change();
            $table->string('region', 150)->nullable()->change();
        });
    }
};
