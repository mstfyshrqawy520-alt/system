<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AuditLog extends Model
{
    use HasFactory;

    protected $table = 'audit_logs';

    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'entity_type',
        'entity_id',
        'action',
        'field_name',
        'old_value',
        'new_value',
        'ip_address',
        'user_agent',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function entity(): MorphTo
    {
        return $this->morphTo(null, 'entity_type', 'entity_id');
    }
}
