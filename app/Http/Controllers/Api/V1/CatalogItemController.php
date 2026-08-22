<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Item;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class CatalogItemController extends Controller
{
    /**
     * Get list of active catalog items for purchase request creation.
     */
    public function index(): JsonResponse
    {
        $items = Cache::remember('catalog.active.v2', now()->addMinutes(10), function () {
            return Item::query()
                ->with('category:id,name')
                                ->select(['id', 'category_id', 'sku', 'name', 'uom', 'description'])

                ->where('is_active', true)
                ->orderBy('name', 'asc')
                ->get()
                ->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'sku' => $item->sku,
                        'name' => $item->name,
                        'uom' => $item->uom,
                        'description' => $item->description,
                        
                        'category' => $item->category ? [
                            'id' => $item->category->id,
                            'name' => $item->category->name,
                        ] : null,
                    ];
                });
        });

        return response()->json(['data' => $items]);
    }
}
