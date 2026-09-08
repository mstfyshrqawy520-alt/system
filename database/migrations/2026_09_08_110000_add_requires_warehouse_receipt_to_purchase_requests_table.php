<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->boolean('requires_warehouse_receipt')->default(true)->after('site_engineer_user_id');
        });

        // Keep office supplies as false since they are confirmed directly by requester
        DB::table('purchase_requests')
            ->where('request_type', 'OFFICE_SUPPLIES')
            ->update(['requires_warehouse_receipt' => false]);
    }

    public function down(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->dropColumn('requires_warehouse_receipt');
        });
    }
};
