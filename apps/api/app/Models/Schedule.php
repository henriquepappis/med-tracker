<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Schedule extends Model
{
    protected $fillable = [
        'medication_id',
        'recurrence_type',
        'times',
        'weekdays',
        'interval_hours',
        'is_active',
    ];

    protected $casts = [
        'times' => 'array',
        'weekdays' => 'array',
        'is_active' => 'boolean',
    ];

    public function medication(): BelongsTo
    {
        return $this->belongsTo(Medication::class);
    }
}
