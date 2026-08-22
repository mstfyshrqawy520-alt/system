<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\SystemEventResource;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\SystemEvent;
use App\Models\PurchaseReceipt;
use App\Models\SupplierInvoice;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SystemEventController extends Controller
{
    public function purchaseRequest(Request $request, int $id)
    {
        $purchaseRequest = PurchaseRequest::query()->findOrFail($id);
        abort_unless($this->canViewPurchaseRequest($request, $purchaseRequest), Response::HTTP_FORBIDDEN);

        $events = SystemEvent::query()
            ->with('actor:id,name,email')
            ->where('entity_type', PurchaseRequest::class)
            ->where('entity_id', $purchaseRequest->id)
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->limit(200)
            ->get();

        return SystemEventResource::collection($events);
    }

    public function myArchive(Request $request)
    {
        $events = SystemEvent::query()
            ->with('actor:id,name,email')
            ->where('actor_user_id', $request->user()->id)
            ->whereIn('entity_type', [
                PurchaseRequest::class,
                PurchaseOrder::class,
                PurchaseReceipt::class,
                SupplierInvoice::class,
            ])
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->paginate(min(max((int) $request->query('per_page', 25), 1), 100));

        return SystemEventResource::collection($events);
    }

    public function purchaseOrder(Request $request, int $id)
    {
        $purchaseOrder = PurchaseOrder::query()->findOrFail($id);
        abort_unless($this->canViewPurchaseOrder($request, $purchaseOrder), Response::HTTP_FORBIDDEN);

        $events = SystemEvent::query()
            ->with('actor:id,name,email')
            ->where('entity_type', PurchaseOrder::class)
            ->where('entity_id', $purchaseOrder->id)
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->limit(200)
            ->get();

        return SystemEventResource::collection($events);
    }

    private function canViewPurchaseRequest(Request $request, PurchaseRequest $purchaseRequest): bool
    {
        $user = $request->user();
        if (!$user) {
            return false;
        }

        if ($user->hasRole('admin') || $user->hasRole('procurement_manager')) {
            return true;
        }

        if ($user->hasRole('employee')) {
            return (int) $purchaseRequest->user_id === (int) $user->id;
        }

        if ($user->hasRole('reviewer')) {
            return (int) $purchaseRequest->reviewer_user_id === (int) $user->id
                || ((int) $purchaseRequest->reviewer_user_id === 0
                    && (int) $purchaseRequest->department_id === (int) $user->department_id);
        }

        return false;
    }

    private function canViewPurchaseOrder(Request $request, PurchaseOrder $purchaseOrder): bool
    {
        $user = $request->user();
        if (!$user) {
            return false;
        }

        return $user->hasRole('admin')
            || $user->hasRole('procurement_manager')
            || $user->hasRole('accountant')
            || $user->hasRole('general_manager');
    }
}
