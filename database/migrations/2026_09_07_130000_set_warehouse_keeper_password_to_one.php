<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $warehouseRole = Role::where('slug', 'warehouse_keeper')->first();
        if ($warehouseRole) {
            $warehouseUsers = User::whereHas('roles', function ($query) {
                $query->where('slug', 'warehouse_keeper');
            })->get();

            foreach ($warehouseUsers as $user) {
                $user->update([
                    'password' => Hash::make('1'),
                    'is_active' => true,
                ]);
            }
        }

        User::where('email', 'salam@gmail.com')->update([
            'password' => Hash::make('1'),
            'is_active' => true,
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
