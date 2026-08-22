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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->constrained('users')
                ->onDelete('cascade');
            $table->string('type', 50);
            $table->string('title', 150);
            $table->text('message');
            $table->string('notifiable_type', 50)->nullable();
            $table->unsignedBigInteger('notifiable_id')->nullable();
            $table->timestamp('read_at')->nullable()->index();
            $table->timestamps();

            $table->index(['user_id', 'read_at'], 'idx_notif_user_unread');
            $table->index(['notifiable_type', 'notifiable_id'], 'idx_notif_target');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
