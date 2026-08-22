<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('actor_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('event_type', 80);
            $table->string('action', 100);
            $table->string('entity_type', 150)->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('entity_label', 180)->nullable();
            $table->string('from_state', 50)->nullable();
            $table->string('to_state', 50)->nullable();
            $table->text('description')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->json('metadata')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('occurred_at')->useCurrent();

            $table->index(['entity_type', 'entity_id', 'occurred_at'], 'idx_events_entity_time');
            $table->index(['actor_user_id', 'occurred_at'], 'idx_events_actor_time');
            $table->index(['event_type', 'occurred_at'], 'idx_events_type_time');
            $table->index('occurred_at', 'idx_events_occurred_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_events');
    }
};
