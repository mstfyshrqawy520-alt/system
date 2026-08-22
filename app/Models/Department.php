<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Concerns\RecordsSystemEvents;

class Department extends Model
{
    use HasFactory, SoftDeletes, RecordsSystemEvents;

    protected $table = 'departments';

    protected $fillable = [
        'name',
        'code',
        'manager_user_id',
        'site_engineer_user_id',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'department_id');
    }

    public function purchaseRequests(): HasMany
    {
        return $this->hasMany(PurchaseRequest::class, 'department_id');
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_user_id');
    }

    public function siteEngineer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'site_engineer_user_id');
    }
}
