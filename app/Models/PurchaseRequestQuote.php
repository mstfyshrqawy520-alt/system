<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseRequestQuote extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_request_id',
        'supplier_id',
        'created_by_user_id',
        'total_amount',
        'unit_price',
        'currency',
        'notes',
        'status',
        'selected_at',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
            'unit_price' => 'decimal:2',
            'selected_at' => 'datetime',
        ];
    }

    public function purchaseRequest(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequest::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function recommendations(): HasMany
    {
        return $this->hasMany(PurchaseRequestQuoteRecommendation::class);
    }
}
