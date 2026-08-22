<?php

namespace App\Services;

use App\Models\ApprovalHistory;
use App\Models\AuditLog;
use App\Models\PurchaseRequest;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GeneralManagerPurchaseRequestService
{
    public const PENDING_STATUS = 'PENDING_EXECUTIVE_APPROVAL';

    public function getPendingRequests(int $perPage = 50): LengthAwarePaginator
    {
        return PurchaseRequest::query()
            ->with([
                'requester:id,name,email',
                'department:id,name,code',
                'directSupplier:id,company_name,code',
                'assignedReviewer:id,name,email,department_id',
                'siteEngineer:id,name,email,department_id',
                'items.item',
                'approvalHistory.actor',
            ])
            ->where('status', self::PENDING_STATUS)
            ->where(function ($query): void {
                $query->whereNull('procurement_route')->orWhere('procurement_route', '!=', 'DIRECT');
            })
            ->orderByDesc('updated_at')
            ->paginate(min(max($perPage, 1), 100));
    }

    public function getPendingRequest(int $id): PurchaseRequest
    {
        return PurchaseRequest::query()
            ->with([
                'requester:id,name,email',
                'department:id,name,code',
                'directSupplier:id,company_name,code',
                'assignedReviewer:id,name,email,department_id',
                'siteEngineer:id,name,email,department_id',
                'items.item',
                'approvalHistory.actor',
            ])
            ->where('status', self::PENDING_STATUS)
            ->where(function ($query): void {
                $query->whereNull('procurement_route')->orWhere('procurement_route', '!=', 'DIRECT');
            })
            ->findOrFail($id);
    }

    public function updateRequest(User $executive, PurchaseRequest $request, array $data): PurchaseRequest
    {
        $this->ensurePending($request);

        return DB::transaction(function () use ($executive, $request, $data): PurchaseRequest {
            $pr = PurchaseRequest::query()->lockForUpdate()->findOrFail($request->id);
            $oldState = $pr->status;
            $updateFields = [];

            foreach (['priority', 'date_needed', 'notes'] as $field) {
                if (array_key_exists($field, $data) && (string) ($pr->{$field} ?? '') !== (string) ($data[$field] ?? '')) {
                    $updateFields[$field] = $data[$field];
                }
            }

            if (array_key_exists('items', $data)) {
                $items = $data['items'];
                if (count($items) === 0) {
                    throw ValidationException::withMessages([
                        'items' => ['يجب أن يحتوي الطلب على بند واحد على الأقل.'],
                    ]);
                }

                $normalizedItems = [];
                foreach ($items as $index => $item) {
                    $reference = trim((string) ($item['item_reference'] ?? ''));
                    $region = trim((string) ($item['region'] ?? ''));
                    if ($reference === '' || $region === '') {
                        $errors = [];
                        if ($reference === '') {
                            $errors["items.{$index}.item_reference"] = ['رقم قطعة الأرض مطلوب.'];
                        }
                        if ($region === '') {
                            $errors["items.{$index}.region"] = ['المنطقة مطلوبة.'];
                        }
                        throw ValidationException::withMessages($errors);
                    }

                    $quantity = (float) ($item['quantity'] ?? 0);
                    if ($quantity <= 0) {
                        throw ValidationException::withMessages([
                            "items.{$index}.quantity" => ['الكمية يجب أن تكون أكبر من صفر.'],
                        ]);
                    }

                    $normalizedItems[] = [
                        'item_id' => $item['item_id'] ?? null,
                        'item_description' => $item['item_description'] ?? '',
                        'item_reference' => $reference,
                        'region' => $region,
                        'quantity' => $quantity,
                        'uom' => $item['uom'] ?? 'PCS',
                        'specifications' => $item['specifications'] ?? null,
                        'notes' => $item['notes'] ?? null,
                    ];
                }

                $pr->items()->delete();
                foreach ($normalizedItems as $item) {
                    $pr->items()->create($item);
                }
            }

            // Executive edits intentionally go directly to procurement, without returning to the reviewer.
            $updateFields['status'] = 'PENDING_PROCUREMENT_APPROVAL';
            $pr->update($updateFields);

            ApprovalHistory::create([
                'target_type' => PurchaseRequest::class,
                'target_id' => $pr->id,
                'actor_user_id' => $executive->id,
                'action' => 'EDITED_BY_EXECUTIVE',
                'from_state' => $oldState,
                'to_state' => 'PENDING_PROCUREMENT_APPROVAL',
                'comments' => $data['comment'] ?? 'تم تعديل الطلب من المدير التنفيذي وإرساله للمشتريات.',
            ]);

            AuditLog::create([
                'user_id' => $executive->id,
                'entity_type' => PurchaseRequest::class,
                'entity_id' => $pr->id,
                'action' => 'EDITED_BY_EXECUTIVE',
                'old_value' => json_encode(['status' => $oldState], JSON_UNESCAPED_UNICODE),
                'new_value' => json_encode(['status' => 'PENDING_PROCUREMENT_APPROVAL'], JSON_UNESCAPED_UNICODE),
            ]);

            $this->notifyProcurement($pr, 'تم تعديل طلب الشراء من المدير التنفيذي وإرساله إلى مدير المشتريات.');

            return $pr->fresh([
                'requester',
                'department',
                'directSupplier',
                'assignedReviewer',
                'siteEngineer',
                'items.item',
                'approvalHistory',
            ]);
        });
    }

    public function approveRequest(User $executive, PurchaseRequest $request, ?string $comment): PurchaseRequest
    {
        $this->ensurePending($request);

        return DB::transaction(function () use ($executive, $request, $comment): PurchaseRequest {
            $pr = PurchaseRequest::query()->lockForUpdate()->findOrFail($request->id);
            $pr->update([
                'status' => 'PENDING_PROCUREMENT_APPROVAL',
            ]);

            ApprovalHistory::create([
                'target_type' => PurchaseRequest::class,
                'target_id' => $pr->id,
                'actor_user_id' => $executive->id,
                'action' => 'APPROVED_BY_EXECUTIVE',
                'from_state' => self::PENDING_STATUS,
                'to_state' => 'PENDING_PROCUREMENT_APPROVAL',
                'comments' => $comment ?? 'تم اعتماد الطلب من المدير التنفيذي وإرساله للمشتريات.',
            ]);

            app(SystemEventService::class)->recordAction(
                $pr,
                'APPROVED_BY_EXECUTIVE',
                'اعتمد المدير التنفيذي طلب الشراء وأرسله إلى مدير المشتريات.',
                [
                    'event_type' => 'purchase_request.approved_by_executive',
                    'from_state' => self::PENDING_STATUS,
                    'to_state' => 'PENDING_PROCUREMENT_APPROVAL',
                    'actor_user_id' => $executive->id,
                    'metadata' => ['comment' => $comment],
                ]
            );

            app(NotificationService::class)->createNotification(
                $pr->user_id,
                'purchase_request_approved_by_executive',
                'تم اعتماد طلب الشراء تنفيذيًا',
                "اعتمد المدير التنفيذي طلب الشراء {$pr->request_number} وأرسله إلى المشتريات.",
                $pr
            );
            $this->notifyProcurement($pr, 'اعتمد المدير التنفيذي طلب الشراء، وهو بانتظار إجراء مدير المشتريات.');

            return $pr->fresh(['requester', 'department', 'assignedReviewer', 'siteEngineer', 'items.item', 'approvalHistory']);
        });
    }

    public function rejectRequest(User $executive, PurchaseRequest $request, string $comment): PurchaseRequest
    {
        $this->ensurePending($request);

        return DB::transaction(function () use ($executive, $request, $comment): PurchaseRequest {
            $pr = PurchaseRequest::query()->lockForUpdate()->findOrFail($request->id);
            $pr->update([
                'status' => 'REJECTED',
                'rejection_reason' => $comment,
            ]);

            ApprovalHistory::create([
                'target_type' => PurchaseRequest::class,
                'target_id' => $pr->id,
                'actor_user_id' => $executive->id,
                'action' => 'REJECTED_BY_EXECUTIVE',
                'from_state' => self::PENDING_STATUS,
                'to_state' => 'REJECTED',
                'comments' => $comment,
            ]);

            app(SystemEventService::class)->recordAction(
                $pr,
                'REJECTED_BY_EXECUTIVE',
                'رفض المدير التنفيذي طلب الشراء.',
                [
                    'event_type' => 'purchase_request.rejected_by_executive',
                    'from_state' => self::PENDING_STATUS,
                    'to_state' => 'REJECTED',
                    'actor_user_id' => $executive->id,
                ]
            );

            app(NotificationService::class)->createNotification(
                $pr->user_id,
                'purchase_request_rejected_by_executive',
                'تم رفض طلب الشراء تنفيذيًا',
                "رفض المدير التنفيذي طلب الشراء {$pr->request_number}.",
                $pr
            );

            return $pr->fresh(['requester', 'department', 'assignedReviewer', 'siteEngineer', 'items.item', 'approvalHistory']);
        });
    }

    private function ensurePending(PurchaseRequest $request): void
    {
        if ($request->status !== self::PENDING_STATUS) {
            throw new \RuntimeException('الطلب ليس بانتظار قرار المدير التنفيذي.');
        }
    }

    private function notifyProcurement(PurchaseRequest $request, string $message): void
    {
        $notificationService = app(NotificationService::class);
        $procurementManagers = $notificationService->resolveUsersWithPermission('purchase_request.approve_procurement');
        $notificationService->notifyUsers(
            $procurementManagers,
            'purchase_request_pending_procurement',
            'طلب شراء بانتظار المشتريات',
            $message . " رقم الطلب: {$request->request_number}",
            $request
        );
    }
}
