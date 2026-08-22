<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\SystemEvent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Throwable;

class SystemEventService
{
    private const HIDDEN_FIELDS = [
        'password',
        'remember_token',
        'token',
        'abilities',
    ];

    public function record(array $data): ?SystemEvent
    {
        try {
            $actor = Auth::user();
            $request = app()->bound('request') ? request() : null;

            return SystemEvent::create([
                'actor_user_id' => $data['actor_user_id'] ?? $actor?->getAuthIdentifier(),
                'event_type' => $data['event_type'] ?? 'system.action',
                'action' => $data['action'] ?? 'ACTION',
                'entity_type' => $data['entity_type'] ?? null,
                'entity_id' => $data['entity_id'] ?? null,
                'entity_label' => $data['entity_label'] ?? null,
                'from_state' => $data['from_state'] ?? null,
                'to_state' => $data['to_state'] ?? null,
                'description' => $data['description'] ?? null,
                'old_values' => $this->filterValues($data['old_values'] ?? null),
                'new_values' => $this->filterValues($data['new_values'] ?? null),
                'metadata' => $data['metadata'] ?? null,
                'ip_address' => $data['ip_address'] ?? $request?->ip(),
                'user_agent' => $data['user_agent'] ?? $request?->userAgent(),
                'occurred_at' => $data['occurred_at'] ?? now(),
            ]);
        } catch (Throwable $exception) {
            // Event logging must never break the procurement transaction.
            Log::warning('System event could not be recorded.', [
                'event_type' => $data['event_type'] ?? 'system.action',
                'action' => $data['action'] ?? 'ACTION',
                'entity_type' => $data['entity_type'] ?? null,
                'entity_id' => $data['entity_id'] ?? null,
                'error' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    public function recordAction(
        Model $entity,
        string $action,
        ?string $description = null,
        array $context = [],
    ): ?SystemEvent {
        return $this->record([
            'event_type' => $context['event_type'] ?? 'business.action',
            'action' => $action,
            'entity_type' => $entity::class,
            'entity_id' => $entity->getKey(),
            'entity_label' => $this->entityLabel($entity),
            'from_state' => $context['from_state'] ?? null,
            'to_state' => $context['to_state'] ?? null,
            'description' => $description,
            'old_values' => $context['old_values'] ?? null,
            'new_values' => $context['new_values'] ?? null,
            'metadata' => $context['metadata'] ?? null,
            'actor_user_id' => $context['actor_user_id'] ?? null,
        ]);
    }

    public function recordModelCreated(Model $model): void
    {
        $this->record([
            'event_type' => 'model.created',
            'action' => 'CREATED',
            'entity_type' => $model::class,
            'entity_id' => $model->getKey(),
            'entity_label' => $this->entityLabel($model),
            'description' => 'تم إنشاء سجل جديد في النظام.',
            'new_values' => $model->getAttributes(),
        ]);
    }

    public function recordModelUpdated(Model $model): void
    {
        $changes = $model->getChanges();
        $changes = Arr::except($changes, ['updated_at']);
        if ($changes === []) {
            return;
        }

        $oldValues = [];
        foreach (array_keys($changes) as $field) {
            $oldValues[$field] = $model->getRawOriginal($field);
        }

        $this->record([
            'event_type' => 'model.updated',
            'action' => 'UPDATED',
            'entity_type' => $model::class,
            'entity_id' => $model->getKey(),
            'entity_label' => $this->entityLabel($model),
            'description' => 'تم تعديل بيانات سجل في النظام.',
            'old_values' => $oldValues,
            'new_values' => $changes,
        ]);
    }

    public function recordModelDeleted(Model $model): void
    {
        $this->record([
            'event_type' => 'model.deleted',
            'action' => 'DELETED',
            'entity_type' => $model::class,
            'entity_id' => $model->getKey(),
            'entity_label' => $this->entityLabel($model),
            'description' => 'تم حذف أو إلغاء سجل في النظام.',
            'old_values' => $model->getAttributes(),
        ]);
    }

    public function eventsForEntity(Model $entity, int $limit = 100)
    {
        return SystemEvent::query()
            ->with('actor:id,name,email')
            ->where('entity_type', $entity::class)
            ->where('entity_id', $entity->getKey())
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    private function entityLabel(Model $model): ?string
    {
        foreach (['request_number', 'po_number', 'name', 'company_name', 'email', 'code'] as $field) {
            if (filled($model->getAttribute($field))) {
                return (string) $model->getAttribute($field);
            }
        }

        return $model->getKey() ? sprintf('%s #%s', class_basename($model), $model->getKey()) : null;
    }

    private function filterValues(?array $values): ?array
    {
        if ($values === null) {
            return null;
        }

        return Arr::except($values, self::HIDDEN_FIELDS);
    }
}
