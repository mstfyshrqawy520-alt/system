<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\PurchaseRequestResource;
use App\Models\PurchaseRequest;
use App\Models\PurchaseRequestQuote;
use App\Services\PurchaseQuoteService;
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
}
