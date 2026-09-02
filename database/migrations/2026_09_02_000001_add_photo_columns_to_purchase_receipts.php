<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_receipts', function (Blueprint $table): void {
            if (! Schema::hasColumn('purchase_receipts', 'photo_path')) {
                $table->string('photo_path')->nullable()->after('warehouse_notes');
            }
            if (! Schema::hasColumn('purchase_receipts', 'photo_name')) {
                $table->string('photo_name')->nullable()->after('photo_path');
            }
            if (! Schema::hasColumn('purchase_receipts', 'photo_size')) {
                $table->unsignedBigInteger('photo_size')->nullable()->after('photo_name');
            }
            if (! Schema::hasColumn('purchase_receipts', 'photo_mime_type')) {
                $table->string('photo_mime_type', 100)->nullable()->after('photo_size');
            }
        });
    }

    public function down(): void
    {
        Schema::table('purchase_receipts', function (Blueprint $table): void {
            $columns = array_filter([
                Schema::hasColumn('purchase_receipts', 'photo_path') ? 'photo_path' : null,
                Schema::hasColumn('purchase_receipts', 'photo_name') ? 'photo_name' : null,
                Schema::hasColumn('purchase_receipts', 'photo_size') ? 'photo_size' : null,
                Schema::hasColumn('purchase_receipts', 'photo_mime_type') ? 'photo_mime_type' : null,
            ]);
            if (! empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
