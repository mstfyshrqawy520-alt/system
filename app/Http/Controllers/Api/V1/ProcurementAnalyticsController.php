<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\Supplier;
use App\Models\User;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ProcurementAnalyticsController extends Controller
{
    private const ORDER_STATUSES = [
        'PO_DRAFT',
        'PENDING_ACCOUNTING_REVIEW',
        'RETURNED_TO_PROCUREMENT',
        'ISSUED',
        'APPROVED_BY_ACCOUNTING',
        'FINAL_APPROVED',
        'REJECTED',
    ];

    public function index(Request $request): JsonResponse
    {
        $period = (string) $request->query('period', '90');
        $status = $request->query('status');

        $cacheKey = 'procurement:analytics:v2:' . $period . ':' . ($status ?: 'all');

        if (Cache::has($cacheKey)) {

            return response()->json(Cache::get($cacheKey));

        }
        $cutoff = $this->resolveCutoffDate($period);

        // الاستعلام الأساسي للتحليلات يقرأ الحقول التجميعية فقط؛ العلاقات التفصيلية
        // تُحمّل لآخر الأوامر المعروضة فقط، وليس لكل أوامر الفترة.
        $basePurchaseOrderQuery = PurchaseOrder::query()
            ->select(['id', 'po_number', 'purchase_request_id', 'supplier_id', 'created_by_user_id', 'status', 'grand_total', 'delivery_status', 'delivery_date', 'actual_delivery_date', 'created_at', 'updated_at'])
            ->when($cutoff !== null, fn ($query) => $query->where('created_at', '>=', $cutoff));

        $filteredPurchaseOrderQuery = clone $basePurchaseOrderQuery;
        if (is_string($status) && in_array($status, self::ORDER_STATUSES, true)) {
            $filteredPurchaseOrderQuery->where('status', $status);
        }

        $filteredPurchaseOrders = $filteredPurchaseOrderQuery
            ->with(['purchaseRequest.department', 'supplier', 'createdBy.department', 'items'])
            ->orderByDesc('updated_at')
            ->limit(10)
            ->get();

        $approvedRequestQuery = PurchaseRequest::query()
            ->with(['requester', 'department'])
            ->whereIn('status', ['PENDING_PROCUREMENT_APPROVAL', 'APPROVED_BY_PROCUREMENT'])
            ->when($cutoff !== null, fn ($query) => $query->where('created_at', '>=', $cutoff));

        $approvedRequests = $approvedRequestQuery
            ->orderByDesc('updated_at')
            ->limit(8)
            ->get();

        $allOrderRows = (clone $basePurchaseOrderQuery)->get();
        $basePurchaseRequestQuery = PurchaseRequest::query()
            ->select(['id', 'status', 'created_at'])
            ->when($cutoff !== null, fn ($query) => $query->where('created_at', '>=', $cutoff));
        $allRequestRows = (clone $basePurchaseRequestQuery)->get();

        $supplierLookup = Supplier::query()
            ->whereIn('id', $allOrderRows->pluck('supplier_id')->filter()->unique()->values())
            ->get(['id', 'company_name', 'code', 'is_active'])
            ->keyBy('id');
        $purchaseRequestLookup = PurchaseRequest::query()
            ->whereIn('id', $allOrderRows->pluck('purchase_request_id')->filter()->unique()->values())
            ->with('department')
            ->get(['id', 'department_id', 'submitted_at'])
            ->keyBy('id');
        $creatorLookup = User::query()
            ->whereIn('id', $allOrderRows->pluck('created_by_user_id')->filter()->unique()->values())
            ->with('department')
            ->get(['id', 'department_id'])
            ->keyBy('id');
        $totalValue = (float) $allOrderRows->sum(fn (PurchaseOrder $po) => (float) $po->grand_total);
        $completedDeliveries = $allOrderRows->filter(fn (PurchaseOrder $po) => $po->delivery_status === 'COMPLETE');
        $onTimeDeliveries = $completedDeliveries->filter(fn (PurchaseOrder $po) => $po->delivery_date && $po->actual_delivery_date && $po->actual_delivery_date->lte($po->delivery_date));
        $cycleDurationsInDays = $allOrderRows->map(function (PurchaseOrder $po) use ($purchaseRequestLookup) {
            $submittedAt = $purchaseRequestLookup->get($po->purchase_request_id)?->submitted_at;
            if (!$submittedAt || !$po->created_at) return null;
            return max(0, $submittedAt->diffInHours($po->created_at) / 24);
        })->filter(fn ($days) => $days !== null);
        $averagePoCycleDays = $cycleDurationsInDays->count() > 0 ? $cycleDurationsInDays->avg() : 0;
        $onTimeDeliveryRate = $completedDeliveries->count() > 0 ? ($onTimeDeliveries->count() / $completedDeliveries->count()) * 100 : 0;

        $statusBreakdown = $allOrderRows
            ->groupBy('status')
            ->map(function ($rows, string $orderStatus) {
                return [
                    'status' => $orderStatus,
                    'count' => $rows->count(),
                    'total_value' => number_format((float) $rows->sum(fn (PurchaseOrder $po) => (float) $po->grand_total), 2, '.', ''),
                ];
            })
            ->sortBy(function (array $item) {
                return array_search($item['status'], self::ORDER_STATUSES, true);
            })
            ->values();

                $requestStatusBreakdown = $allRequestRows
            ->groupBy('status')
            ->map(fn ($rows, string $requestStatus) => [
                'status' => $requestStatus,
                'count' => $rows->count(),
            ])
            ->values();

        $deliveryBreakdown = $allOrderRows
            ->groupBy(fn (PurchaseOrder $po) => $po->delivery_status ?: 'PENDING')
            ->map(fn ($rows, string $deliveryStatus) => [
                'status' => $deliveryStatus,
                'count' => $rows->count(),
                'total_value' => number_format((float) $rows->sum(fn (PurchaseOrder $po) => (float) $po->grand_total), 2, '.', ''),
            ])
            ->values();

        $supplierBreakdown = $allOrderRows
            ->groupBy('supplier_id')
            ->map(function ($rows) use ($supplierLookup) {
                $supplier = $supplierLookup->get($rows->first()?->supplier_id);

                return [
                    'supplier_id' => $supplier?->id,
                    'company_name' => $supplier?->company_name,
                    'code' => $supplier?->code,
                    'is_active' => (bool) ($supplier?->is_active ?? false),
                    'count' => $rows->count(),
                    'total_value' => number_format((float) $rows->sum(fn (PurchaseOrder $po) => (float) $po->grand_total), 2, '.', ''),
                ];
            })
            ->sortByDesc(fn (array $item) => (float) $item['total_value'])
            ->take(6)
            ->values();

        $departmentForPo = function (PurchaseOrder $po) use ($purchaseRequestLookup, $creatorLookup) {
            return $purchaseRequestLookup->get($po->purchase_request_id)?->department
                ?? $creatorLookup->get($po->created_by_user_id)?->department;
        };
        $poDeptName = function (PurchaseOrder $po) use ($departmentForPo) {
            return $departmentForPo($po)?->name ?? 'غير محدد';
        };

        $departmentBreakdown = $allOrderRows
            ->groupBy(function (PurchaseOrder $po) use ($purchaseRequestLookup, $creatorLookup): int {
                return $purchaseRequestLookup->get($po->purchase_request_id)?->department_id
                    ?? $creatorLookup->get($po->created_by_user_id)?->department_id
                    ?? 0;
            })
            ->map(function ($rows) use ($departmentForPo) {
                $department = $departmentForPo($rows->first());

                return [
                    'department_id' => $department?->id,
                    'name' => $department?->name ?? 'غير محدد',
                    'code' => $department?->code ?? 'N/A',
                    'count' => $rows->count(),
                    'total_value' => number_format((float) $rows->sum(fn (PurchaseOrder $po) => (float) $po->grand_total), 2, '.', ''),
                ];
            })
            ->sortByDesc(fn (array $item) => (float) $item['total_value'])
            ->values();

        // Use Eloquent boolean predicates instead of `is_active = 1`, which is
        // not valid for PostgreSQL boolean columns.
        $supplierCount = Supplier::query()->count();
        $activeSupplierCount = Supplier::query()->where('is_active', true)->count();

        $pendingProcurementCount = $allRequestRows->where('status', 'PENDING_PROCUREMENT_APPROVAL')->count();
        $draftCount = $allOrderRows->where('status', 'PO_DRAFT')->count();
        $pendingAccountingCount = $allOrderRows->where('status', 'PENDING_ACCOUNTING_REVIEW')->count();
        $returnedCount = $allOrderRows->where('status', 'RETURNED_TO_PROCUREMENT')->count();
        $accountingApprovedCount = $allOrderRows->where('status', 'APPROVED_BY_ACCOUNTING')->count();

        $payload = [
            'filters' => [
                'period' => $period,
                'status' => is_string($status) && in_array($status, self::ORDER_STATUSES, true) ? $status : null,
            ],
            'metrics' => [
                'purchase_requests_count' => $allRequestRows->count(),
                'approved_requests_count' => $allRequestRows->whereIn('status', ['PENDING_PROCUREMENT_APPROVAL', 'APPROVED_BY_PROCUREMENT'])->count(),
                'draft_request_count' => $allRequestRows->where('status', 'DRAFT')->count(),
                'submitted_request_count' => $allRequestRows->where('status', 'SUBMITTED')->count(),
                'under_review_request_count' => $allRequestRows->where('status', 'UNDER_REVIEW')->count(),
                'rejected_request_count' => $allRequestRows->where('status', 'REJECTED')->count(),
                'pending_procurement_count' => $pendingProcurementCount,

                'purchase_orders_count' => $allOrderRows->count(),
                'draft_count' => $draftCount,
                'pending_accounting_count' => $pendingAccountingCount,
                'returned_count' => $returnedCount,
                'accounting_approved_count' => $accountingApprovedCount,
                'completed_delivery_count' => $completedDeliveries->count(),
                'late_delivery_count' => $allOrderRows->where('delivery_status', 'LATE')->count(),
                'on_time_delivery_count' => $onTimeDeliveries->count(),
                'on_time_delivery_rate' => number_format($onTimeDeliveryRate, 2, '.', ''),
                'average_po_cycle_days' => number_format($averagePoCycleDays, 2, '.', ''),
                'pending_delivery_count' => $allOrderRows->filter(fn (PurchaseOrder $po) => !in_array($po->delivery_status, ['COMPLETE', 'LATE'], true))->count(),
                'supplier_count' => $supplierCount,

                'active_supplier_count' => $activeSupplierCount,
                'total_value' => number_format($totalValue, 2, '.', ''),
                'average_value' => number_format($allOrderRows->count() > 0 ? $totalValue / $allOrderRows->count() : 0, 2, '.', ''),
            ],
            'status_breakdown' => $statusBreakdown,
            'request_status_breakdown' => $requestStatusBreakdown,
            'delivery_breakdown' => $deliveryBreakdown,
            'supplier_breakdown' => $supplierBreakdown,
            'recent_purchase_orders' => $filteredPurchaseOrders->map(function (PurchaseOrder $po) {
                return [
                    'id' => $po->id,
                    'po_number' => $po->po_number,
                    'status' => $po->status,
                    'grand_total' => number_format((float) $po->grand_total, 2, '.', ''),
                    'supplier_name' => $po->supplier?->company_name ?? 'غير محدد',
                    'request_number' => $po->purchaseRequest?->request_number ?? 'مباشر',
                    'department_name' => $po->purchaseRequest?->department?->name ?? $po->createdBy?->department?->name ?? 'غير محدد',
                    'items' => $po->items->map(fn ($item) => [
                        'id' => $item->id,
                        'item_description' => $item->item_description,
                        'item_reference' => $item->item_reference,
                        'region' => $item->region,
                        'quantity' => $item->quantity,
                        'uom' => $item->uom,
                        'grand_total' => $item->line_total,
                    ])->values(),
                    'updated_at' => $po->updated_at?->toIso8601String(),
                ];
            })->values(),
            'recent_purchase_requests' => $approvedRequests->map(function (PurchaseRequest $requestModel) {
                return [
                    'id' => $requestModel->id,
                    'request_number' => $requestModel->request_number,
                    
                    'status' => $requestModel->status,
                    'requester_name' => $requestModel->requester?->name,
                    'department_name' => $requestModel->department?->name,
                    'updated_at' => $requestModel->updated_at?->toIso8601String(),
                ];
            })->values(),
        ];
        Cache::put($cacheKey, $payload, now()->addSeconds(15));
        return response()->json($payload);
    }

    private function resolveCutoffDate(string $period): ?\Carbon\CarbonImmutable
    {
        if ($period === 'all') {
            return null;
        }

        $days = max(1, (int) $period);

        return now()->subDays($days)->startOfDay()->toImmutable();
    }
}