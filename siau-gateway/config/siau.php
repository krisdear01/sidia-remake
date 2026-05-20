<?php

return [
    'admin_token' => env('SIAU_ADMIN_TOKEN', ''),

    'rate_limits' => [
        'public_per_minute' => (int) env('SIAU_RATE_PUBLIC', 60),
        'schedule_per_minute' => (int) env('SIAU_RATE_SCHEDULE', 30),
    ],
];
