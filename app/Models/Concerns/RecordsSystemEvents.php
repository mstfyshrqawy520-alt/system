<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Services\SystemEventService;
use Illuminate\Database\Eloquent\Model;

trait RecordsSystemEvents
{
    public static function bootRecordsSystemEvents(): void
    {
        static::created(function (Model $model): void {
            app(SystemEventService::class)->recordModelCreated($model);
        });

        static::updated(function (Model $model): void {
            app(SystemEventService::class)->recordModelUpdated($model);
        });

        static::deleted(function (Model $model): void {
            app(SystemEventService::class)->recordModelDeleted($model);
        });
    }
}
