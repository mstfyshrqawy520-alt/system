<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reviewer\ReviewerAddItemRequest;
use App\Http\Requests\Reviewer\ReviewerApproveRequest;
use App\Http\Requests\Reviewer\ReviewerRejectRequest;
use App\Http\Requests\Reviewer\ReviewerUpdateHeaderRequest;
use App\Http\Requests\Reviewer\ReviewerUpdateItemRequest;
use App\Http\Resources\PurchaseRequestResource;
use App\Models\PurchaseRequest;
use App\Models\PurchaseRequestItem;
use App\Services\ReviewerPurchaseRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ReviewerPurchaseRequestController extends Controller
{
    public function __construct(
        protected ReviewerPurchaseRequestService $reviewerService
    ) {}

    /**
     * Display a listing of reviewable purchase requests for the reviewer.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'request_number' => ['nullable', 'string', 'max:35'],
            'requester_name' => ['nullable', 'string', 'max:150'],
            'status' => ['nullable', Rule::in([
                'SUBMITTED', 'UNDER_REVIEW',
                'PENDING_PROCUREMENT_APPROVAL', 'APPROVED_BY_REVIEWER', 'APPROVED_BY_PROCUREMENT', 'REJECTED',
            ])],
            'priority' => ['nullable', Rule::in(['LOW', 'NORMAL', 'HIGH', 'URGENT'])],
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date', 'after_or_equal:from_date'],
        ]);

        $prs = $this->reviewerService->getReviewableRequests($request->user(), $filters);

        return PurchaseRequestResource::collection($prs);
    }

    /**
     * Display a specific purchase request for review.
     */
    public function show(Request $request, int $id): JsonResponse|PurchaseRequestResource
    {
        $pr = PurchaseRequest::with([
            'requester',
            'department',
            'targetDepartment.manager',
            'targetDepartment.siteEngineer',
            'assignedReviewer',
            'siteEngineer',
            'items.item',
            'approvalHistory.actor',
        ])->findOrFail($id);

        if (! $this->reviewerService->canUserReviewRequest($request->user(), $pr)) {
            return response()->json(['message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'], 403);
        }

        return new PurchaseRequestResource($pr);
    }

    /**
     * Start/enter review process on a submitted purchase request.
     */
    public function startReview(Request $request, int $id): JsonResponse|PurchaseRequestResource
    {
        $pr = PurchaseRequest::findOrFail($id);

        if (! $this->reviewerService->canUserReviewRequest($request->user(), $pr)) {
            return response()->json(['message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'], 403);
        }

        if ($pr->status !== 'SUBMITTED' && $pr->status !== 'UNDER_REVIEW') {
            return response()->json(['message' => 'Invalid purchase request status for starting review.'], 409);
        }

        $reviewedPr = $this->reviewerService->startReview($request->user(), $pr);

        return new PurchaseRequestResource($reviewedPr);
    }

    /**
     * Directly update header fields on a purchase request.
     */
    public function updateHeader(ReviewerUpdateHeaderRequest $request, int $id): JsonResponse|PurchaseRequestResource
    {
        $pr = PurchaseRequest::findOrFail($id);

        if (! $this->reviewerService->canUserReviewRequest($request->user(), $pr)) {
            return response()->json(['message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'], 403);
        }

        if (! $pr->isEditableByReviewer()) {
            return response()->json(['message' => 'لا يمكن للمراجع تعديل الطلب بعد اعتماده وإرساله إلى المرحلة التالية.'], 409);
        }

        $updatedPr = $this->reviewerService->updateHeader($request->user(), $pr, $request->validated());

        return new PurchaseRequestResource($updatedPr);
    }

    /**
     * Directly update a line item on a purchase request.
     */
    public function updateItem(ReviewerUpdateItemRequest $request, int $id, int $itemId): JsonResponse|PurchaseRequestResource
    {
        $pr = PurchaseRequest::findOrFail($id);
        $item = PurchaseRequestItem::findOrFail($itemId);

        if (! $this->reviewerService->canUserReviewRequest($request->user(), $pr)) {
            return response()->json(['message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'], 403);
        }

        if ($item->purchase_request_id !== $pr->id) {
            return response()->json(['message' => 'Item does not belong to this purchase request.'], 422);
        }

        if (! $pr->isEditableByReviewer()) {
            return response()->json(['message' => 'لا يمكن للمراجع تعديل الطلب بعد اعتماده وإرساله إلى المرحلة التالية.'], 409);
        }

        $updatedPr = $this->reviewerService->updateLineItem($request->user(), $pr, $item, $request->validated());

        return new PurchaseRequestResource($updatedPr);
    }

    /**
     * Add a new line item to a purchase request during review.
     */
    public function addItem(ReviewerAddItemRequest $request, int $id): JsonResponse|PurchaseRequestResource
    {
        $pr = PurchaseRequest::findOrFail($id);

        if (! $this->reviewerService->canUserReviewRequest($request->user(), $pr)) {
            return response()->json(['message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'], 403);
        }

        if (! $pr->isEditableByReviewer()) {
            return response()->json(['message' => 'لا يمكن للمراجع تعديل الطلب بعد اعتماده وإرساله إلى المرحلة التالية.'], 409);
        }

        $updatedPr = $this->reviewerService->addLineItem($request->user(), $pr, $request->validated());

        return new PurchaseRequestResource($updatedPr);
    }

    /**
     * Remove a line item from a purchase request during review.
     */
    public function deleteItem(Request $request, int $id, int $itemId): JsonResponse|PurchaseRequestResource
    {
        $pr = PurchaseRequest::findOrFail($id);
        $item = PurchaseRequestItem::findOrFail($itemId);

        if (! $this->reviewerService->canUserReviewRequest($request->user(), $pr)) {
            return response()->json(['message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'], 403);
        }

        if ($item->purchase_request_id !== $pr->id) {
            return response()->json(['message' => 'Item does not belong to this purchase request.'], 422);
        }

        if (! $pr->isEditableByReviewer()) {
            return response()->json(['message' => 'لا يمكن للمراجع تعديل الطلب بعد اعتماده وإرساله إلى المرحلة التالية.'], 409);
        }

        $updatedPr = $this->reviewerService->deleteLineItem($request->user(), $pr, $item);

        return new PurchaseRequestResource($updatedPr);
    }

    /**
     * Approve purchase request.
     */
    public function approve(ReviewerApproveRequest $request, int $id): JsonResponse
    {
        $pr = PurchaseRequest::with('items')->findOrFail($id);

        if (! $this->reviewerService->canUserReviewRequest($request->user(), $pr)) {
            return response()->json(['message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'], 403);
        }

        if ($pr->status !== 'UNDER_REVIEW' && $pr->status !== 'SUBMITTED') {
            return response()->json(['message' => 'Only pending purchase requests can be approved.'], 409);
        }

        $approvedPr = $this->reviewerService->approveRequest(
            $request->user(),
            $pr,
            $request->validated('comment'),
            $request->validated('site_engineer_user_id')
        );

        return response()->json([
            'message' => 'Purchase request approved successfully.',
            'data' => new PurchaseRequestResource($approvedPr),
        ], 200);
    }

    /**
     * Reject purchase request.
     */
    public function reject(ReviewerRejectRequest $request, int $id): JsonResponse
    {
        $pr = PurchaseRequest::findOrFail($id);

        if (! $this->reviewerService->canUserReviewRequest($request->user(), $pr)) {
            return response()->json(['message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'], 403);
        }

        if ($pr->status !== 'UNDER_REVIEW' && $pr->status !== 'SUBMITTED') {
            return response()->json(['message' => 'Only pending purchase requests can be rejected.'], 409);
        }

        $rejectedPr = $this->reviewerService->rejectRequest(
            $request->user(),
            $pr,
            $request->validated('comment')
        );

        return response()->json([
            'message' => 'Purchase request rejected successfully.',
            'data' => new PurchaseRequestResource($rejectedPr),
        ], 200);
    }

}
