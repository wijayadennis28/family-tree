<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // In production, set CORS_ALLOWED_ORIGINS to your frontend domain,
    // e.g. CORS_ALLOWED_ORIGINS=https://yourdomain.com
    // Multiple origins can be comma-separated.
    'allowed_origins' => array_filter(explode(',', env('CORS_ALLOWED_ORIGINS', '*'))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // Set CORS_SUPPORTS_CREDENTIALS=true if your frontend sends cookies
    // or uses Sanctum token authentication from the same domain.
    'supports_credentials' => env('CORS_SUPPORTS_CREDENTIALS', false),

];
