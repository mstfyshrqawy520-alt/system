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
            'amar@gmail.com',
            'safa@gmail.com',
            'zaid@gmail.com',
            'development.manager@ashbiliya.local',
            'execution.manager@ashbiliya.local',
            'mostafa@gmail.com',
            'sales.manager@ashbiliya.local',
            'ahmed@gmail.com',
            'hasan@gmail.com',
            'mohamed@gmail.com',
            'admin@gmail.com',
            'salam@ashbiliya.local',
            'site.engineer@ashbiliya.local',
        ];

        User::whereIn('email', $emails)->update([
            'password' => Hash::make('123456'),
            'is_active' => true,
        ]);
    }
}
