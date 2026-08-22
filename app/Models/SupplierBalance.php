<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierBalance extends \Illuminate\Database\Eloquent\Model
{
    use HasFactory;

    protected $fillable = [
        'supplier_id',
        'opening_balance',
        'total_invoiced',
        'total_paid',
        'balance',
        'last_activity_at',
    ];

    protected function casts(): array
    {
        return [
            'opening_balance' => 'decimal:2',
            'total_invoiced' => 'decimal:2',
            'total_paid' => 'decimal:2',
            'balance' => 'decimal:2',
            'last_activity_at' => 'datetime',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
