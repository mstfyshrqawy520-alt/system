<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->decimal('opening_balance', 15, 2)->default(0)->after('payment_terms');
            $table->text('opening_balance_notes')->nullable()->after('opening_balance');
        });

        Schema::table('supplier_balances', function (Blueprint $table) {
            $table->decimal('opening_balance', 15, 2)->default(0)->after('supplier_id');
        });
    }

    public function down(): void
    {
        Schema::table('supplier_balances', function (Blueprint $table) {
            $table->dropColumn('opening_balance');
        });

        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropColumn(['opening_balance', 'opening_balance_notes']);
        });
    }
};
