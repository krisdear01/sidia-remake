<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Nightly contract test against live source DBs. Read-only.
Schedule::command('siau:contract-test')
    ->dailyAt('02:00')
    ->withoutOverlapping()
    ->runInBackground()
    ->onFailure(function () {
        // Hook a real alerter (Slack, PagerDuty) here in production.
        logger()->critical('siau:contract-test FAILED — source schema may have drifted');
    });

// Nightly reconcile of the room identity map. Writes only to the gateway DB.
Schedule::command('siau:reconcile-rooms')
    ->dailyAt('02:15')
    ->withoutOverlapping()
    ->runInBackground();
