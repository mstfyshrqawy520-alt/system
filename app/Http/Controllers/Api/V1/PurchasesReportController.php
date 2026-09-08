<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\PurchaseOrder;
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
        'site_accountant',
        'licenses_accountant',
        'buffet_accountant',
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
        $accountingFilter = (string) $request->query('accounting_filter', 'ALL'); // 'ALL' | 'VERIFIED_ONLY' | 'PENDING'

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

        // 3. Query all Purchase Orders in the period with items, receipts and supplier invoices
        $allowedDepartmentCodes = app(\App\Services\SupplierInvoiceService::class)->getAllowedDepartmentCodesForAccountant($user);

        $ordersQuery = PurchaseOrder::query()
            ->with([
                'supplier',
                'items.prItem',
                'purchaseRequest.department',
                'purchaseRequest.targetDepartment',
                'purchaseRequest.landParcel',
                'purchaseReceipts.items.purchaseOrderItem',
                'supplierInvoices.landAllocations.parcel',
                'supplierInvoices.landAllocations.department',
                'supplierInvoices.createdBy',
            ])
            ->whereNotIn('status', ['REJECTED', 'PO_DRAFT'])
            ->when($allowedDepartmentCodes !== null, function ($q) use ($allowedDepartmentCodes) {
                $q->whereHas('purchaseRequest.department', function ($dq) use ($allowedDepartmentCodes) {
                    $dq->whereIn('code', $allowedDepartmentCodes);
                });
            });

        // Date filtering based on order date or delivery date or invoice date
        if ($startDate !== null && $endDate !== null) {
            $startDateStr = $startDate->toDateString();
            $endDateStr = $endDate->toDateString();

            $ordersQuery->where(function ($q) use ($startDateStr, $endDateStr) {
                $q->where(function ($sub) use ($startDateStr, $endDateStr) {
                    $sub->whereDate('created_at', '>=', $startDateStr)
                        ->whereDate('created_at', '<=', $endDateStr);
                })->orWhere(function ($sub) use ($startDateStr, $endDateStr) {
                    $sub->whereNotNull('actual_delivery_date')
                        ->whereDate('actual_delivery_date', '>=', $startDateStr)
                        ->whereDate('actual_delivery_date', '<=', $endDateStr);
                })->orWhereHas('supplierInvoices', function ($iq) use ($startDateStr, $endDateStr) {
                    $iq->whereDate('invoice_date', '>=', $startDateStr)
                        ->whereDate('invoice_date', '<=', $endDateStr);
                })->orWhereHas('purchaseReceipts', function ($rq) use ($startDateStr, $endDateStr) {
                    $rq->whereDate('received_at', '>=', $startDateStr)
                        ->whereDate('received_at', '<=', $endDateStr);
                });
            });
        }

        $orders = $ordersQuery->orderByDesc('created_at')->get();

        // 4. Transform into the 12 exact report columns per item
        $reportRows = [];

        foreach ($orders as $order) {
            $requestModel = $order->purchaseRequest;

            // Department resolution
            $defaultDept = $requestModel?->targetDepartment
                ?? $requestModel?->department;

            $deptId = $defaultDept?->id;
            $deptName = $defaultDept?->name ?? 'العام';

            if ($departmentId !== null && $deptId !== $departmentId) {
                continue;
            }

            // Land parcel & region resolution
            $defaultParcelRef = $requestModel?->parcel_reference
                ?? $requestModel?->landParcel?->parcel_reference
                ?? '—';

            $defaultRegion = $requestModel?->region
                ?? $requestModel?->landParcel?->region
                ?? '—';

            // Check if accounting recorded invoice exists for this order
            $latestInvoice = $order->supplierInvoices->first();
            $latestReceipt = $order->purchaseReceipts->where('status', 'APPROVED')->first()
                ?? $order->purchaseReceipts->first();

            $isAccountingRecorded = $latestInvoice !== null;

            if ($accountingFilter === 'VERIFIED_ONLY' && ! $isAccountingRecorded) {
                continue;
            }
            if ($accountingFilter === 'PENDING' && $isAccountingRecorded) {
                continue;
            }

            // If there's an invoice with receipt items, iterate over receipt items to drop actual received qty
            if ($isAccountingRecorded && $latestReceipt && $latestReceipt->items->isNotEmpty()) {
                foreach ($latestReceipt->items as $receiptItem) {
                    $poItem = $receiptItem->purchaseOrderItem;
                    $prItem = $poItem?->prItem;

                    $receivedQty = (float) $receiptItem->received_quantity;
                    $unitPrice = (float) ($poItem?->unit_price ?? 0);
                    $lineTotal = round($receivedQty * $unitPrice, 2);

                    $rowParcelRef = $poItem?->item_reference
                        ?: ($prItem?->item_reference ?: $defaultParcelRef);
                    $rowRegion = $poItem?->region
                        ?: ($prItem?->region ?: $defaultRegion);

                    $works = $poItem?->specifications
                        ?: ($prItem?->specifications ?: ($requestModel?->notes ?: '—'));

                    $deliveryDate = $latestReceipt->received_at?->format('Y-m-d')
                        ?? $latestInvoice->invoice_date?->format('Y-m-d')
                        ?? $order->actual_delivery_date?->format('Y-m-d')
                        ?? $order->created_at?->format('Y-m-d');

                    $reportRows[] = [
                        'id' => "PO-{$order->id}-REC-{$receiptItem->id}",
                        'invoice_id' => $latestInvoice->id,
                        'receipt_id' => $latestReceipt->id,
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
                        'supplier_name' => $order->supplier?->company_name ?? $order->supplier?->name ?? '—',
                        'supplier_id' => $order->supplier_id,
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
                        'accounting_status' => 'VERIFIED',
                        'accounting_status_label' => 'مسقط ومسجل بالحسابات',
                        'invoice_number' => $latestInvoice->invoice_number,
                        'matching_status' => $latestInvoice->matching_status,
                        'accountant_name' => $latestInvoice->createdBy?->name ?? 'الحسابات',
                        'order_status' => $order->status,
                        'created_at' => $order->created_at?->toIso8601String(),
                    ];
                }
            } else {
                // Not yet registered in invoice, use order items (e.g. issued orders awaiting accounting)
                foreach ($order->items as $poItem) {
                    $prItem = $poItem->prItem;

                    $qty = (float) $poItem->quantity;
                    $unitPrice = (float) $poItem->unit_price;
                    $lineTotal = (float) ($poItem->line_total > 0 ? $poItem->line_total : round($qty * $unitPrice, 2));

                    $rowParcelRef = $poItem->item_reference
                        ?: ($prItem?->item_reference ?: $defaultParcelRef);
                    $rowRegion = $poItem->region
                        ?: ($prItem?->region ?: $defaultRegion);

                    $works = $poItem->specifications
                        ?: ($prItem?->specifications ?: ($requestModel?->notes ?: '—'));

                    $deliveryDate = $order->actual_delivery_date?->format('Y-m-d')
                        ?? $order->delivery_date?->format('Y-m-d')
                        ?? $order->created_at?->format('Y-m-d');

                    $reportRows[] = [
                        'id' => "PO-{$order->id}-ITEM-{$poItem->id}",
                        'invoice_id' => null,
                        'receipt_id' => $latestReceipt?->id,
                        'purchase_order_id' => $order->id,
                        // 1. تاريخ التوريد
                        'delivery_date' => $deliveryDate,
                        'delivery_date_formatted' => $deliveryDate ? Carbon::parse($deliveryDate)->format('d/m/Y') : '—',
                        // 2. رقم أمر الشراء
                        'po_number' => $order->po_number,
                        'po_number_short' => preg_replace('/^PO-\d{4}-0*/', '', $order->po_number) ?: $order->po_number,
                        // 3. الصنف
                        'item_name' => $poItem->item_description ?? '—',
                        // 4. الوحدة
                        'uom' => $poItem->uom ?? '—',
                        // 5. الكمية
                        'quantity' => $qty,
                        // 6. سعر الوحدة
                        'unit_price' => $unitPrice,
                        // 7. سعر الكمية (الإجمالي)
                        'total_price' => $lineTotal,
                        // 8. أسم المورد
                        'supplier_name' => $order->supplier?->company_name ?? $order->supplier?->name ?? '—',
                        'supplier_id' => $order->supplier_id,
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
                        'accounting_status' => 'PENDING',
                        'accounting_status_label' => 'صادر - بانتظار تسجيل الحسابات',
                        'invoice_number' => null,
                        'matching_status' => null,
                        'accountant_name' => null,
                        'order_status' => $order->status,
                        'created_at' => $order->created_at?->toIso8601String(),
                    ];
                }
            }
        }

        // 5. Calculate Summary Metrics
        $totalOrders = count(array_unique(array_column($reportRows, 'purchase_order_id')));
        $totalItemsCount = count($reportRows);
        $totalAmount = array_sum(array_column($reportRows, 'total_price'));
        $totalQuantity = array_sum(array_column($reportRows, 'quantity'));
        $uniqueSuppliers = count(array_unique(array_filter(array_column($reportRows, 'supplier_name'), fn ($s) => $s && $s !== '—')));
        $uniqueParcels = count(array_unique(array_filter(array_column($reportRows, 'parcel_reference'), fn ($p) => $p && $p !== '—')));
        $verifiedCount = count(array_filter($reportRows, fn ($r) => ($r['accounting_status'] ?? '') === 'VERIFIED'));

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
                'accounting_filter' => $accountingFilter,
                'date_label' => $dateLabel,
            ],
            'metrics' => [
                'total_amount' => $totalAmount,
                'total_quantity' => $totalQuantity,
                'total_orders_count' => $totalOrders,
                'total_items_count' => $totalItemsCount,
                'suppliers_count' => $uniqueSuppliers,
                'parcels_count' => $uniqueParcels,
                'verified_items_count' => $verifiedCount,
            ],
            'departments' => $allDepartments,
            'rows' => $reportRows,
        ]);
    }
}
