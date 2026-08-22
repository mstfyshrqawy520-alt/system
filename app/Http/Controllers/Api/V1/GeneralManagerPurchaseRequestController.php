<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\PurchaseRequestResource;
use App\Services\GeneralManagerPurchaseRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class GeneralManagerPurchaseRequestController extends Controller
{
    public function __construct(
        protected GeneralManagerPurchaseRequestService $service
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min((int) $request->query('per_page', 20), 100);
        return PurchaseRequestResource::collection($this->service->getPendingRequests($perPage));
    }

    public function show(Request $request, int $id): PurchaseRequestResource
    {
        return new PurchaseRequestResource($this->service->getPendingRequest($id));
    }

    public function update(Request $request, int $id): PurchaseRequestResource
    {
        $validated = $request->validate([
            'priority' => ['sometimes', 'string', 'in:LOW,NORMAL,HIGH,URGENT'],
            'date_needed' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'comment' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'items' => ['sometimes', 'array', 'min:1'],
            'items.*.item_id' => ['nullable', 'integer', 'exists:items,id'],
            'items.*.item_description' => ['required_with:items', 'string', 'max:255'],
            'items.*.item_reference' => ['required_with:items', 'string', 'max:100'],
            'items.*.region' => ['required_with:items', 'string', 'max:150'],
            'items.*.quantity' => ['required_with:items', 'numeric', 'gt:0'],
            'items.*.uom' => ['nullable', 'string', 'max:20'],
            'items.*.specifications' => ['nullable', 'string'],
            'items.*.notes' => ['nullable', 'string'],
        ]);

        return new PurchaseRequestResource(
            $this->service->updateRequest($request->user(), $this->service->getPendingRequest($id), $validated)
        );
    }

    public function approve(Request $request, int $id): PurchaseRequestResource
    {
        $validated = $request->validate([
            'comment' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        return new PurchaseRequestResource(
            $this->service->approveRequest(
                $request->user(),
                $this->service->getPendingRequest($id),
                $validated['comment'] ?? null
            )
        );
    }

    public function reject(Request $request, int $id): PurchaseRequestResource
    {
        $validated = $request->validate([
            'comment' => ['required', 'string', 'min:2', 'max:2000'],
        ]);

        return new PurchaseRequestResource(
            $this->service->rejectRequest(
                $request->user(),
                $this->service->getPendingRequest($id),
                $validated['comment']
            )
        );
    }
}
