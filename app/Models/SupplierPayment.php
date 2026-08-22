<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupplierPayment extends \Illuminate\Database\Eloquent\Model
{
    use HasFactory;

    protected $fillable = [
        'supplier_id',
        'accountant_user_id',
        'payment_number',
        'amount',
        'payment_date',
        'payment_method',
        'reference_number',
        'allocated_amount',
        'overpayment_amount',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'payment_date' => 'date',
            'allocated_amount' => 'decimal:2',
            'overpayment_amount' => 'decimal:2',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function accountant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accountant_user_id');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(SupplierPaymentAllocation::class);
    }
}
