<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->string('delivery_status', 30)->default('NOT_STARTED')->after('delivery_date');
            $table->date('actual_delivery_date')->nullable()->after('delivery_status');
            $table->text('delivery_notes')->nullable()->after('actual_delivery_date');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropColumn(['delivery_status', 'actual_delivery_date', 'delivery_notes']);
        });
    }
};
