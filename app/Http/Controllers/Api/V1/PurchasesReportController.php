<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\PurchaseReceipt;
use App\Models\PurchaseReceiptItem;
use App\Models\SupplierInvoice;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PurchasesReportController extends Controller
{
    /**
     * Allowed roles for this specific report.
     */
    private const ALLOWED_ROLES = [
        'accountant',
        'general_manager',
        'procurement_manager',
        'admin',
    ];

    /**
     * Display the purchases report with the 12 accounting-verified columns.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // 1. Authorize role: only Accountant, GM, Procurement Manager, and Admin
        $userRoles = $user->roles->flatMap(fn ($r) => [
            strtolower((string) ($r->name ?? '')),
            strtolower((string) ($r->slug ?? '')),
        ])->filter()->all();
        $isAllowed = ! empty(array_intersect($userRoles, self::ALLOWED_ROLES));

        if (! $isAllowed) {
            return response()->json([
                'message' => 'غير مصرح لك بالوصول لتقرير المشتريات المحاسبي. هذا التقرير مخصص للحسابات والمدير التنفيذي ومدير المشتريات فقط.',
            ], 403);
        }

        // 2. Parse Date / Period Filters
        $filterType = (string) $request->query('filter_type', 'monthly'); // 'daily' | 'monthly' | 'custom'
        $departmentId = $request->filled('department_id') && $request->query('department_id') !== 'ALL'
            ? (int) $request->query('department_id')
            : null;

        $startDate = null;
        $endDate = null;
        $dateLabel = '';

        if ($filterType === 'daily') {
            $date = $request->query('date', now()->toDateString());
            try {
                $parsed = Carbon::parse($date);
                $startDate = $parsed->copy()->startOfDay();
                $endDate = $parsed->copy()->endOfDay();
                $dateLabel = 'يوم ' . $parsed->translatedFormat('d F Y');
            } catch (\Throwable) {
                $startDate = now()->startOfDay();
                $endDate = now()->endOfDay();
                $dateLabel = 'اليوم';
            }
        } elseif ($filterType === 'monthly') {
            $month = (string) $request->query('month', now()->format('Y-m'));
            try {
                $parsed = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
                $startDate = $parsed->copy()->startOfMonth();
                $endDate = $parsed->copy()->endOfMonth();
                $dateLabel = 'شهر ' . $parsed->format('m-Y');
            } catch (\Throwable) {
                $startDate = now()->startOfMonth();
                $endDate = now()->endOfMonth();
                $dateLabel = 'الشهر الحالي';
            }
        } elseif ($filterType === 'custom') {
            $fromDate = $request->query('from_date');
            $toDate = $request->query('to_date');
            if ($fromDate && $toDate) {
                try {
                    $startDate = Carbon::parse($fromDate)->startOfDay();
                    $endDate = Carbon::parse($toDate)->endOfDay();
                    $dateLabel = "من {$fromDate} إلى {$toDate}";
                } catch (\Throwable) {
                    $startDate = now()->subDays(30)->startOfDay();
                    $endDate = now()->endOfDay();
                    $dateLabel = 'آخر 30 يوم';
                }
            } else {
                $startDate = now()->subDays(30)->startOfDay();
                $endDate = now()->endOfDay();
                $dateLabel = 'آخر 30 يوم';
            }
        }

        // 3. Query only transactions registered by Accounting (SupplierInvoices)
        // This guarantees that only accounting-verified/settled transactions appear.
        $invoicesQuery = SupplierInvoice::query()
            ->with([
                'supplier',
                'purchaseOrder.items',
                'purchaseOrder.purchaseRequest.department',
                'purchaseOrder.purchaseRequest.targetDepartment',
                'purchaseOrder.purchaseRequest.landParcel',
                'purchaseReceipt.items.purchaseOrderItem.prItem',
                'landAllocations.parcel',
                'landAllocations.department',
                'createdBy',
            ]);

        // Filter by date (based on delivery date received_at or invoice_date)
        if ($startDate !== null && $endDate !== null) {
            $startDateStr = $startDate->toDateString();
            $endDateStr = $endDate->toDateString();

            $invoicesQuery->where(function ($q) use ($startDateStr, $endDateStr) {
                $q->where(function ($sub) use ($startDateStr, $endDateStr) {
                    $sub->whereDate('invoice_date', '>=', $startDateStr)
                        ->whereDate('invoice_date', '<=', $endDateStr);
                })->orWhereHas('purchaseReceipt', function ($rq) use ($startDateStr, $endDateStr) {
                    $rq->whereDate('received_at', '>=', $startDateStr)
                        ->whereDate('received_at', '<=', $endDateStr);
                });
            });
        }

        $invoices = $invoicesQuery->orderByDesc('invoice_date')->get();

        // 4. Flatten into the 12 exact report columns per line item
        $reportRows = [];

        foreach ($invoices as $invoice) {
            $receipt = $invoice->purchaseReceipt;
            $order = $invoice->purchaseOrder;
            $requestModel = $order?->purchaseRequest;

            if (! $receipt || ! $order) {
                continue;
            }

            // Department resolution
            $defaultDept = $requestModel?->targetDepartment
                ?? $requestModel?->department
                ?? $invoice->landAllocations->first()?->department;

            $deptId = $defaultDept?->id;
            $deptName = $defaultDept?->name ?? 'العام';

            // Land parcel & region resolution
            $defaultParcelRef = $invoice->landAllocations->first()?->parcel?->parcel_reference
                ?? $requestModel?->parcel_reference
                ?? $requestModel?->landParcel?->parcel_reference
                ?? '—';

            $defaultRegion = $invoice->landAllocations->first()?->parcel?->region
                ?? $requestModel?->region
                ?? $requestModel?->landParcel?->region
                ?? '—';

            // Iterate over receipt items (accounting-verified received quantities)
            foreach ($receipt->items as $itemIndex => $receiptItem) {
                $poItem = $receiptItem->purchaseOrderItem;
                $prItem = $poItem?->prItem;

                $receivedQty = (float) $receiptItem->received_quantity;
                $unitPrice = (float) ($poItem?->unit_price ?? 0);
                $lineTotal = round($receivedQty * $unitPrice, 2);

                // Specific parcel or region on PO item if provided
                $rowParcelRef = $poItem?->item_reference
                    ?: ($prItem?->item_reference ?: $defaultParcelRef);
                $rowRegion = $poItem?->region
                    ?: ($prItem?->region ?: $defaultRegion);

                // Works / Specifications (الاعمال)
                $works = $poItem?->specifications
                    ?: ($prItem?->specifications ?: ($requestModel?->notes ?: '—'));

                // Apply department filter if selected
                if ($departmentId !== null && $deptId !== $departmentId) {
                    continue;
                }

                $deliveryDate = $receipt->received_at?->format('Y-m-d')
                    ?? $invoice->invoice_date?->format('Y-m-d')
                    ?? $receipt->created_at?->format('Y-m-d');

                $reportRows[] = [
                    'id' => "INV-{$invoice->id}-ITEM-{$receiptItem->id}",
                    'invoice_id' => $invoice->id,
                    'receipt_id' => $receipt->id,
                    'purchase_order_id' => $order->id,
                    // 1. تاريخ التوريد
                    'delivery_date' => $deliveryDate,
                    'delivery_date_formatted' => $deliveryDate ? Carbon::parse($deliveryDate)->format('d/m/Y') : '—',
                    // 2. رقم أمر الشراء
                    'po_number' => $order->po_number,
                    'po_number_short' => preg_replace('/^PO-\d{4}-0*/', '', $order->po_number) ?: $order->po_number,
                    // 3. الصنف
                    'item_name' => $poItem?->item_description ?? '—',
                    // 4. الوحدة
                    'uom' => $poItem?->uom ?? '—',
                    // 5. الكمية (المستلمة المعتمدة لدى الحسابات)
                    'quantity' => $receivedQty,
                    // 6. سعر الوحدة
                    'unit_price' => $unitPrice,
                    // 7. سعر الكمية (الإجمالي)
                    'total_price' => $lineTotal,
                    // 8. أسم المورد
                    'supplier_name' => $invoice->supplier?->company_name ?? $invoice->supplier?->name ?? '—',
                    'supplier_id' => $invoice->supplier_id,
                    // 9. رقم القطعة
                    'parcel_reference' => $rowParcelRef ?: '—',
                    // 10. إسم المنطقة
                    'region' => $rowRegion ?: '—',
                    // 11. القسم
                    'department_id' => $deptId,
                    'department_name' => $deptName,
                    // 12. الاعمال
                    'works' => $works ?: '—',
                    // Extra metadata
                    'invoice_number' => $invoice->invoice_number,
                    'matching_status' => $invoice->matching_status,
                    'accountant_name' => $invoice->createdBy?->name ?? 'الحسابات',
                    'created_at' => $invoice->created_at?->toIso8601String(),
                ];
            }
        }

        // 5. Calculate Summary Metrics
        $totalOrders = count(array_unique(array_column($reportRows, 'purchase_order_id')));
        $totalItemsCount = count($reportRows);
        $totalAmount = array_sum(array_column($reportRows, 'total_price'));
        $totalQuantity = array_sum(array_column($reportRows, 'quantity'));
        $uniqueSuppliers = count(array_unique(array_filter(array_column($reportRows, 'supplier_name'), fn ($s) => $s && $s !== '—')));
        $uniqueParcels = count(array_unique(array_filter(array_column($reportRows, 'parcel_reference'), fn ($p) => $p && $p !== '—')));

        // 6. List of available active departments for the filter dropdown
        $allDepartments = Department::query()
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return response()->json([
            'filters' => [
                'filter_type' => $filterType,
                'date' => $request->query('date'),
                'month' => $request->query('month', now()->format('Y-m')),
                'from_date' => $request->query('from_date'),
                'to_date' => $request->query('to_date'),
                'department_id' => $departmentId,
                'date_label' => $dateLabel,
            ],
            'metrics' => [
                'total_amount' => $totalAmount,
                'total_quantity' => $totalQuantity,
                'total_orders_count' => $totalOrders,
                'total_items_count' => $totalItemsCount,
                'suppliers_count' => $uniqueSuppliers,
                'parcels_count' => $uniqueParcels,
            ],
            'departments' => $allDepartments,
            'rows' => $reportRows,
        ]);
    }
}
