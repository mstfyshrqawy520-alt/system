<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ApprovalHistory;
use App\Models\AuditLog;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\SystemEvent;
use Illuminate\Database\Seeder;

class BackfillSystemEventsSeeder extends Seeder
{
    public function run(): void
    {
        if (SystemEvent::query()->exists()) {
            $this->command?->warn('System events already exist; backfill skipped to keep it idempotent.');
            return;
        }

        foreach (PurchaseRequest::withTrashed()->cursor() as $request) {
            SystemEvent::create([
                'actor_user_id' => $request->user_id,
                'event_type' => 'backfill.model_created',
                'action' => 'CREATED',
                'entity_type' => PurchaseRequest::class,
                'entity_id' => $request->id,
                'entity_label' => $request->request_number,
                'to_state' => $request->status,
                'description' => 'سجل تاريخي تم ترحيله من تاريخ إنشاء طلب الشراء.',
                'new_values' => ['status' => $request->status],
                'metadata' => ['source' => 'backfill', 'source_table' => 'purchase_requests'],
                'occurred_at' => $request->created_at ?? now(),
            ]);
        }

        foreach (PurchaseOrder::withTrashed()->cursor() as $order) {
            SystemEvent::create([
                'actor_user_id' => $order->created_by_user_id,
                'event_type' => 'backfill.model_created',
                'action' => 'CREATED',
                'entity_type' => PurchaseOrder::class,
                'entity_id' => $order->id,
                'entity_label' => $order->po_number,
                'to_state' => $order->status,
                'description' => 'سجل تاريخي تم ترحيله من تاريخ إنشاء أمر الشراء.',
                'new_values' => ['status' => $order->status, 'grand_total' => $order->grand_total],
                'metadata' => ['source' => 'backfill', 'source_table' => 'purchase_orders'],
                'occurred_at' => $order->created_at ?? now(),
            ]);
        }

        foreach (ApprovalHistory::query()->cursor() as $history) {
            SystemEvent::create([
                'actor_user_id' => $history->actor_user_id,
                'event_type' => 'backfill.approval_history',
                'action' => $history->action,
                'entity_type' => $history->target_type,
                'entity_id' => $history->target_id,
                'from_state' => $history->from_state,
                'to_state' => $history->to_state,
                'description' => $history->comments,
                'metadata' => ['source' => 'approval_history', 'source_id' => $history->id],
                'occurred_at' => $history->created_at ?? now(),
            ]);
        }

        foreach (AuditLog::query()->cursor() as $audit) {
            SystemEvent::create([
                'actor_user_id' => $audit->user_id,
                'event_type' => 'backfill.audit_log',
                'action' => $audit->action,
                'entity_type' => $audit->entity_type,
                'entity_id' => $audit->entity_id,
                'description' => 'سجل تاريخي تم ترحيله من سجل التدقيق.',
                'old_values' => $audit->field_name ? [$audit->field_name => $audit->old_value] : null,
                'new_values' => $audit->field_name ? [$audit->field_name => $audit->new_value] : null,
                'metadata' => ['source' => 'audit_logs', 'source_id' => $audit->id],
                'occurred_at' => $audit->created_at ?? now(),
            ]);
        }

        $this->command?->info('Historical system events backfilled successfully.');
    }
}
