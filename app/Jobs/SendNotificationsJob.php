<?php

namespace App\Jobs;

use App\Models\PurchaseReceipt;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendNotificationsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Queue notifications only after the surrounding transaction commits.
     */
    public bool $afterCommit = true;

    /**
     * @param array<int> $recipientIds
     */
    public function __construct(
        public array $recipientIds,
        public string $type,
        public string $title,
        public string $message,
        public Model $notifiable,
        public ?PurchaseReceipt $purchaseReceipt = null,
    ) {
    }

    public function handle(NotificationService $notificationService): void
    {
        if ($this->purchaseReceipt !== null) {
            $notificationService->notifyAccountingWithPurchaseOrderAndReceipt(
                $this->recipientIds,
                $this->notifiable,
                $this->purchaseReceipt,
            );

            return;
        }

        $notificationService->notifyUsers(
            $this->recipientIds,
            $this->type,
            $this->title,
            $this->message,
            $this->notifiable,
        );
    }
}
