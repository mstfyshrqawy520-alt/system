<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ResetDemoPasswordsSeeder extends Seeder
{
    public function run(): void
    {
        $emails = [
            'ayman@gmail.com',
            'hatem@gmail.com',
            'masoud@gmail.com',
            'mostafa@gmail.com',
            'amr@gmail.com',
            'ahmed@gmail.com',
            'hasan@gmail.com',
            'mohamed@gmail.com',
            'admin@gmail.com',
            'salam@gmail.com',
            'kamel@gmail.com',
            'youssef@gmail.com',
            'islam@gmail.com',
            'banhawy@gmail.com',
        ];

        User::whereIn('email', $emails)->update([
            'password' => Hash::make('123456'),
            'is_active' => true,
        ]);
    }
}
