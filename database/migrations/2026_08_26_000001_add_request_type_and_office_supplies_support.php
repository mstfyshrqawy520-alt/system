<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('purchase_requests', 'request_type')) {
                $table->string('request_type', 40)->default('PROJECT')->after('request_number');
                $table->index('request_type');
            }
        });

        Schema::table('purchase_request_items', function (Blueprint $table) {
            $table->string('item_reference', 100)->nullable()->change();
            $table->string('region', 150)->nullable()->change();
        });

        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->string('item_reference', 100)->nullable()->change();
            $table->string('region', 150)->nullable()->change();
        });

        Schema::table('purchase_receipts', function (Blueprint $table) {
            if (! Schema::hasColumn('purchase_receipts', 'receipt_type')) {
                $table->string('receipt_type', 40)->default('WAREHOUSE_SITE')->after('receipt_number');
            }
            if (! Schema::hasColumn('purchase_receipts', 'receiver_user_id')) {
                $table->foreignId('receiver_user_id')->nullable()->after('site_engineer_user_id')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('purchase_receipts', 'receiver_approved_at')) {
                $table->dateTime('receiver_approved_at')->nullable()->after('site_engineer_approved_at');
            }
            if (! Schema::hasColumn('purchase_receipts', 'receiver_notes')) {
                $table->text('receiver_notes')->nullable()->after('site_engineer_notes');
            }
        });
    }

    public function down(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table) {
            if (Schema::hasColumn('purchase_requests', 'request_type')) {
                $table->dropIndex(['request_type']);
                $table->dropColumn('request_type');
            }
        });

        Schema::table('purchase_receipts', function (Blueprint $table) {
            if (Schema::hasColumn('purchase_receipts', 'receiver_user_id')) {
                $table->dropConstrainedForeignId('receiver_user_id');
            }
            if (Schema::hasColumn('purchase_receipts', 'receipt_type')) {
                $table->dropColumn('receipt_type');
            }
            if (Schema::hasColumn('purchase_receipts', 'receiver_approved_at')) {
                $table->dropColumn('receiver_approved_at');
            }
            if (Schema::hasColumn('purchase_receipts', 'receiver_notes')) {
                $table->dropColumn('receiver_notes');
            }
        });
    }
};
