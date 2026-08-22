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
            $table->foreignId('target_department_id')
                ->nullable()
                ->after('department_id')
                ->constrained('departments')
                ->nullOnDelete();
        });

        DB::statement('UPDATE purchase_requests SET target_department_id = department_id WHERE target_department_id IS NULL');
    }

    public function down(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->dropForeign(['target_department_id']);
            $table->dropColumn('target_department_id');
        });
    }
};
