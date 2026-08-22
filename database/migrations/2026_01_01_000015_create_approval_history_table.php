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
        Schema::create('approval_history', function (Blueprint $table) {
            $table->id();
            $table->string('target_type', 50);
            $table->unsignedBigInteger('target_id');
            $table->foreignId('actor_user_id')
                ->index('idx_approval_actor')
                ->constrained('users')
                ->onDelete('restrict');
            $table->string('action', 50);
            $table->string('from_state', 35)->nullable();
            $table->string('to_state', 35);
            $table->text('comments')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['target_type', 'target_id'], 'idx_approval_target');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approval_history');
    }
};
