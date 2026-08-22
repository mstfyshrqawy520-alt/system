<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoUserSeeder extends Seeder
{
    /**
     * Seed the official local accounts, departments, and construction catalog.
     */
    public function run(): void
    {
        $this->call(RolePermissionSeeder::class);
        $this->call(ConstructionMaterialsSeeder::class);
        $this->call(ArabicSuppliersSeeder::class);
        $this->call(EgyptianSuppliers100Seeder::class);

        $upsertDepartment = static function (string $code, string $name): Department {
            $department = Department::withTrashed()->where('code', $code)->first();
            if ($department) {
                if ($department->trashed()) {
                    $department->restore();
                }
                $department->update(['name' => $name, 'is_active' => true]);
                return $department;
            }

            return Department::create([
                'code' => $code,
                'name' => $name,
                'is_active' => true,
            ]);
        };

        $itDept = $upsertDepartment('IT', 'Information Technology');
        $opsDept = $upsertDepartment('OPS', 'Operations');
        $executionDept = $upsertDepartment('EXECUTION', 'التنفيذ');
        $developmentDept = $upsertDepartment('DEVELOPMENT', 'التطوير');
        $licensesDept = $upsertDepartment('LICENSES', 'التراخيص');
        $salesDept = $upsertDepartment('SALES', 'المبيعات');

        $roles = [
            'employee' => Role::where('slug', 'employee')->firstOrFail(),
            'reviewer' => Role::where('slug', 'reviewer')->firstOrFail(),
            'procurement_manager' => Role::where('slug', 'procurement_manager')->firstOrFail(),
            'accountant' => Role::where('slug', 'accountant')->firstOrFail(),
            'general_manager' => Role::where('slug', 'general_manager')->firstOrFail(),
            'admin' => Role::where('slug', 'admin')->firstOrFail(),
            'warehouse_keeper' => Role::where('slug', 'warehouse_keeper')->firstOrFail(),
            'site_engineer' => Role::where('slug', 'site_engineer')->firstOrFail(),
        ];

        $users = [
            // Employees added by the user
            ['email' => 'amar@gmail.com', 'name' => 'عمار', 'role' => 'employee', 'department_id' => $itDept->id],
            ['email' => 'safa@gmail.com', 'name' => 'صفا', 'role' => 'employee', 'department_id' => $itDept->id],
            ['email' => 'zaid@gmail.com', 'name' => 'زياد', 'role' => 'employee', 'department_id' => $itDept->id],

            // Department reviewers
            ['email' => 'development.manager@ashbiliya.local', 'name' => 'المهندس سعود', 'role' => 'reviewer', 'department_id' => $developmentDept->id],
            ['email' => 'execution.manager@ashbiliya.local', 'name' => 'م. كمال سعيد', 'role' => 'reviewer', 'department_id' => $executionDept->id],
            ['email' => 'mostafa@gmail.com', 'name' => 'مصطفى', 'role' => 'reviewer', 'department_id' => $licensesDept->id],
            ['email' => 'sales.manager@ashbiliya.local', 'name' => 'المهندس عمرو', 'role' => 'reviewer', 'department_id' => $salesDept->id],

            // Procurement, General Manager, and Admin added by the user
            ['email' => 'ahmed@gmail.com', 'name' => 'المهندس أحمد بدوي', 'role' => 'procurement_manager', 'department_id' => $opsDept->id],
            ['email' => 'hasan@gmail.com', 'name' => 'حسن', 'role' => 'accountant', 'department_id' => $opsDept->id],
            ['email' => 'mohamed@gmail.com', 'name' => 'المهندس محمد عبدالكريم', 'role' => 'general_manager', 'department_id' => $opsDept->id],
            ['email' => 'admin@gmail.com', 'name' => 'Admin', 'role' => 'admin', 'department_id' => $itDept->id],
            ['email' => 'salam@ashbiliya.local', 'name' => 'عم سلامة', 'role' => 'warehouse_keeper', 'department_id' => $opsDept->id],
            ['email' => 'site.engineer@ashbiliya.local', 'name' => 'مهندس الموقع', 'role' => 'site_engineer', 'department_id' => $executionDept->id],
        ];

        foreach ($users as $userData) {
            $user = User::updateOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'password' => '123456',
                    'department_id' => $userData['department_id'],
                    'is_active' => true,
                ]
            );
            $user->roles()->sync([$roles[$userData['role']]->id]);
        }

        $executionManager = User::where('email', 'execution.manager@ashbiliya.local')->firstOrFail();
        $developmentManager = User::where('email', 'development.manager@ashbiliya.local')->firstOrFail();
        $licensesManager = User::where('email', 'mostafa@gmail.com')->firstOrFail();
        $salesManager = User::where('email', 'sales.manager@ashbiliya.local')->firstOrFail();

        $executionDept->update(['manager_user_id' => $executionManager->id]);
        $developmentDept->update(['manager_user_id' => $developmentManager->id]);
        $licensesDept->update(['manager_user_id' => $licensesManager->id]);
        $salesDept->update(['manager_user_id' => $salesManager->id]);

        // The same site engineer can serve multiple departments in the demo setup.
        $siteEngineer = User::where('email', 'site.engineer@ashbiliya.local')->firstOrFail();
        foreach ([$itDept, $opsDept, $executionDept, $developmentDept, $licensesDept, $salesDept] as $department) {
            $department->update(['site_engineer_user_id' => $siteEngineer->id]);
        }
    }
}

