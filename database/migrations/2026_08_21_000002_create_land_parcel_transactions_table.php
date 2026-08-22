<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('land_parcel_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('land_parcel_id')->constrained('land_parcels')->restrictOnDelete();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->string('transaction_type', 30);
            $table->decimal('amount', 15, 2);
            $table->decimal('balance_after', 15, 2);
            $table->string('reference_number', 100)->nullable();
            $table->date('transaction_date');
            $table->nullableMorphs('source');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['land_parcel_id', 'transaction_date']);
            $table->index(['transaction_type', 'transaction_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('land_parcel_transactions');
    }
};

