<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\Supplier;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

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

        $basePurchaseRequestQuery = PurchaseRequest::query()
            ->select(['id', 'status', 'created_at'])
            ->when($cutoff !== null, fn ($query) => $query->where('created_at', '>=', $cutoff));

        $orderTotals = (clone $basePurchaseOrderQuery)
            ->select([])
            ->selectRaw('COUNT(*) as purchase_orders_count, COALESCE(SUM(grand_total), 0) as total_value')
            ->first();
        $statusMetrics = (clone $basePurchaseOrderQuery)
            ->select('status')
            ->selectRaw('COUNT(*) as row_count, COALESCE(SUM(grand_total), 0) as total_value')
            ->groupBy('status')
            ->get();
        $statusBreakdown = $statusMetrics
            ->map(fn ($row) => [
                'status' => $row->status,
                'count' => (int) $row->row_count,
                'total_value' => number_format((float) $row->total_value, 2, '.', ''),
            ])
            ->sortBy(fn (array $item) => array_search($item['status'], self::ORDER_STATUSES, true))
            ->values();

        $requestStatusMetrics = (clone $basePurchaseRequestQuery)
            ->select('status')
            ->selectRaw('COUNT(*) as row_count')
            ->groupBy('status')
            ->get();
        $requestStatusBreakdown = $requestStatusMetrics
            ->map(fn ($row) => [
                'status' => $row->status,
                'count' => (int) $row->row_count,
            ])
            ->values();

        $deliveryMetrics = (clone $basePurchaseOrderQuery)
            ->select('delivery_status')
            ->selectRaw('COUNT(*) as row_count, COALESCE(SUM(grand_total), 0) as total_value')
            ->groupBy('delivery_status')
            ->get();
        $deliveryBreakdown = $deliveryMetrics
            ->map(fn ($row) => [
                'status' => $row->delivery_status ?: 'PENDING',
                'count' => (int) $row->row_count,
                'total_value' => number_format((float) $row->total_value, 2, '.', ''),
            ])
            ->values();

        $supplierMetrics = (clone $basePurchaseOrderQuery)
            ->select('supplier_id')
            ->selectRaw('COUNT(*) as row_count, COALESCE(SUM(grand_total), 0) as total_value')
            ->whereNotNull('supplier_id')
            ->groupBy('supplier_id')
            ->orderByDesc('total_value')
            ->limit(6)
            ->get();
        $supplierLookup = Supplier::query()
            ->whereIn('id', $supplierMetrics->pluck('supplier_id')->filter()->unique()->values())
            ->get(['id', 'company_name', 'is_active'])
            ->keyBy('id');
        $supplierBreakdown = $supplierMetrics
            ->map(function ($row) use ($supplierLookup) {
                $supplier = $supplierLookup->get($row->supplier_id);

                return [
                    'supplier_id' => $supplier?->id,
                    'company_name' => $supplier?->company_name,
                    'code' => $supplier?->code,
                    'is_active' => (bool) ($supplier?->is_active ?? false),
                    'count' => (int) $row->row_count,
                    'total_value' => number_format((float) $row->total_value, 2, '.', ''),
                ];
            })
            ->values();

        $departmentMetrics = DB::table('purchase_orders as po')
            ->leftJoin('purchase_requests as pr', 'pr.id', '=', 'po.purchase_request_id')
            ->leftJoin('users as creator', 'creator.id', '=', 'po.created_by_user_id')
            ->when($cutoff !== null, fn ($query) => $query->where('po.created_at', '>=', $cutoff))
            ->selectRaw('COALESCE(pr.department_id, creator.department_id, 0) as department_id, COUNT(*) as row_count, COALESCE(SUM(po.grand_total), 0) as total_value')
            ->groupByRaw('COALESCE(pr.department_id, creator.department_id, 0)')
            ->get();
        $departmentLookup = Department::query()
            ->whereIn('id', $departmentMetrics->pluck('department_id')->filter(fn ($id) => (int) $id > 0)->unique()->values())
            ->get(['id', 'name', 'code'])
            ->keyBy('id');
        $departmentBreakdown = $departmentMetrics
            ->map(function ($row) use ($departmentLookup) {
                $department = $departmentLookup->get($row->department_id);

                return [
                    'department_id' => $department?->id,
                    'name' => $department?->name ?? 'غير محدد',
                    'code' => $department?->code ?? 'N/A',
                    'count' => (int) $row->row_count,
                    'total_value' => number_format((float) $row->total_value, 2, '.', ''),
                ];
            })
            ->sortByDesc(fn (array $item) => (float) $item['total_value'])
            ->values();

        $deliveryStats = (clone $basePurchaseOrderQuery)
            ->select([])
            ->selectRaw("SUM(CASE WHEN delivery_status = 'COMPLETE' THEN 1 ELSE 0 END) as completed_count, SUM(CASE WHEN delivery_status = 'COMPLETE' AND delivery_date IS NOT NULL AND actual_delivery_date IS NOT NULL AND actual_delivery_date <= delivery_date THEN 1 ELSE 0 END) as on_time_count, SUM(CASE WHEN delivery_status = 'LATE' THEN 1 ELSE 0 END) as late_count, SUM(CASE WHEN delivery_status IS NULL OR delivery_status NOT IN ('COMPLETE', 'LATE') THEN 1 ELSE 0 END) as pending_count")
            ->first();
        $completedDeliveryCount = (int) ($deliveryStats?->completed_count ?? 0);
        $onTimeDeliveryCount = (int) ($deliveryStats?->on_time_count ?? 0);
        $onTimeDeliveryRate = $completedDeliveryCount > 0 ? ($onTimeDeliveryCount / $completedDeliveryCount) * 100 : 0;

        $driver = DB::connection()->getDriverName();
        $cycleHoursExpression = $driver === 'sqlite'
            ? '(julianday(po.created_at) - julianday(pr.submitted_at)) * 24'
            : 'TIMESTAMPDIFF(HOUR, pr.submitted_at, po.created_at)';
        $averagePoCycleDays = (float) (DB::table('purchase_orders as po')
            ->join('purchase_requests as pr', 'pr.id', '=', 'po.purchase_request_id')
            ->when($cutoff !== null, fn ($query) => $query->where('po.created_at', '>=', $cutoff))
            ->whereNotNull('pr.submitted_at')
            ->whereNotNull('po.created_at')
            ->selectRaw("AVG(CASE WHEN {$cycleHoursExpression} < 0 THEN 0 ELSE {$cycleHoursExpression} END) / 24 as average_cycle_days")
            ->value('average_cycle_days') ?? 0);

        // Use Eloquent boolean predicates instead of `is_active = 1`, which is
        // not valid for PostgreSQL boolean columns.
        $supplierCount = Supplier::query()->count();
        $activeSupplierCount = Supplier::query()->where('is_active', true)->count();
        $totalOrderCount = (int) ($orderTotals?->purchase_orders_count ?? 0);
        $totalValue = (float) ($orderTotals?->total_value ?? 0);
        $orderCountByStatus = $statusMetrics->keyBy('status');
        $requestCountByStatus = $requestStatusMetrics->keyBy('status');
        $pendingProcurementCount = (int) ($requestCountByStatus->get('PENDING_PROCUREMENT_APPROVAL')?->row_count ?? 0);
        $draftCount = (int) ($orderCountByStatus->get('PO_DRAFT')?->row_count ?? 0);
        $pendingAccountingCount = (int) ($orderCountByStatus->get('PENDING_ACCOUNTING_REVIEW')?->row_count ?? 0);
        $returnedCount = (int) ($orderCountByStatus->get('RETURNED_TO_PROCUREMENT')?->row_count ?? 0);
        $accountingApprovedCount = (int) ($orderCountByStatus->get('APPROVED_BY_ACCOUNTING')?->row_count ?? 0);
        $purchaseRequestCount = (int) $requestStatusMetrics->sum('row_count');
        $approvedRequestCount = (int) ($requestCountByStatus->get('PENDING_PROCUREMENT_APPROVAL')?->row_count ?? 0)
            + (int) ($requestCountByStatus->get('APPROVED_BY_PROCUREMENT')?->row_count ?? 0);

        $payload = [
            'filters' => [
                'period' => $period,
                'status' => is_string($status) && in_array($status, self::ORDER_STATUSES, true) ? $status : null,
            ],
            'metrics' => [
                'purchase_requests_count' => $purchaseRequestCount,
                'approved_requests_count' => $approvedRequestCount,
                'draft_request_count' => (int) ($requestCountByStatus->get('DRAFT')?->row_count ?? 0),
                'submitted_request_count' => (int) ($requestCountByStatus->get('SUBMITTED')?->row_count ?? 0),
                'under_review_request_count' => (int) ($requestCountByStatus->get('UNDER_REVIEW')?->row_count ?? 0),
                'rejected_request_count' => (int) ($requestCountByStatus->get('REJECTED')?->row_count ?? 0),
                'pending_procurement_count' => $pendingProcurementCount,

                'purchase_orders_count' => $totalOrderCount,
                'draft_count' => $draftCount,
                'pending_accounting_count' => $pendingAccountingCount,
                'returned_count' => $returnedCount,
                'accounting_approved_count' => $accountingApprovedCount,
                'completed_delivery_count' => $completedDeliveryCount,
                'late_delivery_count' => (int) ($deliveryStats?->late_count ?? 0),
                'on_time_delivery_count' => $onTimeDeliveryCount,
                'on_time_delivery_rate' => number_format($onTimeDeliveryRate, 2, '.', ''),
                'average_po_cycle_days' => number_format($averagePoCycleDays, 2, '.', ''),
                'pending_delivery_count' => (int) ($deliveryStats?->pending_count ?? 0),
                'supplier_count' => $supplierCount,

                'active_supplier_count' => $activeSupplierCount,
                'total_value' => number_format($totalValue, 2, '.', ''),
                'average_value' => number_format($totalOrderCount > 0 ? $totalValue / $totalOrderCount : 0, 2, '.', ''),
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