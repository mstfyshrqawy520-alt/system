<?php

use App\Models\Department;
use App\Models\Permission;
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
        // 1. Permissions list for department accountants
        $permissionsSlugs = [
            'accounting.invoice.view',
            'accounting.invoice.create',
            'accounting.invoice.match',
            'supplier.account.view',
            'purchase_order.view',
            'purchase_order.view_accounting',
            'purchase_request.create',
            'purchase_request.view_own',
            'purchase_request.edit_own',
            'purchase_request.submit',
        ];

        $permissions = Permission::whereIn('slug', $permissionsSlugs)->get();
        $permissionIds = $permissions->pluck('id')->all();

        // Ensure site_accountant also has all permissions
        $siteAccountantRole = Role::where('slug', 'site_accountant')->first();
        if ($siteAccountantRole) {
            $siteAccountantRole->permissions()->sync($permissionIds);
        }

        // 2. Create Licenses Accountant role (المهندس أحمد)
        $licensesAccountantRole = Role::firstOrCreate(
            ['slug' => 'licenses_accountant'],
            [
                'name' => 'Licenses Accountant',
                'description' => 'حسابات التراخيص - تسجيل فواتير الموردين ومطابقة أذونات الاستلام لقسم التراخيص',
            ]
        );
        $licensesAccountantRole->permissions()->sync($permissionIds);

        // 3. Create Buffet & Office Accountant role (المهندسة شروق)
        $buffetAccountantRole = Role::firstOrCreate(
            ['slug' => 'buffet_accountant'],
            [
                'name' => 'Buffet Accountant',
                'description' => 'حسابات المكتبيات والبوفيه - تسجيل فواتير الموردين ومطابقة أذونات الاستلام للمكتبيات والبوفيه',
            ]
        );
        $buffetAccountantRole->permissions()->sync($permissionIds);

        // 4. Create User: المهندس أحمد (Licenses)
        $licensesDept = Department::where('code', 'LICENSES')->first()
            ?: Department::where('name', 'like', '%تراخيص%')->first();

        $ahmed = User::withTrashed()->updateOrCreate(
            ['email' => 'ahmed.licenses@gmail.com'],
            [
                'name' => 'المهندس أحمد',
                'password' => Hash::make('123456'),
                'department_id' => $licensesDept?->id,
                'is_active' => true,
                'deleted_at' => null,
            ]
        );
        $ahmed->roles()->sync([$licensesAccountantRole->id]);

        // 5. Create User: المهندسة شروق (Buffet & Office)
        $buffetDept = Department::where('code', 'BUFFET')->first()
            ?: Department::where('name', 'like', '%بوفيه%')->first();

        $shorouk = User::withTrashed()->updateOrCreate(
            ['email' => 'shorouk@gmail.com'],
            [
                'name' => 'المهندسة شروق',
                'password' => Hash::make('123456'),
                'department_id' => $buffetDept?->id,
                'is_active' => true,
                'deleted_at' => null,
            ]
        );
        $shorouk->roles()->sync([$buffetAccountantRole->id]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $ahmed = User::where('email', 'ahmed.licenses@gmail.com')->first();
        if ($ahmed) {
            $ahmed->roles()->detach();
        }

        $shorouk = User::where('email', 'shorouk@gmail.com')->first();
        if ($shorouk) {
            $shorouk->roles()->detach();
        }

        Role::where('slug', 'licenses_accountant')->delete();
        Role::where('slug', 'buffet_accountant')->delete();
    }
};
