<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('land_parcels', function (Blueprint $table) {
            $table->id();
            $table->string('parcel_reference', 100);
            $table->string('region', 150);
            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->decimal('funded_total', 15, 2)->default(0);
            $table->decimal('expense_total', 15, 2)->default(0);
            $table->decimal('balance', 15, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['parcel_reference', 'region']);
            $table->index(['is_active', 'parcel_reference']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('land_parcels');
    }
};

