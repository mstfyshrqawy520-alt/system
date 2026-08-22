<?php

return [
    // Optional values injected by Render or the deployment pipeline.
    'version' => env('APP_VERSION'),
    'commit' => env('APP_COMMIT'),
    'deployed_at' => env('APP_DEPLOYED_AT'),
];
