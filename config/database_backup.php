<?php

return [
    'enabled' => (bool) env('DATABASE_EXCEL_BACKUP_ENABLED', true),
    'disk' => env('DATABASE_EXCEL_BACKUP_DISK', 'local'),
    'directory' => env('DATABASE_EXCEL_BACKUP_DIRECTORY', 'backups/database'),
    'include_tables' => env('DATABASE_EXCEL_BACKUP_TABLES', ''),
    'exclude_tables' => env('DATABASE_EXCEL_BACKUP_EXCLUDE_TABLES', 'personal_access_tokens,sessions,cache,cache_locks,jobs,job_batches,failed_jobs,password_reset_tokens'),
    'google_drive' => [
        'enabled' => (bool) env('DATABASE_EXCEL_BACKUP_GOOGLE_ENABLED', false),
        'folder_id' => env('GOOGLE_DRIVE_BACKUP_FOLDER_ID'),
        'client_id' => env('GOOGLE_DRIVE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_DRIVE_CLIENT_SECRET'),
        'refresh_token' => env('GOOGLE_DRIVE_REFRESH_TOKEN'),
    ],
];

