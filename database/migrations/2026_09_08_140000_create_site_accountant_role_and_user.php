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
        // 1. Update Accountant role title/description to Financial Director
        $accountantRole = Role::where('slug', 'accountant')->first();
        if ($accountantRole) {
            $accountantRole->update([
                'name' => 'Financial Director',
                'description' => 'المدير المالي - الرقابة المالية الشاملة والاعتمادات',
            ]);
        }

        // 2. Create or find the new site_accountant role
        $siteAccountantRole = Role::firstOrCreate(
            ['slug' => 'site_accountant'],
            [
                'name' => 'Site Accountant',
                'description' => 'حسابات - تسجيل فواتير الموردين لأقسام التنفيذ والتشطيبات والمباني',
            ]
        );

        // 3. Assign permissions to site_accountant
        $permissionsSlugs = [
            'accounting.invoice.view',
            'accounting.invoice.create',
            'accounting.invoice.match',
            'purchase_order.view',
            'purchase_order.view_accounting',
            'purchase_request.create',
            'purchase_request.view_own',
            'purchase_request.edit_own',
            'purchase_request.submit',
        ];

        $permissions = Permission::whereIn('slug', $permissionsSlugs)->get();
        $siteAccountantRole->permissions()->sync($permissions->pluck('id')->all());

        // 4. Create or update user Habiba
        $executionDept = Department::where('code', 'EXECUTION')->first()
            ?: Department::first();

        $habiba = User::withTrashed()->updateOrCreate(
            ['email' => 'habiba@gmail.com'],
            [
                'name' => 'حبيبة',
                'password' => Hash::make('123456'),
                'department_id' => $executionDept?->id,
                'is_active' => true,
                'deleted_at' => null,
            ]
        );

        $habiba->roles()->sync([$siteAccountantRole->id]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $habiba = User::where('email', 'habiba@gmail.com')->first();
        if ($habiba) {
            $habiba->roles()->detach();
        }

        $siteAccountantRole = Role::where('slug', 'site_accountant')->first();
        if ($siteAccountantRole) {
            $siteAccountantRole->permissions()->detach();
            $siteAccountantRole->delete();
        }
    }
};
