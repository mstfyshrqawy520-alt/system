<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Model;

class LandParcelTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'land_parcel_id',
        'created_by_user_id',
        'transaction_type',
        'amount',
        'balance_after',
        'reference_number',
        'transaction_date',
        'source_type',
        'source_id',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'balance_after' => 'decimal:2',
            'transaction_date' => 'date',
        ];
    }

    public function parcel(): BelongsTo
    {
        return $this->belongsTo(LandParcel::class, 'land_parcel_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function source(): MorphTo
    {
        return $this->morphTo();
    }
}

