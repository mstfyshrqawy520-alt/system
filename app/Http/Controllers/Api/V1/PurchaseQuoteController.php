<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\PurchaseRequestResource;
use App\Models\PurchaseRequest;
use App\Models\PurchaseRequestQuote;
use App\Services\PurchaseQuoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PurchaseQuoteController extends Controller
{
    public function __construct(
        protected PurchaseQuoteService $service
    ) {}

    public function showForRequest(Request $request, int $purchaseRequestId): PurchaseRequestResource
    {
        $purchaseRequest = PurchaseRequest::with([
            'requester.roles',
            'department',
            'assignedReviewer',
            'siteEngineer',
            'items.item',
            'quotes.supplier',
            'quotes.recommendations.user',
            'selectedQuote.supplier',
        ])->findOrFail($purchaseRequestId);

        return new PurchaseRequestResource($purchaseRequest);
    }

    public function create(Request $request, int $purchaseRequestId): PurchaseRequestResource
    {
        $validated = $request->validate([
            'quotes' => ['required', 'array', 'min:2'],
            'quotes.*.supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'quotes.*.unit_price' => ['nullable', 'numeric', 'gt:0'],
            'quotes.*.total_amount' => ['required', 'numeric', 'gt:0'],
            'quotes.*.notes' => ['nullable', 'string', 'max:2000'],
            'quotes.*.file' => ['nullable', 'file', 'max:25600'],
            'quotes.*.file_path' => ['nullable', 'string', 'max:500'],
            'quotes.*.file_name' => ['nullable', 'string', 'max:255'],
        ]);

        $purchaseRequest = PurchaseRequest::findOrFail($purchaseRequestId);
        return new PurchaseRequestResource(
            $this->service->createQuotes($request->user(), $purchaseRequest, $validated['quotes'])
        );
    }

    public function recommend(Request $request, int $quoteId): PurchaseRequestResource
    {
        $validated = $request->validate([
            'decision' => ['required', 'string', 'in:RECOMMEND,REJECT'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $quote = PurchaseRequestQuote::with('purchaseRequest')->findOrFail($quoteId);
        return new PurchaseRequestResource(
            $this->service->recommend(
                $request->user(),
                $quote,
                $validated['decision'],
                $validated['comment'] ?? null
            )
        );
    }

    public function decide(Request $request, int $quoteId): PurchaseRequestResource
    {
        $validated = $request->validate([
            'decision' => ['required', 'string', 'in:SELECT,REJECT'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $quote = PurchaseRequestQuote::with('purchaseRequest')->findOrFail($quoteId);
        return new PurchaseRequestResource(
            $this->service->decide(
                $request->user(),
                $quote,
                $validated['decision'],
                $validated['comment'] ?? null
            )
        );
    }

    public function supplierQuotes(int $supplierId): JsonResponse
    {
        $quotes = PurchaseRequestQuote::with([
            'purchaseRequest.department',
            'purchaseRequest.requester',
            'purchaseRequest.issuedPurchaseOrders',
        ])
            ->where('supplier_id', $supplierId)
            ->where('status', 'SELECTED')
            ->orderByDesc('selected_at')
            ->orderByDesc('id')
            ->get()
            ->map(function ($quote) {
                return [
                    'id' => $quote->id,
                    'purchase_request_id' => $quote->purchase_request_id,
                    'request_number' => $quote->purchaseRequest?->request_number,
                    'department_name' => $quote->purchaseRequest?->department?->name,
                    'requester_name' => $quote->purchaseRequest?->requester?->name,
                    'unit_price' => $quote->unit_price,
                    'total_amount' => $quote->total_amount,
                    'currency' => $quote->currency,
                    'notes' => $quote->notes,
                    'file_path' => $quote->file_path,
                    'file_name' => $quote->file_name,
                    'file_size' => $quote->file_size,
                    'file_url' => $quote->file_url,
                    'mime_type' => $quote->mime_type,
                    'status' => $quote->status,
                    'selected_at' => $quote->selected_at ? $quote->selected_at->toIso8601String() : null,
                    'created_at' => $quote->created_at ? $quote->created_at->toIso8601String() : null,
                    'po_number' => $quote->purchaseRequest?->issuedPurchaseOrders?->first()?->po_number,
                ];
            });

        return response()->json(['data' => $quotes]);
    }

    public function viewFile(int $id)
    {
        $quote = PurchaseRequestQuote::findOrFail($id);

        if (! $quote->file_path) {
            abort(404, 'لا يوجد ملف مرفق لعرض السعر هذا.');
        }

        if (\Illuminate\Support\Facades\Storage::disk('public')->exists($quote->file_path)) {
            $path = \Illuminate\Support\Facades\Storage::disk('public')->path($quote->file_path);
            $mime = $quote->mime_type ?: (\Illuminate\Support\Facades\Storage::disk('public')->mimeType($quote->file_path) ?: 'application/pdf');
            return response()->file($path, [
                'Content-Type' => $mime,
                'Content-Disposition' => 'inline; filename="' . ($quote->file_name ?: basename($quote->file_path)) . '"',
            ]);
        }

        if (\Illuminate\Support\Facades\Storage::disk('local')->exists($quote->file_path)) {
            $path = \Illuminate\Support\Facades\Storage::disk('local')->path($quote->file_path);
            $mime = $quote->mime_type ?: (\Illuminate\Support\Facades\Storage::disk('local')->mimeType($quote->file_path) ?: 'application/pdf');
            return response()->file($path, [
                'Content-Type' => $mime,
                'Content-Disposition' => 'inline; filename="' . ($quote->file_name ?: basename($quote->file_path)) . '"',
            ]);
        }

        if (filter_var($quote->file_path, FILTER_VALIDATE_URL)) {
            return redirect()->away($quote->file_path);
        }

        abort(404, 'ملف عرض السعر غير موجود على الخادم.');
    }
}
