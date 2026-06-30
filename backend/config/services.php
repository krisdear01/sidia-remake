<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'siau_gateway' => [
        'url' => env('SIAU_GATEWAY_URL', 'http://localhost:8765/api/v1'),
        'timeout' => (int) env('SIAU_GATEWAY_TIMEOUT', 5),
        'cache_ttl' => (int) env('SIAU_GATEWAY_CACHE_TTL', 30),
        // Gateway admin token — used ONLY by the Sanctum-gated admin proxy.
        // Never read on the public proxy path; never exposed to the frontend.
        'admin_token' => env('SIAU_ADMIN_TOKEN'),
    ],

];
