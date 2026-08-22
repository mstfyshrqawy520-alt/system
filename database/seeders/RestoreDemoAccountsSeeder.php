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
        $departments = [];
        foreach ([
            'IT' => 'Information Technology',
            'OPS' => 'Operations',
            'EXECUTION' => 'التنفيذ',
            'DEVELOPMENT' => 'التطوير',
            'LICENSES' => 'التراخيص',
            'SALES' => 'المبيعات',
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
            ['amar@gmail.com', 'عمار', 'employee', 'IT'],
            ['safa@gmail.com', 'صفا', 'employee', 'IT'],
            ['zaid@gmail.com', 'زياد', 'employee', 'IT'],
            ['development.manager@ashbiliya.local', 'المهندس سعود', 'reviewer', 'DEVELOPMENT'],
            ['execution.manager@ashbiliya.local', 'م. كمال سعيد', 'reviewer', 'EXECUTION'],
            ['mostafa@gmail.com', 'مصطفى', 'reviewer', 'LICENSES'],
            ['sales.manager@ashbiliya.local', 'المهندس عمرو', 'reviewer', 'SALES'],
            ['ahmed@gmail.com', 'المهندس أحمد بدوي', 'procurement_manager', 'OPS'],
            ['hasan@gmail.com', 'حسن', 'accountant', 'OPS'],
            ['mohamed@gmail.com', 'المهندس محمد عبدالكريم', 'general_manager', 'OPS'],
            ['admin@gmail.com', 'Admin', 'admin', 'IT'],
            ['salam@ashbiliya.local', 'عم سلامة', 'warehouse_keeper', 'OPS'],
            ['site.engineer@ashbiliya.local', 'مهندس الموقع', 'site_engineer', 'EXECUTION'],
        ];

        foreach ($users as [$email, $name, $role, $department]) {
            $user = User::updateOrCreate(
                ['email' => $email],
                ['name' => $name, 'password' => '123456', 'department_id' => $departments[$department]->id, 'is_active' => true]
            );
            $user->roles()->sync([$roles[$role]->id]);
        }

        foreach ([
            'EXECUTION' => 'execution.manager@ashbiliya.local',
            'DEVELOPMENT' => 'development.manager@ashbiliya.local',
            'LICENSES' => 'mostafa@gmail.com',
            'SALES' => 'sales.manager@ashbiliya.local',
        ] as $department => $email) {
            $departments[$department]->update(['manager_user_id' => User::where('email', $email)->value('id')]);
        }

        // Demo behavior: the same active site engineer may serve multiple departments.
        $siteEngineerId = User::where('email', 'site.engineer@ashbiliya.local')->value('id');
        if ($siteEngineerId) {
            foreach ($departments as $department) {
                $department->update(['site_engineer_user_id' => $siteEngineerId]);
            }
        }
    }
}
