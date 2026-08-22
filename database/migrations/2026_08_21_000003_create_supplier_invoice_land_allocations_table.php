<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supplier_invoice_land_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_invoice_id');
            $table->foreignId('land_parcel_id');
            $table->foreignId('created_by_user_id');
            $table->foreign('supplier_invoice_id', 'fk_allocs_invoice')->references('id')->on('supplier_invoices')->cascadeOnDelete();
            $table->foreign('land_parcel_id', 'fk_allocs_land')->references('id')->on('land_parcels')->restrictOnDelete();
            $table->foreign('created_by_user_id', 'fk_allocs_creator')->references('id')->on('users')->restrictOnDelete();
            $table->decimal('amount', 15, 2);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['supplier_invoice_id', 'land_parcel_id'], 'uq_invoice_land');
            $table->index('land_parcel_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_invoice_land_allocations');
    }
};

