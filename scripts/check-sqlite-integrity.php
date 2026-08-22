<?php

$databasePath = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'database.sqlite';
if (!is_file($databasePath)) {
    fwrite(STDERR, "DATABASE_FILE_NOT_FOUND\n");
    exit(2);
}

try {
    $pdo = new PDO('sqlite:' . $databasePath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $integrity = $pdo->query('PRAGMA integrity_check')->fetchColumn();
    $foreignKeys = $pdo->query('PRAGMA foreign_key_check')->fetchAll(PDO::FETCH_ASSOC);
    $journalMode = $pdo->query('PRAGMA journal_mode')->fetchColumn();
    $foreignKeysEnabled = $pdo->query('PRAGMA foreign_keys')->fetchColumn();
    $pageCount = $pdo->query('PRAGMA page_count')->fetchColumn();
    $pageSize = $pdo->query('PRAGMA page_size')->fetchColumn();

    echo 'INTEGRITY_CHECK=' . $integrity . PHP_EOL;
    echo 'FOREIGN_KEY_ERRORS=' . count($foreignKeys) . PHP_EOL;
    echo 'JOURNAL_MODE=' . $journalMode . PHP_EOL;
    echo 'FOREIGN_KEYS_ENABLED=' . $foreignKeysEnabled . PHP_EOL;
    echo 'DATABASE_PAGES=' . $pageCount . PHP_EOL;
    echo 'PAGE_SIZE=' . $pageSize . PHP_EOL;

    if (strtolower((string) $integrity) !== 'ok' || count($foreignKeys) > 0) {
        exit(1);
    }
} catch (Throwable $exception) {
    fwrite(STDERR, 'CHECK_ERROR=' . $exception->getMessage() . PHP_EOL);
    exit(1);
}
