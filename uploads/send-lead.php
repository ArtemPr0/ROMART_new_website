<?php
/**
 * Lead form endpoint for romart.ru
 *
 * Delivery (Russia-safe):
 * 1) Always log to leads.jsonl
 * 2) Telegram bot notify (if mail-config.php has token + chat_id) — works in RF
 * 3) Optional SMTP (mail-config.php) — reliable email when Petr provides mailbox password
 * 4) PHP mail() last resort (often blackholed on this host — not trusted alone)
 *
 * FormSubmit was removed: activation links expire / fail to open from Russia.
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method']);
    exit;
}

if (!empty($_POST['romart_hp']) || !empty($_POST['website'])) {
    echo json_encode(['ok' => true, 'skipped' => true]);
    exit;
}

$name = trim((string) ($_POST['name'] ?? ''));
$phone = trim((string) ($_POST['phone'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));

if ($name === '' || $phone === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'required']);
    exit;
}

if (mb_strlen($name) > 200 || mb_strlen($phone) > 80 || mb_strlen($email) > 200) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'length']);
    exit;
}

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'email']);
    exit;
}

foreach ([$name, $phone, $email] as $value) {
    if (preg_match('/[\r\n]/', $value)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'invalid']);
        exit;
    }
}

$now = date('c');
$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
$id = bin2hex(random_bytes(8));

$record = [
    'id' => $id,
    'time' => $now,
    'name' => $name,
    'phone' => $phone,
    'email' => $email,
    'ip' => $ip,
    'ua' => substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 240),
];

$logCandidates = [
    __DIR__ . '/leads.jsonl',
    __DIR__ . '/../tmp/leads.jsonl',
    sys_get_temp_dir() . '/romart-leads.jsonl',
];
$logFile = null;
$logged = false;
$logLine = json_encode($record, JSON_UNESCAPED_UNICODE) . "\n";
foreach ($logCandidates as $candidate) {
    $dir = dirname($candidate);
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    if (@file_put_contents($candidate, $logLine, FILE_APPEND | LOCK_EX) !== false) {
        $logFile = $candidate;
        $logged = true;
        break;
    }
}

$config = [];
$configPath = __DIR__ . '/mail-config.php';
if (is_readable($configPath)) {
    $loaded = include $configPath;
    if (is_array($loaded)) {
        $config = $loaded;
    }
}

// Single inbox per team decision (Марина 31.08)
$recipients = ['info@romart.info'];
if (!empty($config['to']) && is_array($config['to']) && count($config['to']) > 0) {
    $recipients = $config['to'];
}

$subject = 'Заявка с сайта ROMART — ' . $name . ' — ' . date('d.m.Y H:i:s');
$body = "Новая заявка с romart.ru\n";
$body .= "ID: {$id}\n";
$body .= "Имя: {$name}\n";
$body .= "Телефон: {$phone}\n";
if ($email !== '') {
    $body .= "Email: {$email}\n";
}
$body .= "IP: {$ip}\n";
$body .= "Время: {$now}\n";

$fromEmail = (string) ($config['from_email'] ?? 'noreply@romart.ru');
$fromName = (string) ($config['from_name'] ?? 'ROMART');
$reply = $email !== '' ? $email : $fromEmail;

$channels = [];
$delivered = false;

// 1) Telegram — reliable in Russia
$tg = romart_telegram_send($config, $body);
$channels['telegram'] = $tg;
if ($tg === 'ok') {
    $delivered = true;
}

// 2) SMTP if configured
$smtpOk = false;
if (!empty($config['smtp_host']) && !empty($config['smtp_user']) && !empty($config['smtp_pass'])) {
    foreach ($recipients as $to) {
        $to = trim((string) $to);
        if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            continue;
        }
        if (romart_smtp_send($config, $to, $subject, $body, $fromEmail, $fromName, $reply)) {
            $smtpOk = true;
            $delivered = true;
            break;
        }
    }
}
$channels['smtp'] = $smtpOk ? 'ok' : (!empty($config['smtp_host']) ? 'fail' : 'skipped');

// 3) PHP mail() — not trusted on this host, but try anyway
$mailOk = false;
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: ' . $fromName . ' <' . $fromEmail . '>',
    'Reply-To: ' . $reply,
    'Message-ID: <' . $id . '@romart.ru>',
    'X-Mailer: ROMART-Lead-Form',
];
$toHeader = implode(', ', array_filter($recipients));
if ($toHeader !== '') {
    $mailOk = (bool) @mail($toHeader, $encodedSubject, $body, implode("\r\n", $headers));
}
$channels['mail'] = $mailOk ? 'attempted' : 'fail';

if ($logged && $logFile) {
    $statusLine = json_encode([
        'id' => $id,
        'time' => date('c'),
        'event' => 'mail_result',
        'delivered' => $delivered,
        'channels' => $channels,
        'to' => $recipients,
    ], JSON_UNESCAPED_UNICODE) . "\n";
    @file_put_contents($logFile, $statusLine, FILE_APPEND | LOCK_EX);
}

// Success if logged (lead captured) OR any reliable channel delivered
if ($logged || $delivered) {
    echo json_encode([
        'ok' => true,
        'id' => $id,
        'delivered' => $delivered,
        'channels' => $channels,
    ]);
    exit;
}

http_response_code(500);
echo json_encode(['ok' => false, 'error' => 'send']);
exit;

function romart_telegram_send(array $config, $text)
{
    $token = trim((string) ($config['telegram_bot_token'] ?? ''));
    $chatId = trim((string) ($config['telegram_chat_id'] ?? ''));
    if ($token === '' || $chatId === '' || !function_exists('curl_init')) {
        return 'skipped';
    }

    $url = 'https://api.telegram.org/bot' . rawurlencode($token) . '/sendMessage';
    $payload = [
        'chat_id' => $chatId,
        'text' => $text,
        'disable_web_page_preview' => true,
    ];
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    ]);
    $raw = curl_exec($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($http < 200 || $http >= 300 || $raw === false) {
        return 'fail';
    }
    $json = json_decode((string) $raw, true);
    return (!empty($json['ok'])) ? 'ok' : 'fail';
}

function romart_smtp_send(array $config, $to, $subject, $body, $fromEmail, $fromName, $replyTo)
{
    $host = (string) $config['smtp_host'];
    $port = (int) ($config['smtp_port'] ?? 465);
    $secure = strtolower((string) ($config['smtp_secure'] ?? 'ssl'));
    $user = (string) $config['smtp_user'];
    $pass = (string) $config['smtp_pass'];
    $timeout = (int) ($config['smtp_timeout'] ?? 20);

    $remote = ($secure === 'ssl') ? ('ssl://' . $host) : $host;
    $fp = @stream_socket_client($remote . ':' . $port, $errno, $errstr, $timeout);
    if (!$fp) {
        return false;
    }
    stream_set_timeout($fp, $timeout);

    $read = function () use ($fp) {
        $data = '';
        while ($line = fgets($fp, 512)) {
            $data .= $line;
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        return $data;
    };
    $cmd = function ($line) use ($fp, $read) {
        fwrite($fp, $line . "\r\n");
        return $read();
    };
    $ok = function ($resp, $code) {
        return strpos((string) $resp, (string) $code) === 0;
    };

    try {
        if (!$ok($read(), '220')) {
            fclose($fp);
            return false;
        }
        $ehloHost = 'romart.ru';
        $resp = $cmd('EHLO ' . $ehloHost);
        if (!$ok($resp, '250')) {
            $resp = $cmd('HELO ' . $ehloHost);
            if (!$ok($resp, '250')) {
                fclose($fp);
                return false;
            }
        }
        if ($secure === 'tls') {
            if (!$ok($cmd('STARTTLS'), '220')) {
                fclose($fp);
                return false;
            }
            if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                fclose($fp);
                return false;
            }
            if (!$ok($cmd('EHLO ' . $ehloHost), '250')) {
                fclose($fp);
                return false;
            }
        }
        if (!$ok($cmd('AUTH LOGIN'), '334')) {
            fclose($fp);
            return false;
        }
        if (!$ok($cmd(base64_encode($user)), '334')) {
            fclose($fp);
            return false;
        }
        if (!$ok($cmd(base64_encode($pass)), '235')) {
            fclose($fp);
            return false;
        }
        if (!$ok($cmd('MAIL FROM:<' . $fromEmail . '>'), '250')) {
            fclose($fp);
            return false;
        }
        if (!$ok($cmd('RCPT TO:<' . $to . '>'), '250')) {
            fclose($fp);
            return false;
        }
        if (!$ok($cmd('DATA'), '354')) {
            fclose($fp);
            return false;
        }
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $encodedFrom = '=?UTF-8?B?' . base64_encode($fromName) . '?= <' . $fromEmail . '>';
        $headers = [
            'Date: ' . date('r'),
            'From: ' . $encodedFrom,
            'Reply-To: ' . $replyTo,
            'To: <' . $to . '>',
            'Subject: ' . $encodedSubject,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
            'Message-ID: <' . bin2hex(random_bytes(8)) . '@romart.ru>',
        ];
        $data = implode("\r\n", $headers) . "\r\n\r\n" . str_replace(["\r\n.", "\n."], ["\r\n..", "\n.."], $body);
        fwrite($fp, $data . "\r\n.\r\n");
        $resp = $read();
        $cmd('QUIT');
        fclose($fp);
        return $ok($resp, '250');
    } catch (Throwable $e) {
        try {
            fclose($fp);
        } catch (Throwable $e2) {
        }
        return false;
    }
}
