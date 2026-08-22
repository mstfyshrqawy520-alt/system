<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Accounting\AccountingApprovePoRequest;
use App\Http\Requests\Accounting\AccountingReturnPoRequest;
use App\Http\Resources\PurchaseOrderResource;
use App\Models\PurchaseOrder;
use App\Services\AccountingPurchaseOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AccountingPurchaseOrderController extends Controller
{
    public function __construct(
        protected AccountingPurchaseOrderService $accountingService
    ) {}

    /**
     * Display a listing of Purchase Orders pending accounting review.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min(max((int) $request->query('per_page', 15), 1), 100);
        $pos = $this->accountingService->getAccountingPurchaseOrders($perPage);

        return PurchaseOrderResource::collection($pos);
    }

    /**
     * Display specific Purchase Order details for accounting review.
     */
    public function show(Request $request, int $id): PurchaseOrderResource
    {
        $po = PurchaseOrder::with(['purchaseRequest.requester', 'purchaseRequest.department', 'purchaseRequest.assignedReviewer', 'purchaseRequest.approvalHistory.actor', 'supplier', 'createdBy', 'accountingReviewer', 'items.item', 'approvalHistory.actor'])
            ->findOrFail($id);

        return new PurchaseOrderResource($po);
    }

    /**
     * Prohibited: Accountant has read-only access in Stage 3 scope.
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        return response()->json([
            'message' => 'Prohibited action: Accountant has read-only access. Approval is not allowed.',
        ], 403);
    }

    /**
     * Prohibited: Accountant has read-only access in Stage 3 scope.
     */
    public function returnToProcurement(Request $request, int $id): JsonResponse
    {
        return response()->json([
            'message' => 'Prohibited action: Accountant has read-only access. Returning PO is not allowed.',
        ], 403);
    }
}
