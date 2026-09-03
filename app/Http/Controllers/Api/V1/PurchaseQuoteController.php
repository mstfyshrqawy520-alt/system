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
        $quotesData = $validated['quotes'];
        foreach ($quotesData as $index => &$quote) {
            if ($request->hasFile("quotes.{$index}.file")) {
                $quote['file'] = $request->file("quotes.{$index}.file");
            }
        }
        unset($quote);

        return new PurchaseRequestResource(
            $this->service->createQuotes($request->user(), $purchaseRequest, $quotesData)
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
            return response(
                $this->renderMissingFileHtml($quote, 'لم يتم إرفاق ملف PDF لعرض السعر هذا.'),
                404,
                ['Content-Type' => 'text/html; charset=UTF-8']
            );
        }

        try {
            return \App\Services\StorageService::streamResponse(
                $quote->file_path,
                $quote->file_name,
                $quote->mime_type ?: 'application/pdf',
                false
            );
        } catch (\Throwable) {
            if (filter_var($quote->file_path, FILTER_VALIDATE_URL)) {
                return redirect()->away($quote->file_path);
            }

            return response(
                $this->renderMissingFileHtml($quote, 'تم تسجيل بيانات العرض بنجاح، لكن ملف الـ PDF الأصلي لم يتم العثور عليه على الخادم أو التخزين السحابي.'),
                404,
                ['Content-Type' => 'text/html; charset=UTF-8']
            );
        }
    }

    public function viewFileByName(string $filename)
    {
        $relativePath = 'quotes/' . $filename;

        try {
            return \App\Services\StorageService::streamResponse(
                $relativePath,
                $filename,
                'application/pdf',
                false
            );
        } catch (\Throwable) {
            abort(404, 'ملف عرض السعر غير موجود.');
        }
    }

    protected function renderMissingFileHtml(PurchaseRequestQuote $quote, string $reason): string
    {
        $fileName = htmlspecialchars($quote->file_name ?: 'عرض سعر غير مسمى');
        $supplierName = htmlspecialchars($quote->supplier?->company_name ?: 'المورد');
        $amount = number_format((float) $quote->total_amount, 2);

        return <<<HTML
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>ملف عرض السعر - {$fileName}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #020617; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; }
    .card { background: #0f172a; border: 1px solid #334155; border-radius: 1.25rem; padding: 2.5rem; max-width: 480px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h2 { color: #38bdf8; margin: 0 0 1rem 0; font-size: 1.25rem; }
    p { color: #94a3b8; font-size: 0.875rem; line-height: 1.6; margin: 0.5rem 0; }
    .details { background: #1e293b; border-radius: 0.75rem; padding: 1rem; margin: 1.5rem 0; text-align: right; font-size: 0.8125rem; }
    .details div { margin: 0.35rem 0; }
    .btn { display: inline-block; background: #0284c7; color: #ffffff; padding: 0.625rem 1.5rem; border-radius: 0.75rem; font-weight: bold; text-decoration: none; transition: background 0.2s; font-size: 0.875rem; }
    .btn:hover { background: #0369a1; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📄⚠️</div>
    <h2>تعذر فتح ملف عرض السعر</h2>
    <p>{$reason}</p>
    <div class="details">
      <div><strong>المورد:</strong> {$supplierName}</div>
      <div><strong>قيمة العرض:</strong> {$amount} ج.م</div>
      <div><strong>اسم الملف المسجل:</strong> {$fileName}</div>
    </div>
    <a class="btn" href="javascript:window.close()">إغلاق هذه النافذة</a>
  </div>
</body>
</html>
HTML;
    }
}
