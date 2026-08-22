<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;

class LandParcel extends Model
{
    use HasFactory;

    protected $fillable = [
        'parcel_reference',
        'region',
        'opening_balance',
        'funded_total',
        'expense_total',
        'balance',
        'is_active',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'opening_balance' => 'decimal:2',
            'funded_total' => 'decimal:2',
            'expense_total' => 'decimal:2',
            'balance' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(LandParcelTransaction::class);
    }

    public function invoiceAllocations(): HasMany
    {
        return $this->hasMany(SupplierInvoiceLandAllocation::class);
    }
}

