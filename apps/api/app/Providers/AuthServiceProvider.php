<?php

namespace App\Providers;

use App\Models\Medication;
use App\Models\Schedule;
use App\Policies\MedicationPolicy;
use App\Policies\SchedulePolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Medication::class => MedicationPolicy::class,
        Schedule::class => SchedulePolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}
