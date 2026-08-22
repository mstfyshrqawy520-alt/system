<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_request_quotes', function (Blueprint $table): void {
            $table->decimal('unit_price', 14, 2)->default(0)->after('total_amount');
        });

        DB::table('purchase_request_quotes as quotes')
            ->leftJoinSub(
                DB::table('purchase_request_items')
                    ->select('purchase_request_id', DB::raw('SUM(quantity) as total_quantity'))
                    ->groupBy('purchase_request_id'),
                'quantities',
                'quantities.purchase_request_id',
                '=',
                'quotes.purchase_request_id'
            )
            ->select('quotes.id', 'quotes.total_amount', 'quantities.total_quantity')
            ->orderBy('quotes.id')
            ->get()
            ->each(function (object $quote): void {
                $quantity = max((float) ($quote->total_quantity ?? 1), 1.0);
                DB::table('purchase_request_quotes')
                    ->where('id', $quote->id)
                    ->update(['unit_price' => round((float) $quote->total_amount / $quantity, 2)]);
            });

        Schema::table('purchase_orders', function (Blueprint $table): void {
            $table->foreignId('selected_quote_id')
                ->nullable()
                ->after('purchase_request_id')
                ->constrained('purchase_request_quotes')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table): void {
            $table->dropForeign(['selected_quote_id']);
            $table->dropColumn('selected_quote_id');
        });

        Schema::table('purchase_request_quotes', function (Blueprint $table): void {
            $table->dropColumn('unit_price');
        });
    }
};
