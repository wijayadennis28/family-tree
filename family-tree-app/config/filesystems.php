<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application. Just store away!
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Here you may configure as many filesystem "disks" as you wish, and you
    | may even configure multiple disks of the same driver. Defaults have
    | been set up for each driver as an example of the required values.
    |
    | Supported Drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app'),
            'throw' => false,
        ],

        'public' => [
            'driver' => 'local',
            // Shared-host friendly: write directly into the web-accessible
            // storage folder so no symlink is required. On a standard Laravel
            // install this would be storage_path('app/public') served via the
            // `php artisan storage:link` symlink, but most shared hosts disable
            // symlink() so we write straight to the web-served folder instead.
            //
            // Defaults to public_path('storage') which is correct when the
            // document root IS Laravel's public/ (Option A). For shared hosts
            // that force a separate public_html/ (Option B), set
            // PUBLIC_STORAGE_PATH in .env to the absolute path of the
            // web-served storage folder, e.g.
            //   PUBLIC_STORAGE_PATH=/home/user/domains/example.com/public_html/storage
            // env() returns empty string (not the default) when the var is
            // present-but-empty in .env, so use ?: to fall back to public_path()
            // for both unset AND empty-string cases.
            'root' => env('PUBLIC_STORAGE_PATH') ?: public_path('storage'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    // The 'links' array is intentionally empty. The 'public' disk above is
    // configured to write directly into the web-served storage folder, so the
    // `php artisan storage:link` symlink is NOT used in production (most
    // shared hosts disable symlink() anyway). Local development may still
    // create the traditional public/storage -> storage/app/public symlink by
    // hand if desired, but it is no longer required for uploads to work.
    'links' => [
        // public_path('storage') => storage_path('app/public'),
    ],

];
