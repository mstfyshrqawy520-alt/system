<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

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

        // Deactivate all old departments not in the official 5
        Department::whereNotIn('code', ['EXECUTION', 'BUILDINGS', 'FINISHING', 'LICENSES', 'BUFFET'])->update(['is_active' => false]);

        $executionDept = $upsertDepartment('EXECUTION', 'التنفيذ');
        $buildingsDept = $upsertDepartment('BUILDINGS', 'المباني');
        $finishingDept = $upsertDepartment('FINISHING', 'التشطيبات');
        $licensesDept = $upsertDepartment('LICENSES', 'التراخيص');
        $buffetDept = $upsertDepartment('BUFFET', 'البوفيه');

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
            // Department reviewers
            ['email' => 'ayman@gmail.com', 'name' => 'م. أيمن ماهر', 'role' => 'reviewer', 'department_id' => $executionDept->id],
            ['email' => 'hatem@gmail.com', 'name' => 'المهندس حاتم', 'role' => 'reviewer', 'department_id' => $buildingsDept->id],
            ['email' => 'masoud@gmail.com', 'name' => 'م. مسعود', 'role' => 'reviewer', 'department_id' => $finishingDept->id],
            ['email' => 'mostafa@gmail.com', 'name' => 'م. مصطفى', 'role' => 'reviewer', 'department_id' => $licensesDept->id],
            ['email' => 'amr@gmail.com', 'name' => 'أ. عمرو', 'role' => 'reviewer', 'department_id' => $buffetDept->id],

            // Procurement, Accounting, General Manager, Admin, Warehouse
            ['email' => 'ahmed@gmail.com', 'name' => 'المهندس أحمد بدوي', 'role' => 'procurement_manager', 'department_id' => $executionDept->id],
            ['email' => 'hasan@gmail.com', 'name' => 'حسن', 'role' => 'accountant', 'department_id' => $executionDept->id],
            ['email' => 'mohamed@gmail.com', 'name' => 'المهندس محمد عبدالكريم', 'role' => 'general_manager', 'department_id' => $executionDept->id],
            ['email' => 'admin@gmail.com', 'name' => 'Admin', 'role' => 'admin', 'department_id' => $executionDept->id],
            ['email' => 'salam@gmail.com', 'name' => 'عم سلامة', 'role' => 'warehouse_keeper', 'department_id' => $executionDept->id],

            // The 4 Core Site Engineers
            ['email' => 'kamel@gmail.com', 'name' => 'م. كامل', 'role' => 'site_engineer', 'department_id' => $executionDept->id],
            ['email' => 'youssef@gmail.com', 'name' => 'م. يوسف', 'role' => 'site_engineer', 'department_id' => $executionDept->id],
            ['email' => 'islam@gmail.com', 'name' => 'م. إسلام', 'role' => 'site_engineer', 'department_id' => $executionDept->id],
            ['email' => 'banhawy@gmail.com', 'name' => 'أيمن البنهاوي', 'role' => 'site_engineer', 'department_id' => $executionDept->id],
        ];

        $activeEmails = array_column($users, 'email');

        // Ensure demo users exist without deleting other users

        foreach ($users as $userData) {
            $user = User::withTrashed()->updateOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'password' => '123456',
                    'department_id' => $userData['department_id'],
                    'is_active' => true,
                    'deleted_at' => null,
                ]
            );
            $user->roles()->sync([$roles[$userData['role']]->id]);
        }

        $executionManager = User::where('email', 'ayman@gmail.com')->firstOrFail();
        $buildingsManager = User::where('email', 'hatem@gmail.com')->firstOrFail();
        $finishingManager = User::where('email', 'masoud@gmail.com')->firstOrFail();
        $licensesManager = User::where('email', 'mostafa@gmail.com')->firstOrFail();
        $buffetManager = User::where('email', 'amr@gmail.com')->firstOrFail();

        $executionDept->update(['manager_user_id' => $executionManager->id]);
        $buildingsDept->update(['manager_user_id' => $buildingsManager->id]);
        $finishingDept->update(['manager_user_id' => $finishingManager->id]);
        $licensesDept->update(['manager_user_id' => $licensesManager->id]);
        $buffetDept->update(['manager_user_id' => $buffetManager->id]);
    }
}

