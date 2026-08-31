<?php
/**
 * Simple password-protected lead log viewer.
 * Default password: romart2026 (change in mail-config.php → leads_view_password)
 */
header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$config = [];
if (is_readable(__DIR__ . '/mail-config.php')) {
    $loaded = include __DIR__ . '/mail-config.php';
    if (is_array($loaded)) {
        $config = $loaded;
    }
}
$password = (string) ($config['leads_view_password'] ?? 'romart2026');

session_start();
if (isset($_POST['password'])) {
    if (hash_equals($password, (string) $_POST['password'])) {
        $_SESSION['romart_leads_ok'] = true;
    }
}
if (isset($_GET['logout'])) {
    unset($_SESSION['romart_leads_ok']);
    header('Location: leads-view.php');
    exit;
}

if (empty($_SESSION['romart_leads_ok'])) {
    echo '<!doctype html><meta charset="utf-8"><title>ROMART leads</title>';
    echo '<form method="post" style="font:16px/1.4 system-ui;max-width:360px;margin:10vh auto">';
    echo '<h1>Журнал заявок</h1>';
    echo '<p><input type="password" name="password" placeholder="Пароль" style="width:100%;padding:10px"></p>';
    echo '<button type="submit">Войти</button></form>';
    exit;
}

$logFile = __DIR__ . '/leads.jsonl';
$lines = is_readable($logFile) ? file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) : [];
$lines = array_reverse($lines);

echo '<!doctype html><meta charset="utf-8"><title>ROMART leads</title>';
echo '<style>body{font:14px/1.45 system-ui;margin:24px} table{border-collapse:collapse;width:100%} td,th{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top} th{background:#f5f5f5} .meta{color:#666;margin-bottom:16px}</style>';
echo '<p class="meta"><a href="?logout=1">Выйти</a> · файл: leads.jsonl · записей: ' . count($lines) . '</p>';
echo '<table><thead><tr><th>Время</th><th>Имя</th><th>Телефон</th><th>Email</th><th>Статус</th><th>ID</th></tr></thead><tbody>';

$leads = [];
$statuses = [];
foreach ($lines as $line) {
    $row = json_decode($line, true);
    if (!is_array($row) || empty($row['id'])) {
        continue;
    }
    if (($row['event'] ?? '') === 'mail_result') {
        $statuses[$row['id']] = $row;
        continue;
    }
    if (!isset($leads[$row['id']])) {
        $leads[$row['id']] = $row;
    }
}

foreach ($leads as $id => $row) {
    $st = $statuses[$id] ?? [];
    $status = '';
    if ($st) {
        $status = ($st['via'] ?? '') . ' / mailed=' . (!empty($st['mailed']) ? 'yes' : 'no');
        if (!empty($st['activation'])) {
            $status .= ' / NEED ACTIVATION';
        }
    }
    echo '<tr>';
    echo '<td>' . htmlspecialchars((string) ($row['time'] ?? ''), ENT_QUOTES, 'UTF-8') . '</td>';
    echo '<td>' . htmlspecialchars((string) ($row['name'] ?? ''), ENT_QUOTES, 'UTF-8') . '</td>';
    echo '<td>' . htmlspecialchars((string) ($row['phone'] ?? ''), ENT_QUOTES, 'UTF-8') . '</td>';
    echo '<td>' . htmlspecialchars((string) ($row['email'] ?? ''), ENT_QUOTES, 'UTF-8') . '</td>';
    echo '<td>' . htmlspecialchars($status, ENT_QUOTES, 'UTF-8') . '</td>';
    echo '<td>' . htmlspecialchars($id, ENT_QUOTES, 'UTF-8') . '</td>';
    echo '</tr>';
}
echo '</tbody></table>';
