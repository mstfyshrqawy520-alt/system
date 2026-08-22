<?php

require dirname(__DIR__) . '/vendor/autoload.php';

$app = require dirname(__DIR__) . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

try {
    $connection = app('db')->connection();
    $connection->getPdo();
    $integrity = $connection->selectOne('PRAGMA integrity_check')->integrity_check ?? null;
    $foreignKeyValue = $connection->selectOne('PRAGMA foreign_keys')->foreign_keys ?? null;
    $foreignKeyErrors = $connection->select('PRAGMA foreign_key_check');
    $purchaseRequests = $connection->table('purchase_requests')->count();
    $purchaseOrders = $connection->table('purchase_orders')->count();
    $notifications = $connection->table('notifications')->count();

    echo 'CONNECTION=' . $connection->getDriverName() . PHP_EOL;
    echo 'INTEGRITY_CHECK=' . $integrity . PHP_EOL;
    echo 'FOREIGN_KEYS_ENABLED=' . $foreignKeyValue . PHP_EOL;
    echo 'FOREIGN_KEY_ERRORS=' . count($foreignKeyErrors) . PHP_EOL;
    echo 'PURCHASE_REQUESTS=' . $purchaseRequests . PHP_EOL;
    echo 'PURCHASE_ORDERS=' . $purchaseOrders . PHP_EOL;
    echo 'NOTIFICATIONS=' . $notifications . PHP_EOL;

    if ($integrity !== 'ok' || count($foreignKeyErrors) > 0 || (string) $foreignKeyValue !== '1') {
        exit(1);
    }
} catch (Throwable $exception) {
    fwrite(STDERR, 'CHECK_ERROR=' . $exception->getMessage() . PHP_EOL);
    exit(1);
}
