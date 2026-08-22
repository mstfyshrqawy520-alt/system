<?php

namespace Database\Seeders;

use App\Models\ApprovalHistory;
use App\Models\Attachment;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Department;
use App\Models\Item;
use App\Models\Notification;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\PurchaseRequest;
use App\Models\PurchaseRequestItem;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CleanupDemoDataSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            return;
        }

        DB::transaction(function (): void {
            // كل الطلبات والأوامر الحالية هي بيانات اختبار محلية.
            Attachment::query()->delete();
            ApprovalHistory::query()->delete();
            AuditLog::query()->delete();
            Notification::query()->delete();
            PurchaseOrderItem::query()->delete();
            PurchaseOrder::query()->delete();
            PurchaseRequestItem::query()->delete();
            PurchaseRequest::query()->delete();

            Supplier::whereIn('company_name', [
                'Al-Falak Technology Solutions',
                'Jarir Commercial Supplies',
            ])->delete();

            Item::whereIn('sku', [
                'LAPTOP-PRO-15',
                'MONITOR-4K-27',
                'PAPER-A4-BOX',
            ])->delete();
            Category::whereIn('code', ['HARDWARE', 'STATIONERY'])->delete();

            $legacyEmails = [
                'employee.demo@ashbiliya.local',
                'employee.demo@ashbiliya.com',
                'employee@ashbiliya.com',
                'reviewer.demo@ashbiliya.local',
                'reviewer.demo@ashbiliya.com',
                'reviewer@ashbiliya.com',
                'licenses.manager@ashbiliya.local',
                'execution.employee@ashbiliya.local',
                'development.employee@ashbiliya.local',
                'procurement.demo@ashbiliya.local',
                'procurement.demo@ashbiliya.com',
                'procurement@ashbiliya.com',
                'accountant.demo@ashbiliya.local',
                'accountant.demo@ashbiliya.com',
                'accountant@ashbiliya.com',
                'gm.demo@ashbiliya.local',
                'gm.demo@ashbiliya.com',
                'gm@ashbiliya.com',
                'admin.demo@ashbiliya.local',
                'admin.demo@ashbiliya.com',
                'admin@ashbiliya.com',
            ];

            $legacyUsers = User::whereIn('email', $legacyEmails)->get();
            foreach ($legacyUsers as $legacyUser) {
                Department::where('manager_user_id', $legacyUser->id)
                    ->update(['manager_user_id' => null]);
                $legacyUser->roles()->detach();
                $legacyUser->delete();
            }
        });
    }
}
