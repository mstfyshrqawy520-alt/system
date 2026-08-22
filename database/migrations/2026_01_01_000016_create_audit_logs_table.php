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
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->nullable()
                ->index('idx_audit_user')
                ->constrained('users')
                ->onDelete('set null');
            $table->string('entity_type', 50);
            $table->unsignedBigInteger('entity_id');
            $table->string('action', 50);
            $table->string('field_name', 50)->nullable();
            $table->longText('old_value')->nullable();
            $table->longText('new_value')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('created_at')->useCurrent()->index('idx_audit_created');

            $table->index(['entity_type', 'entity_id'], 'idx_audit_entity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
