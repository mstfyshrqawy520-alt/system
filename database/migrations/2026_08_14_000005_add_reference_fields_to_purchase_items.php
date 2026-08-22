<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_request_items', function (Blueprint $table) {
            $table->string('item_reference', 100)->nullable()->after('item_description');
            $table->string('region', 150)->nullable()->after('item_reference');
        });

        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->string('item_reference', 100)->nullable()->after('item_description');
            $table->string('region', 150)->nullable()->after('item_reference');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->dropColumn(['item_reference', 'region']);
        });

        Schema::table('purchase_request_items', function (Blueprint $table) {
            $table->dropColumn(['item_reference', 'region']);
        });
    }
};
