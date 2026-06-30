<?php

return [
    'admin_token' => env('SIAU_ADMIN_TOKEN', ''),

    // Base URL for SIISYANA-hosted media (building galleries, file_rincian_gedung
    // PDFs). Used by BuildingController/BuildingMapper to build absolute URLs.
    'storage_base_url' => rtrim((string) env('SIISYANA_STORAGE_BASE_URL', 'https://siisyana-storage.unud.ac.id'), '/'),

    'rate_limits' => [
        'public_per_minute' => (int) env('SIAU_RATE_PUBLIC', 60),
        'schedule_per_minute' => (int) env('SIAU_RATE_SCHEDULE', 30),
    ],
];
