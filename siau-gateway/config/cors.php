<?php

return [
    'paths' => ['api/*'],

    'allowed_methods' => ['GET', 'OPTIONS'],

    // Driven by env. Wildcard is intentionally NOT supported here — set
    // SIAU_CORS_ORIGINS to a comma-separated allowlist of consumer origins
    // (e.g. "https://siau.unud.ac.id,https://sidia.unud.ac.id").
    'allowed_origins' => array_values(array_filter(array_map('trim', explode(
        ',',
        (string) env('SIAU_CORS_ORIGINS', '')
    )))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'X-Requested-With'],

    'exposed_headers' => ['Retry-After', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],

    'max_age' => 600,

    'supports_credentials' => false,
];
