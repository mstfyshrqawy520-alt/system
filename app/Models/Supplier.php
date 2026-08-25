<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Concerns\RecordsSystemEvents;

class Supplier extends Model
{
    use HasFactory, SoftDeletes, RecordsSystemEvents;

    protected $table = 'suppliers';

    protected $fillable = [
        'company_name',
        'contact_name',
        'email',
        'phone',
        'address',
        'payment_terms',
        'opening_balance',
        'opening_balance_notes',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'opening_balance' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class, 'supplier_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(SupplierInvoice::class, 'supplier_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class, 'supplier_id');
    }

    public function balanceAccount(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(SupplierBalance::class, 'supplier_id');
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(PurchaseRequestQuote::class, 'supplier_id');
    }

    public function approvedQuotes(): HasMany
    {
        return $this->hasMany(PurchaseRequestQuote::class, 'supplier_id')->where('status', 'SELECTED');
    }
}
