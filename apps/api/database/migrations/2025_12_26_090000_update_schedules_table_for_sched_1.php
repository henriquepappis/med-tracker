<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropIndex(['user_id', 'medication_id']);
            $table->dropIndex(['user_id', 'is_active']);

            $table->dropColumn(['user_id', 'type', 'payload', 'starts_at', 'ends_at']);

            $table->string('recurrence_type');
            $table->json('times');
            $table->json('weekdays')->nullable();
            $table->unsignedInteger('interval_hours')->nullable();

            $table->index(['medication_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropIndex(['medication_id', 'is_active']);

            $table->dropColumn(['recurrence_type', 'times', 'weekdays', 'interval_hours']);

            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->json('payload');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();

            $table->index(['user_id', 'medication_id']);
            $table->index(['user_id', 'is_active']);
        });
    }
};
