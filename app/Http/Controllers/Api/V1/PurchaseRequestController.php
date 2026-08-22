<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PurchaseRequest\StorePurchaseRequestRequest;
use App\Http\Requests\PurchaseRequest\UpdatePurchaseRequestRequest;
use App\Http\Resources\PurchaseRequestResource;
use App\Models\Attachment;
use App\Models\Department;
use App\Models\PurchaseRequest;
use App\Models\User;
use App\Services\PurchaseRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;

class PurchaseRequestController extends Controller
{
    public function __construct(
        protected PurchaseRequestService $purchaseRequestService
    ) {}

    /**
     * Display a listing of own Purchase Requests for the authenticated employee.
     */
    public function reviewerOptions(Request $request): JsonResponse
    {
        $reviewers = User::query()
            ->where('is_active', true)
            ->whereHas('roles', fn ($query) => $query->where('slug', 'reviewer'))
            ->with('department:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'department_id']);

        return response()->json([
            'data' => $reviewers->map(fn (User $reviewer) => [
                'id' => $reviewer->id,
                'name' => $reviewer->name,
                'email' => $reviewer->email,
                'department_id' => $reviewer->department_id,
                'department_name' => $reviewer->department?->name,
            ])->values(),
        ]);
    }

    public function departmentOptions(Request $request): JsonResponse
    {
        $departments = Department::query()
            ->where('is_active', true)
            ->with(['manager:id,name,email,department_id', 'siteEngineer:id,name,email,department_id'])
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'manager_user_id', 'site_engineer_user_id'])
            ->map(fn (Department $department) => [
                'id' => $department->id,
                'name' => $department->name,
                'code' => $department->code,
                'manager' => $department->manager ? ['id' => $department->manager->id, 'name' => $department->manager->name] : null,
                'site_engineer' => $department->siteEngineer ? ['id' => $department->siteEngineer->id, 'name' => $department->siteEngineer->name] : null,
            ])->values();

