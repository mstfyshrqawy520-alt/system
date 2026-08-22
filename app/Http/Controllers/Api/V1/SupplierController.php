<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SupplierController extends Controller
{
    /**
     * List suppliers with optional search and active-status filtering.
     */
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $status = (string) $request->query('status', '');
        $perPage = min(max((int) $request->query('per_page', 50), 1), 200);

        $query = Supplier::query();

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('company_name', 'like', "%{$search}%")
                    ->orWhere('contact_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($status === 'active') {
            $query->where('is_active', true);
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }

        $paginator = $query->orderBy('company_name')->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    /**
     * Create a supplier. Tax data is intentionally not accepted by the active API.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => ['required', 'string', 'max:150', Rule::unique('suppliers', 'company_name')],
            'contact_name' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:150', Rule::unique('suppliers', 'email')],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string'],
            'payment_terms' => ['nullable', 'string', 'max:100'],
            'opening_balance' => ['nullable', 'numeric', 'min:0'],
            'opening_balance_notes' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['opening_balance'] = isset($validated['opening_balance']) ? round((float) $validated['opening_balance'], 2) : 0;
        $supplier = Supplier::create($validated);

        if ($supplier->opening_balance > 0) {
            app(\App\Services\SupplierInvoiceService::class)->setOpeningBalance($supplier, (float) $supplier->opening_balance, $supplier->opening_balance_notes);
        }

        return response()->json([
            'message' => 'Supplier created successfully.',
            'data' => $supplier,
        ], 201);
    }

    /**
     * Display a supplier and its purchase-order history.
     */
    public function show(int $id): JsonResponse
    {
        $supplier = Supplier::with(['purchaseOrders.purchaseRequest'])
            ->findOrFail($id);

        return response()->json(['data' => $supplier]);
    }

    /**
     * Update a supplier. Tax data is intentionally not accepted by the active API.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $supplier = Supplier::findOrFail($id);
        $validated = $request->validate([
            'company_name' => ['sometimes', 'required', 'string', 'max:150'],
            'contact_name' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:150'],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string'],
            'payment_terms' => ['nullable', 'string', 'max:100'],
            'opening_balance' => ['nullable', 'numeric', 'min:0'],
            'opening_balance_notes' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $supplier->update($validated);

        if (array_key_exists('opening_balance', $validated)) {
            app(\App\Services\SupplierInvoiceService::class)->setOpeningBalance($supplier, (float) $supplier->opening_balance, $supplier->opening_balance_notes);
        }

        return response()->json([
            'message' => 'Supplier updated successfully.',
            'data' => $supplier->fresh(),
        ]);
    }

    /**
     * Soft-delete/deactivate a supplier.
     */
    public function destroy(int $id): JsonResponse
    {
        $supplier = Supplier::findOrFail($id);
        $supplier->update(['is_active' => false]);
        $supplier->delete();

        return response()->json([
            'message' => 'Supplier deactivated successfully.',
        ]);
    }
}
