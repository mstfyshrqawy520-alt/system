<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_request_quotes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('purchase_request_id');
            $table->foreignId('supplier_id');
            $table->foreignId('created_by_user_id');
            $table->foreign('purchase_request_id', 'fk_pr_quotes_request')->references('id')->on('purchase_requests')->cascadeOnDelete();
            $table->foreign('supplier_id', 'fk_pr_quotes_supplier')->references('id')->on('suppliers')->restrictOnDelete();
            $table->foreign('created_by_user_id', 'fk_pr_quotes_creator')->references('id')->on('users')->restrictOnDelete();
            $table->decimal('total_amount', 14, 2)->default(0);
            $table->string('currency', 3)->default('EGP');
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('SUBMITTED');
            $table->timestamp('selected_at')->nullable();
            $table->timestamps();

            $table->unique(['purchase_request_id', 'supplier_id'], 'uq_pr_quote_supplier');
            $table->index(['purchase_request_id', 'status'], 'idx_pr_quotes_status');
        });

        Schema::create('purchase_request_quote_recommendations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('purchase_request_quote_id');
            $table->foreignId('user_id');
            $table->foreign('purchase_request_quote_id', 'fk_quote_recs_quote')->references('id')->on('purchase_request_quotes')->cascadeOnDelete();
            $table->foreign('user_id', 'fk_quote_recs_user')->references('id')->on('users')->restrictOnDelete();
            $table->string('role_type', 30);
            $table->string('decision', 20);
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->unique(['purchase_request_quote_id', 'user_id', 'role_type'], 'uq_quote_recommendation_actor');
        });

        Schema::table('purchase_requests', function (Blueprint $table): void {
            $table->foreignId('selected_quote_id')
                ->nullable()
                ->after('site_engineer_user_id');
            $table->foreign('selected_quote_id', 'fk_pr_selected_quote')
                ->references('id')
                ->on('purchase_request_quotes')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table): void {
            $table->dropForeign('fk_pr_selected_quote');
            $table->dropColumn('selected_quote_id');
        });

        Schema::dropIfExists('purchase_request_quote_recommendations');
        Schema::dropIfExists('purchase_request_quotes');
    }
};
