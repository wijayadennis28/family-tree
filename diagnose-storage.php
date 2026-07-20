<?php
/**
 * Family Tree — Storage Diagnostic
 *
 * Upload this to your WEB ROOT (public_html/) and visit it in your browser:
 *
 *   https://family.digital-nest.tech/diagnose-storage.php
 *
 * NOTE: On Option B shared hosting, the hosting root (where family-tree-app/
 * lives) is NOT web-accessible — the web server only serves from public_html/.
 * So you MUST upload this file inside public_html/, not the hosting root.
 *
 * It will print the real absolute path PHP sees, the open_basedir limit,
 * whether the configured PUBLIC_STORAGE_PATH is writable, and attempt a
 * test file write — so you know EXACTLY why uploads fail.
 *
 * DELETE THIS FILE AFTER USE. It exposes server paths (not secrets, but
 * still best removed).
 */

header('Content-Type: text/html; charset=utf-8');

/* -----------------------------------------------------------------
 * 1. Try to locate and read the .env file
 * ----------------------------------------------------------------- */
$envCandidates = [
    __DIR__ . '/family-tree-app/.env',
    __DIR__ . '/../family-tree-app/.env',
    __DIR__ . '/.env',
];

$envPath = null;
$envLines = [];
foreach ($envCandidates as $candidate) {
    if (is_file($candidate)) {
        $envPath = $candidate;
        $envLines = file($candidate, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        break;
    }
}

$envValue = '';
if ($envLines) {
    foreach ($envLines as $line) {
        if (preg_match('/^\s*PUBLIC_STORAGE_PATH\s*=\s*(.*)$/', $line, $m)) {
            $envValue = trim($m[1], " \t\"'");
            break;
        }
    }
}

/* -----------------------------------------------------------------
 * 2. Gather server environment facts
 * ----------------------------------------------------------------- */
$facts = [
    'PHP version'              => PHP_VERSION,
    'This script __DIR__'      => __DIR__,
    'Realpath of __DIR__'      => realpath(__DIR__) ?: '(not resolvable)',
    'getcwd()'                 => getcwd(),
    'open_basedir (ini)'       => ini_get('open_basedir') ?: '(not set — no restriction)',
    'upload_tmp_dir (ini)'     => ini_get('upload_tmp_dir') ?: '(system default)',
    'PHP temp dir (sys_get)'   => sys_get_temp_dir(),
    'PHP process user'         => function_exists('posix_getpwuid')
                                    ? (@posix_getpwuid(posix_geteuid())['name'] ?? '(unknown)')
                                    : '(posix extension disabled)',
    'PHP process UID'          => function_exists('posix_geteuid') ? posix_geteuid() : '(unknown)',
    '.env file found at'       => $envPath ?: '(not found — checked: ' . implode(', ', $envCandidates) . ')',
    'PUBLIC_STORAGE_PATH (.env)' => $envValue !== '' ? $envValue : '(empty or not set)',
];

/* -----------------------------------------------------------------
 * 3. Resolve the candidate storage root
 * ----------------------------------------------------------------- */
$candidates = [];
if ($envValue !== '') {
    $candidates['PUBLIC_STORAGE_PATH (from .env)'] = $envValue;
}
// Common shared-host absolute path patterns derived from __DIR__.
// __DIR__ always returns the REAL absolute path PHP sees (including any
// /home/USERNAME/ prefix), so these candidates will reveal the true path
// even if your File Manager shows a shorter form like /domains/...
//
// These cover BOTH upload locations: inside public_html/ (Option B web root)
// or at the hosting root (Option A / if accessible).
$parent = dirname(__DIR__);
// If uploaded to public_html/ — this is the natural storage path right next to the script:
$candidates['__DIR__ + /storage (inside public_html)']      = __DIR__ . '/storage';
// If uploaded to public_html/ — go up one level and back into public_html/storage:
$candidates['parent of this script + /public_html/storage'] = $parent . '/public_html/storage';
// If uploaded to the hosting root (parent of public_html/):
$candidates['__DIR__ + /public_html/storage']               = __DIR__ . '/public_html/storage';
// Laravel's own private public/storage (what public_path() returns) — included for comparison:
$candidates['__DIR__ + /family-tree-app/public/storage']     = __DIR__ . '/family-tree-app/public/storage';
// Laravel's storage/app/public (the OLD default before the fix) — for comparison:
$candidates['parent + /family-tree-app/storage/app/public']  = $parent . '/family-tree-app/storage/app/public';

/* -----------------------------------------------------------------
 * 4. Test each candidate
 * ----------------------------------------------------------------- */
$tests = [];
foreach ($candidates as $label => $path) {
    $row = [
        'label'        => $label,
        'path'         => $path,
        'realpath'     => realpath($path) ?: '(does not resolve)',
        'exists'       => file_exists($path) ? 'YES' : 'NO',
        'is_dir'       => is_dir($path) ? 'YES' : 'NO',
        'is_writable'  => is_writable($path) ? 'YES' : 'NO',
        'perm'         => file_exists($path) ? substr(sprintf('%o', fileperms($path)), -4) : '—',
        'owner'        => function_exists('posix_getpwuid') && file_exists($path)
                            ? (@posix_getpwuid(fileowner($path))['name'] ?? '(unknown)')
                            : '(unknown)',
        'within_basedir' => checkBasedir($path),
        'write_test'   => 'not run',
    ];

    // Try to create a test directory + write a test file.
    if (is_dir($path)) {
        $testDir  = rtrim($path, '/') . '/_diagnose_test';
        $testFile = $testDir . '/test.txt';
        $okMkdir  = @mkdir($testDir, 0755, true);
        if ($okMkdir || is_dir($testDir)) {
            $written = @file_put_contents($testFile, "diagnostic ok " . date('c'));
            $row['write_test'] = $written !== false
                ? "SUCCESS — wrote $written bytes to $testFile"
                : "FAILED to write file (mkdir ok but file_put_contents failed)";
            // Cleanup
            @unlink($testFile);
            @rmdir($testDir);
        } else {
            $err = error_get_last();
            $row['write_test'] = 'FAILED to create subdirectory: ' . ($err['message'] ?? 'unknown');
        }
    } else {
        // Try to create the whole path
        $okMkdir = @mkdir($path, 0755, true);
        if ($okMkdir) {
            $row['write_test'] = 'CREATED the missing directory successfully (now exists)';
            $row['exists'] = 'YES (just created)';
            $row['is_dir'] = 'YES';
            $row['is_writable'] = is_writable($path) ? 'YES' : 'NO';
        } else {
            $err = error_get_last();
            $row['write_test'] = 'FAILED to create directory: ' . ($err['message'] ?? 'unknown');
        }
    }

    $tests[] = $row;
}

/* -----------------------------------------------------------------
 * 5. Render
 * ----------------------------------------------------------------- */
function checkBasedir($path) {
    $basedir = ini_get('open_basedir');
    if (!$basedir) return 'no restriction';
    $basedirs = array_map('trim', explode(PATH_SEPARATOR, $basedir));
    foreach ($basedirs as $b) {
        if (strpos($path, $b) === 0) return 'YES (within ' . $b . ')';
    }
    return 'NO — BLOCKED by open_basedir';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Family Tree — Storage Diagnostic</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 980px; margin: 30px auto; padding: 0 20px; color: #1e293b; }
  h1 { font-size: 1.4rem; }
  h2 { font-size: 1.1rem; margin-top: 2rem; border-bottom: 2px solid #e2e8f0; padding-bottom: .3rem; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 600; }
  code { background: #f1f5f9; padding: 1px 5px; border-radius: 3px; font-size: 12px; word-break: break-all; }
  .ok { color: #16a34a; font-weight: 700; }
  .bad { color: #dc2626; font-weight: 700; }
  .warn { color: #d97706; font-weight: 700; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; }
  .action { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin-top: 8px; }
  .sec { background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; margin-top: 24px; }
</style>
</head>
<body>
  <h1>🔧 Family Tree — Storage Diagnostic</h1>
  <p>This script checks whether PHP can write to your storage folder. Use it to find the correct <code>PUBLIC_STORAGE_PATH</code> for your <code>.env</code>.</p>

  <h2>1. Server Environment Facts</h2>
  <table>
    <tbody>
      <?php foreach ($facts as $k => $v): ?>
        <tr><th style="width:35%"><?= htmlspecialchars($k) ?></th><td><code><?= htmlspecialchars($v) ?></code></td></tr>
      <?php endforeach; ?>
    </tbody>
  </table>

  <h2>2. Storage Path Candidates</h2>
  <p>Each candidate is tested for existence, writability, and a real write test.</p>
  <?php foreach ($tests as $t): ?>
    <div class="card">
      <table>
        <tbody>
          <tr><th style="width:35%">Source</th><td><?= htmlspecialchars($t['label']) ?></td></tr>
          <tr><th>Path</th><td><code><?= htmlspecialchars($t['path']) ?></code></td></tr>
          <tr><th>Realpath</th><td><code><?= htmlspecialchars($t['realpath']) ?></code></td></tr>
          <tr><th>Exists</th><td class="<?= $t['exists']==='YES'||str_starts_with($t['exists'],'YES')?'ok':'bad' ?>"><?= htmlspecialchars($t['exists']) ?></td></tr>
          <tr><th>Is directory</th><td class="<?= $t['is_dir']==='YES'?'ok':'bad' ?>"><?= htmlspecialchars($t['is_dir']) ?></td></tr>
          <tr><th>Is writable</th><td class="<?= $t['is_writable']==='YES'?'ok':'bad' ?>"><?= htmlspecialchars($t['is_writable']) ?></td></tr>
          <tr><th>Permissions</th><td><code><?= htmlspecialchars($t['perm']) ?></code></td></tr>
          <tr><th>Owner</th><td><?= htmlspecialchars($t['owner']) ?></td></tr>
          <tr><th>open_basedir</th><td class="<?= str_starts_with($t['within_basedir'],'YES')?'ok':(str_starts_with($t['within_basedir'],'NO')?'bad':'warn') ?>"><?= htmlspecialchars($t['within_basedir']) ?></td></tr>
          <tr><th>Write test</th><td class="<?= str_starts_with($t['write_test'],'SUCCESS')||str_starts_with($t['write_test'],'CREATED')?'ok':'bad' ?>"><?= htmlspecialchars($t['write_test']) ?></td></tr>
        </tbody>
      </table>
    </div>
  <?php endforeach; ?>

  <h2>3. How to read this</h2>
  <div class="action">
    <p><strong>Find the candidate where <span class="ok">Write test = SUCCESS</span> and <span class="ok">Is writable = YES</span>.</strong></p>
    <p>Copy its <code>Realpath</code> value (preferred — it resolves symlinks and is what PHP actually uses; if Realpath says "does not resolve" use <code>Path</code> instead) into your <code>.env</code> as:</p>
    <pre>PUBLIC_STORAGE_PATH=<em>(the realpath that showed SUCCESS)</em></pre>
  </div>
  <div class="action">
    <p>If a path shows <span class="bad">NO — BLOCKED by open_basedir</span>, PHP is locked out of that folder by your host. You must use a path that is <span class="ok">within</span> the open_basedir value shown above.</p>
  </div>
  <div class="action">
    <p>If a path shows <span class="bad">FAILED to create directory</span> but <span class="ok">within_basedir = YES</span>, the folder is not writable by PHP. Try setting permissions to <code>775</code> via your File Manager, or contact hosting support.</p>
  </div>
  <div class="action">
    <p>If the realpath differs from what your File Manager shows, use the <strong>realpath</strong> value — that's the true absolute path PHP sees. The <code>__DIR__</code>-derived candidates above will already include any <code>/home/USERNAME/</code> prefix your host requires.</p>
  </div>

  <h2>4. Quick Laravel config check</h2>
  <div class="action">
    <p>After setting <code>PUBLIC_STORAGE_PATH</code>, also verify that <code>family-tree-app/config/filesystems.php</code> has this line in the <code>'public'</code> disk:</p>
    <pre>'root' => env('PUBLIC_STORAGE_PATH') ?: public_path('storage'),</pre>
    <p>If it still says <code>storage_path('app/public')</code>, you uploaded the OLD config file. Re-upload the fixed one.</p>
  </div>

  <div class="sec">
    <strong>🔒 Security:</strong> Delete this file (<code>diagnose-storage.php</code>) immediately after you're done. It exposes server paths.<br>
    If any test left a <code>_diagnose_test/</code> folder behind in your storage directory, you can safely delete it manually.
  </div>
</body>
</html>
