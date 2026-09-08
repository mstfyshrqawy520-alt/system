<?php

use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $user = User::where('email', 'masoud@gmail.com')->first();
        if ($user) {
            $user->update([
                'name' => 'المهندس مصطفى الخشن',
                'email' => 'kheshen@gmail.com',
            ]);
        } else {
            $user = User::where('email', 'kheshen@gmail.com')->first();
        }

        $finishingDept = Department::where('code', 'FINISHING')->first();
        if ($finishingDept && $user) {
            $finishingDept->update([
                'manager_user_id' => $user->id,
            ]);
            $user->update([
                'department_id' => $finishingDept->id,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $user = User::where('email', 'kheshen@gmail.com')->first();
        if ($user) {
            $user->update([
                'name' => 'م. مسعود',
                'email' => 'masoud@gmail.com',
            ]);
        }
    }
};
