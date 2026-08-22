<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->string('project', 150)->nullable()->after('title');
            $table->date('required_delivery_date')->nullable()->after('date_needed');
            $table->text('return_reason')->nullable()->after('rejection_reason');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->dropColumn(['project', 'required_delivery_date', 'return_reason']);
        });
    }
};
