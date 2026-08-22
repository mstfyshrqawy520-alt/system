<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseRequestQuoteRecommendation extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_request_quote_id',
        'user_id',
        'role_type',
        'decision',
        'comment',
    ];

    public function quote(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequestQuote::class, 'purchase_request_quote_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
