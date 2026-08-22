<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('purchase_requests', function (Blueprint $table) {
            $table->id();
            $table->string('request_number', 35)->unique();
            $table->foreignId('user_id')
                ->index('idx_pr_requester')
                ->constrained('users')
                ->onDelete('restrict');
            $table->foreignId('department_id')
                ->constrained('departments')
                ->onDelete('restrict');
            $table->string('title', 150);
            $table->string('priority', 15)->default('NORMAL');
            $table->string('status', 35)->default('DRAFT');
            $table->decimal('total_estimated_cost', 12, 2)->default(0.00);
            $table->date('date_needed')->nullable();
            $table->text('notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['department_id', 'status'], 'idx_pr_dept_status');
            $table->index('created_at', 'idx_pr_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_requests');
    }
};
