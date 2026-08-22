<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ApprovalHistory extends Model
{
    use HasFactory;

    protected $table = 'approval_history';

    public const UPDATED_AT = null;

    protected $fillable = [
        'target_type',
        'target_id',
        'actor_user_id',
        'action',
        'from_state',
        'to_state',
        'comments',
    ];

    public function target(): MorphTo
    {
        return $this->morphTo();
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}
