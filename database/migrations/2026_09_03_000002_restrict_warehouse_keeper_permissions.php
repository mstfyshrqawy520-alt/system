<?php

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
         = Role::where('slug', 'warehouse_keeper')->first();
        if () {
             = [
                'purchase_receipt.view_assigned',
                'purchase_receipt.edit',
            ];

             = Permission::whereIn('slug', )->pluck('id');
            ->permissions()->sync();
        }
    }

    public function down(): void
    {
        //
    }
};
