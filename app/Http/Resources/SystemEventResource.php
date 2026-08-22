<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SystemEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'event_type' => $this->event_type,
            'action' => $this->action,
            'entity_type' => $this->entity_type,
            'entity_id' => $this->entity_id,
            'entity_label' => $this->entity_label,
            'from_state' => $this->from_state,
            'to_state' => $this->to_state,
            'description' => $this->description,
            'old_values' => $this->old_values,
            'new_values' => $this->new_values,
            'metadata' => $this->metadata,
            'actor' => $this->whenLoaded('actor', function () {
                return [
                    'id' => $this->actor?->id,
                    'name' => $this->actor?->name,
                    'email' => $this->actor?->email,
                ];
            }),
            'occurred_at' => $this->occurred_at?->toISOString(),
            'date' => $this->occurred_at?->format('Y-m-d'),
            'time' => $this->occurred_at?->format('H:i:s'),
        ];
    }
}
