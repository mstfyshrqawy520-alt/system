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
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->string('attachable_type', 50);
            $table->unsignedBigInteger('attachable_id');
            $table->foreignId('uploaded_by_user_id')
                ->constrained('users')
                ->onDelete('restrict');
            $table->string('file_name', 255);
            $table->string('file_path', 255);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->timestamps();

            $table->index(['attachable_type', 'attachable_id'], 'idx_attachments_target');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
