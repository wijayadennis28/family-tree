<?php
/**
 * Helper to create the Laravel public/storage symlink.
 *
 * Run from the project root via CLI:
 *   php create-storage-symlink.php
 *
 * Or upload to public/ and visit via browser (paths will auto-detect).
 */

// Detect if we are inside public/ or at the project root.
$isInPublic = basename(__DIR__) === 'public';
$baseDir    = $isInPublic ? __DIR__ . '/..' : __DIR__;

$target = realpath($baseDir . '/storage/app/public') ?: $baseDir . '/storage/app/public';
$link   = $baseDir . '/public/storage';

if (is_link($link)) {
    echo 'Symlink already exists: ' . readlink($link) . PHP_EOL;
} elseif (is_dir($link)) {
    echo 'public/storage is a real directory. Delete it first, then rerun.' . PHP_EOL;
} else {
    if (symlink($target, $link)) {
        echo 'Symlink created successfully: public/storage -> ' . $target . PHP_EOL;
    } else {
        echo 'Could not create symlink. Check permissions or contact hosting support.' . PHP_EOL;
    }
}
