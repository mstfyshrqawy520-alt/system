<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\PurchaseOrder;
use App\Models\PurchaseReceipt;
use App\Models\PurchaseRequest;
use App\Models\SupplierInvoice;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class NotificationService
{
    /**
     * Resolve users holding a specific permission, optionally filtered by department.
     */
    public function resolveUsersWithPermission(string $permissionSlug, ?int $departmentId = null): Collection
    {
        $query = User::where('is_active', true);

        if ($departmentId !== null) {
            // First check departmental scope
            $deptUsers = (clone $query)->where('department_id', $departmentId)->get()
                ->filter(fn (User $u) => $u->hasPermission($permissionSlug));

            if ($deptUsers->isNotEmpty()) {
                return $deptUsers->values();
            }
        }

        // Fallback to global active users with permission
        return $query->get()
            ->filter(fn (User $u) => $u->hasPermission($permissionSlug))
            ->values();
    }

    /**
     * Create single notification for a recipient preventing duplicates.
     */
    private function isProcurementNotifiable(Model $notifiable): bool
    {
        return in_array(get_class($notifiable), [
            PurchaseRequest::class,
            PurchaseOrder::class,
            PurchaseReceipt::class,
            SupplierInvoice::class,
        ], true);
    }

    private function procurementNotifiableTypes(): array
    {
        return [
            PurchaseRequest::class,
            PurchaseOrder::class,
            PurchaseReceipt::class,
            SupplierInvoice::class,
        ];
    }

    public function createNotification(User|int $recipient, string $type, string $title, string $message, Model $notifiable): ?Notification
    {
        if (! $this->isProcurementNotifiable($notifiable)) {
            return null;
        }

        $userId = $recipient instanceof User ? $recipient->id : $recipient;

        return Notification::firstOrCreate(
            [
                'user_id' => $userId,
                'type' => $type,
                'notifiable_type' => get_class($notifiable),
                'notifiable_id' => $notifiable->getKey(),
            ],
            [
                'title' => $title,
                'message' => $message,
                'read_at' => null,
            ]
        );
    }

    /**
     * Create notifications for multiple recipients.
     */
    public function notifyUsers(iterable $recipients, string $type, string $title, string $message, Model $notifiable): void
    {
        foreach ($recipients as $recipient) {
            $this->createNotification($recipient, $type, $title, $message, $notifiable);
        }
    }

    /**
     * Send one Accounting notification that carries both the PO and its approved receipt.
     */
    public function notifyAccountingWithPurchaseOrderAndReceipt(iterable $recipients, PurchaseOrder $purchaseOrder, PurchaseReceipt $purchaseReceipt): void
    {
        foreach ($recipients as $recipient) {
            $userId = $recipient instanceof User ? $recipient->id : (int) $recipient;
            Notification::firstOrCreate(
                [
                    'user_id' => $userId,
                    'type' => 'purchase_order_and_receipt_ready_accounting',
                    'notifiable_type' => PurchaseOrder::class,
                    'notifiable_id' => $purchaseOrder->id,
                    'purchase_order_id' => $purchaseOrder->id,
                    'purchase_receipt_id' => $purchaseReceipt->id,
                ],
                [
                    'title' => 'أمر الشراء وإذن الاستلام جاهزان للحسابات',
                    'message' => "أمر الشراء {$purchaseOrder->po_number} وإذن الاستلام {$purchaseReceipt->receipt_number} مرتبطان بنفس العملية. افتح الرسالة لمراجعة المستندين واستكمال فاتورة المورد.",
                    'purchase_order_id' => $purchaseOrder->id,
                    'purchase_receipt_id' => $purchaseReceipt->id,
                    'read_at' => null,
                ]
            );
        }
    }

    /**
     * Get paginated notifications for user.
     */
    public function getUserNotifications(User $user, int $perPage = 15): LengthAwarePaginator
    {
        return Notification::where('user_id', $user->id)
            ->whereIn('notifiable_type', $this->procurementNotifiableTypes())
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get count of unread notifications for user.
     */
    public function getUnreadCount(User $user): int
    {
        return Notification::where('user_id', $user->id)
            ->whereIn('notifiable_type', $this->procurementNotifiableTypes())
            ->whereNull('read_at')
            ->count();
    }

    /**
     * Mark single notification as read.
     */
    public function markAsRead(User $user, Notification $notification): Notification
    {
        if ($notification->user_id !== $user->id) {
            throw new AuthorizationException('This notification belongs to another user.');
        }

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return $notification;
    }

    /**
     * Mark all notifications belonging to user as read.
     */
    public function markAllAsRead(User $user): int
    {
        return Notification::where('user_id', $user->id)
            ->whereIn('notifiable_type', $this->procurementNotifiableTypes())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }
}
