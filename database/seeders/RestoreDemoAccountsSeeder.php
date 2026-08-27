<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class RestoreDemoAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RolePermissionSeeder::class);

        // Deactivate all old departments not in the official 5
        Department::whereNotIn('code', ['EXECUTION', 'BUILDINGS', 'FINISHING', 'LICENSES', 'BUFFET'])->update(['is_active' => false]);

        $departments = [];
        foreach ([
            'EXECUTION' => 'التنفيذ',
            'BUILDINGS' => 'المباني',
            'FINISHING' => 'التشطيبات',
            'LICENSES' => 'التراخيص',
            'BUFFET' => 'البوفيه',
        ] as $code => $name) {
            $departments[$code] = Department::withTrashed()->updateOrCreate(
                ['code' => $code],
                ['name' => $name, 'is_active' => true]
            );
            if ($departments[$code]->trashed()) {
                $departments[$code]->restore();
            }
        }

        $roles = [];
        foreach (['employee', 'reviewer', 'procurement_manager', 'accountant', 'general_manager', 'admin', 'warehouse_keeper', 'site_engineer'] as $slug) {
            $roles[$slug] = Role::where('slug', $slug)->firstOrFail();
        }

        $users = [
            // Employees
            ['amar@gmail.com', 'عمار', 'employee', 'EXECUTION'],
            ['safa@gmail.com', 'صفا', 'employee', 'EXECUTION'],
            ['zaid@gmail.com', 'زياد', 'employee', 'EXECUTION'],

            // Department Reviewers
            ['ayman@gmail.com', 'م. أيمن ماهر', 'reviewer', 'EXECUTION'],
            ['hatem@gmail.com', 'المهندس حاتم', 'reviewer', 'BUILDINGS'],
            ['masoud@gmail.com', 'م. مسعود', 'reviewer', 'FINISHING'],
            ['mostafa@gmail.com', 'م. مصطفى', 'reviewer', 'LICENSES'],
            ['amr@gmail.com', 'أ. عمرو', 'reviewer', 'BUFFET'],

            // Management & Operations
            ['ahmed@gmail.com', 'المهندس أحمد بدوي', 'procurement_manager', 'EXECUTION'],
            ['hasan@gmail.com', 'حسن', 'accountant', 'EXECUTION'],
            ['mohamed@gmail.com', 'المهندس محمد عبدالكريم', 'general_manager', 'EXECUTION'],
            ['admin@gmail.com', 'Admin', 'admin', 'EXECUTION'],
            ['salam@gmail.com', 'عم سلامة', 'warehouse_keeper', 'EXECUTION'],

            // The 4 Site Engineers
            ['kamel@gmail.com', 'م. كامل', 'site_engineer', 'EXECUTION'],
            ['youssef@gmail.com', 'م. يوسف', 'site_engineer', 'EXECUTION'],
            ['islam@gmail.com', 'م. إسلام', 'site_engineer', 'EXECUTION'],
            ['banhawy@gmail.com', 'أيمن البنهاوي', 'site_engineer', 'EXECUTION'],
        ];

        foreach ($users as [$email, $name, $role, $department]) {
            $user = User::updateOrCreate(
                ['email' => $email],
                ['name' => $name, 'password' => '123456', 'department_id' => $departments[$department]->id, 'is_active' => true]
            );
            $user->roles()->sync([$roles[$role]->id]);
        }

        foreach ([
            'EXECUTION' => 'ayman@gmail.com',
            'BUILDINGS' => 'hatem@gmail.com',
            'FINISHING' => 'masoud@gmail.com',
            'LICENSES' => 'mostafa@gmail.com',
            'BUFFET' => 'amr@gmail.com',
        ] as $department => $email) {
            $managerId = User::where('email', $email)->value('id');
            if ($managerId && isset($departments[$department])) {
                $departments[$department]->update(['manager_user_id' => $managerId]);
            }
        }
    }
}
