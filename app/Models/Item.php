<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;
use App\Models\Concerns\RecordsSystemEvents;

class Item extends Model
{
    use HasFactory, SoftDeletes, RecordsSystemEvents;

    protected $table = 'items';

    protected $fillable = [
        'category_id',
        'sku',
        'name',
        'uom',
        'description',
        'default_estimated_price',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'default_estimated_price' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget('catalog.active.v1'));
        static::deleted(fn () => Cache::forget('catalog.active.v1'));
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function purchaseRequestItems(): HasMany
    {
        return $this->hasMany(PurchaseRequestItem::class, 'item_id');
    }

    public function purchaseOrderItems(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class, 'item_id');
    }
}
