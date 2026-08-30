<?php

use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Assign the official department managers and reviewers to their respective departments.
     */
    public function up(): void
    {
        $departmentReviewers = [
            'EXECUTION' => 'ayman@gmail.com',
            'BUILDINGS' => 'hatem@gmail.com',
            'FINISHING' => 'masoud@gmail.com',
            'LICENSES' => 'mostafa@gmail.com',
            'BUFFET' => 'amr@gmail.com',
        ];

        foreach ($departmentReviewers as $code => $email) {
            $user = User::where('email', $email)->first();
            $dept = Department::where('code', $code)->first();

            if ($user && $dept) {
                $user->update(['department_id' => $dept->id]);
                $dept->update(['manager_user_id' => $user->id]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
