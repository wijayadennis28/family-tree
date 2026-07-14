<?php
/**
 * Restore Super Admin User
 *
 * Run this script once to create or update the first Super Admin account.
 * It bootstraps Laravel just enough to use the User model and hashing.
 *
 * IMPORTANT:
 *   1. Upload this file to your Laravel public/ folder.
 *   2. Visit it once in your browser, e.g.
 *      https://yourdomain.com/restore-admin.php?email=admin@yourdomain.com&password=YourSecurePassword123!
 *   3. DELETE this file immediately after use.
 */

// Prevent accidental execution if somehow left on the server.
if (php_sapi_name() !== 'cli' && $_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    exit('Only GET requests are allowed.');
}

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

// Read credentials from query string or CLI arguments
$email = null;
$password = null;
$name = 'Super Admin';

if (php_sapi_name() === 'cli') {
    $email = $argv[1] ?? null;
    $password = $argv[2] ?? null;
} else {
    $email = $_GET['email'] ?? null;
    $password = $_GET['password'] ?? null;
    $name = $_GET['name'] ?? 'Super Admin';
}

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo "Usage:\n";
    echo "  Browser: https://yourdomain.com/restore-admin.php?email=admin@yourdomain.com&password=YourSecurePassword123!\n";
    echo "  CLI:     php restore-admin.php admin@yourdomain.com YourSecurePassword123!\n";
    exit(1);
}

try {
    $user = User::updateOrCreate(
        ['email' => $email],
        [
            'name' => $name,
            'password' => Hash::make($password),
            'role' => 'Super Admin',
            'is_active' => true,
        ]
    );

    echo "Super Admin user restored successfully.\n";
    echo "Email: {$user->email}\n";
    echo "Role: {$user->role}\n";
    echo "\nACTION REQUIRED: Delete this file immediately.\n";
} catch (Throwable $e) {
    http_response_code(500);
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