        return response()->json(['data' => $departments]);
    }

    public function siteEngineerOptions(Request $request): JsonResponse
    {
        $engineers = User::query()
            ->where('is_active', true)
            ->whereHas('roles', fn ($query) => $query->where('slug', 'site_engineer'))
            ->with('department:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'department_id']);

        return response()->json([
            'data' => $engineers->map(fn (User $engineer) => [
                'id' => $engineer->id,
                'name' => $engineer->name,
                'email' => $engineer->email,
                'department_id' => $engineer->department_id,
                'department_name' => $engineer->department?->name,
            ])->values(),
        ]);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min((int) $request->query('per_page', 15), 100);
        $requests = $this->purchaseRequestService->getOwnRequests($request->user(), $perPage);

        return PurchaseRequestResource::collection($requests);
    }

    /**
     * Store a newly created draft Purchase Request in storage.
     */
    public function store(StorePurchaseRequestRequest $request): JsonResponse
    {
        $pr = $this->purchaseRequestService->createRequest(
            $request->user(),
            $request->validated()
        );

        return (new PurchaseRequestResource($pr))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified Purchase Request.
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
            'attachments.uploadedBy',
        ])->findOrFail($id);

        if ($pr->user_id !== $request->user()->id) {
            return response()->json([
                'message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
            ], 403);
        }

        return new PurchaseRequestResource($pr);
    }

    /**
     * Update the specified draft or returned Purchase Request.
     */
    public function update(UpdatePurchaseRequestRequest $request, int $id): JsonResponse|PurchaseRequestResource
    {
        $pr = PurchaseRequest::findOrFail($id);

        if ($pr->user_id !== $request->user()->id) {
            return response()->json([
                'message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
            ], 403);
        }

        if (! $pr->isEditableByRequester()) {
            return response()->json([
                'message' => 'لا يمكن تعديل طلب الشراء بعد اعتماد المراجع.',
            ], 409);
        }

        $updatedPr = $this->purchaseRequestService->updateRequest(
            $request->user(),
            $pr,
            $request->validated()
        );

        return new PurchaseRequestResource($updatedPr);
    }

    /**
     * Remove the specified draft Purchase Request from storage.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $pr = PurchaseRequest::findOrFail($id);

        if ($pr->user_id !== $request->user()->id) {
            return response()->json([
                'message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
            ], 403);
        }

        if ($pr->status !== 'DRAFT') {
            return response()->json([
                'message' => 'لا يمكن حذف طلب الشراء إلا إذا كانت حالته مسودة. تم إرسال هذا الطلب للمراجعة أو دخل مرحلة معالجة.',
            ], 409);
        }

        $this->purchaseRequestService->deleteRequest($request->user(), $pr);

        return response()->json([
            'message' => 'Purchase request deleted successfully.',
        ], 200);
    }

    /**
     * Submit a draft Purchase Request for review.
     */
    public function submit(Request $request, int $id): JsonResponse
    {
        $pr = PurchaseRequest::with('items')->findOrFail($id);

        if ($pr->user_id !== $request->user()->id) {
            return response()->json([
                'message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
            ], 403);
        }

        if ($pr->status !== 'DRAFT') {
            return response()->json([
                'message' => 'Only draft purchase requests can be submitted.',
            ], 409);
        }

        $submittedPr = $this->purchaseRequestService->submitRequest($request->user(), $pr);

        return response()->json([
            'message' => 'Purchase request submitted successfully.',
            'data' => new PurchaseRequestResource($submittedPr),
        ], 200);
    }

    /**
     * Upload an attachment to a Purchase Request.
     */
    public function attachmentUpload(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'file' => [
                'required',
                'file',
                'max:10240', // 10 MB
                'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,gif',
            ],
        ]);

        $pr = PurchaseRequest::findOrFail($id);

        if ($pr->user_id !== $request->user()->id) {
            return response()->json(['message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'], 403);
        }

        if ($pr->status !== 'DRAFT') {
            return response()->json([
                'message' => 'Attachments can only be added to draft purchase requests.',
            ], 409);
        }

        $file = $request->file('file');
        $path = $file->store("attachments/pr/{$id}", 'local');

        $attachment = Attachment::create([
            'attachable_type' => PurchaseRequest::class,
            'attachable_id' => $pr->id,
            'uploaded_by_user_id' => $request->user()->id,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
        ]);

        $attachment->load('uploadedBy');

        return response()->json([
            'message' => 'Attachment uploaded successfully.',
            'data' => [
                'id' => $attachment->id,
                'file_name' => $attachment->file_name,
                'mime_type' => $attachment->mime_type,
                'file_size' => $attachment->file_size,
                'uploaded_by' => $attachment->uploadedBy?->name,
                'created_at' => $attachment->created_at->toIso8601String(),
            ],
        ], 201);
    }

    /**
     * Delete an attachment from a Purchase Request.
     */
    public function attachmentDelete(Request $request, int $prId, int $attachmentId): JsonResponse
    {
        $pr = PurchaseRequest::findOrFail($prId);

        if ($pr->user_id !== $request->user()->id) {
            return response()->json(['message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'], 403);
        }

        $attachment = Attachment::where('id', $attachmentId)
            ->where('attachable_type', PurchaseRequest::class)
            ->where('attachable_id', $pr->id)
            ->firstOrFail();

        Storage::disk('local')->delete($attachment->file_path);
        $attachment->delete();

        return response()->json(['message' => 'Attachment deleted successfully.']);
    }

    /**
     * Download an attachment.
     */
    public function attachmentDownload(Request $request, int $prId, int $attachmentId)
    {
        $pr = PurchaseRequest::findOrFail($prId);

        if ($pr->user_id !== $request->user()->id) {
            return response()->json(['message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'], 403);
        }

        $attachment = Attachment::where('id', $attachmentId)
            ->where('attachable_type', PurchaseRequest::class)
            ->where('attachable_id', $pr->id)
            ->firstOrFail();

        return Storage::disk('local')->download($attachment->file_path, $attachment->file_name);
    }
}
