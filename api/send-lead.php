<?php
/**
 * Lead form endpoint for romart.ru
 *
 * Delivery order:
 * 1) Always log to leads.jsonl
 * 2) FormSubmit relay (external SMTP — Reg.ru mail() blackholes)
 * 3) Optional real SMTP if mail-config.php is filled
 * 4) PHP mail() last-resort fallback
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method']);
    exit;
}

// Honeypot — bots fill this; humans never see it
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

$recipients = ['zotova@romart.ru', 'info@romart.info'];
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

$fromEmail = 'noreply@romart.ru';
$fromName = 'ROMART';
$reply = $email !== '' ? $email : $fromEmail;

$config = [];
$configPath = __DIR__ . '/mail-config.php';
if (is_readable($configPath)) {
    $loaded = include $configPath;
    if (is_array($loaded)) {
        $config = $loaded;
    }
}
if (!empty($config['to']) && is_array($config['to'])) {
    $recipients = $config['to'];
}

$mailed = false;
$mailVia = 'none';
$activationNeeded = false;
$relayDetails = [];

// 1) External FormSubmit relay (bypasses broken hosting mail())
foreach ($recipients as $to) {
    $to = trim((string) $to);
    if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        continue;
    }
    $result = romart_formsubmit_send($to, $name, $phone, $email, $subject, $body, $id);
    $relayDetails[$to] = $result;
    if ($result === 'ok') {
        $mailed = true;
        $mailVia = 'formsubmit';
    } elseif ($result === 'needs_activation') {
        $activationNeeded = true;
        $mailVia = 'formsubmit-activation';
    }
}

// 2) Optional SMTP from mail-config.php
if (!$mailed && !empty($config['smtp_host']) && !empty($config['smtp_user']) && !empty($config['smtp_pass'])) {
    foreach ($recipients as $to) {
        $to = trim((string) $to);
        if ($to === '') {
            continue;
        }
        if (romart_smtp_send($config, $to, $subject, $body, $fromEmail, $fromName, $reply)) {
            $mailed = true;
            $mailVia = 'smtp';
            break;
        }
    }
    if (!$mailed) {
        $mailVia = 'smtp-failed';
    }
}

// 3) PHP mail() last resort (often blackholed on this host)
if (!$mailed) {
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
    $toHeader = implode(', ', $recipients);
    $sent = @mail($toHeader, $encodedSubject, $body, implode("\r\n", $headers));
    if ($sent) {
        // Hosting often returns true without delivery — do not treat as reliable success
        $mailVia = 'mail-unreliable';
    } else {
        $mailVia = ($mailVia === 'formsubmit-activation') ? 'formsubmit-activation' : 'mail-failed';
    }
}

if ($logged && $logFile) {
    $statusLine = json_encode([
        'id' => $id,
        'time' => date('c'),
        'event' => 'mail_result',
        'mailed' => $mailed,
        'via' => $mailVia,
        'activation' => $activationNeeded,
        'relay' => $relayDetails,
    ], JSON_UNESCAPED_UNICODE) . "\n";
    @file_put_contents($logFile, $statusLine, FILE_APPEND | LOCK_EX);
}

// UI success if we logged the lead OR relay accepted / activation email queued
if ($logged || $mailed || $activationNeeded) {
    echo json_encode([
        'ok' => true,
        'id' => $id,
        'mailed' => $mailed,
        'via' => $mailVia,
        'activation' => $activationNeeded,
    ]);
    exit;
}

http_response_code(500);
echo json_encode(['ok' => false, 'error' => 'send']);
exit;

/**
 * Send via FormSubmit.co (external mail infrastructure).
 * Returns: 'ok' | 'needs_activation' | 'fail'
 */
function romart_formsubmit_send($toEmail, $name, $phone, $email, $subject, $body, $id)
{
    if (!function_exists('curl_init')) {
        return 'fail';
    }

    $payload = [
        'name' => $name,
        'email' => $email !== '' ? $email : 'noreply@romart.ru',
        'phone' => $phone,
        'message' => $body,
        'lead_id' => $id,
        '_subject' => $subject,
        '_template' => 'table',
        '_captcha' => 'false',
    ];
    if ($email !== '') {
        $payload['_replyto'] = $email;
    }

    $ch = curl_init('https://formsubmit.co/ajax/' . rawurlencode($toEmail));
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
            'Origin: https://romart.ru',
            'Referer: https://romart.ru/',
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    ]);
    $raw = curl_exec($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http < 200 || $http >= 300 || $raw === false) {
        return 'fail';
    }

    $json = json_decode((string) $raw, true);
    if (!is_array($json)) {
        return 'fail';
    }

    $success = $json['success'] ?? null;
    $message = (string) ($json['message'] ?? '');

    if ($success === true || $success === 'true') {
        return 'ok';
    }
    if (stripos($message, 'Activation') !== false || stripos($message, 'Activate Form') !== false) {
        return 'needs_activation';
    }
    return 'fail';
}

/**
 * Minimal SMTP client (LOGIN) for Reg.ru / similar hosting.
 */
function romart_smtp_send(array $config, $to, $subject, $body, $fromEmail, $fromName, $replyTo)
{
    $host = (string) $config['smtp_host'];
    $port = (int) ($config['smtp_port'] ?? 465);
    $secure = strtolower((string) ($config['smtp_secure'] ?? 'ssl'));
    $user = (string) $config['smtp_user'];
    $pass = (string) $config['smtp_pass'];
    $timeout = (int) ($config['smtp_timeout'] ?? 20);

    $remote = $host;
    if ($secure === 'ssl') {
        $remote = 'ssl://' . $host;
    }

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
        $greeting = $read();
        if (!$ok($greeting, '220')) {
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
            $resp = $cmd('STARTTLS');
            if (!$ok($resp, '220')) {
                fclose($fp);
                return false;
            }
            if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                fclose($fp);
                return false;
            }
            $resp = $cmd('EHLO ' . $ehloHost);
            if (!$ok($resp, '250')) {
                fclose($fp);
                return false;
            }
        }

        $resp = $cmd('AUTH LOGIN');
        if (!$ok($resp, '334')) {
            fclose($fp);
            return false;
        }
        $resp = $cmd(base64_encode($user));
        if (!$ok($resp, '334')) {
            fclose($fp);
            return false;
        }
        $resp = $cmd(base64_encode($pass));
        if (!$ok($resp, '235')) {
            fclose($fp);
            return false;
        }

        $resp = $cmd('MAIL FROM:<' . $fromEmail . '>');
        if (!$ok($resp, '250')) {
            fclose($fp);
            return false;
        }
        $resp = $cmd('RCPT TO:<' . $to . '>');
        if (!$ok($resp, '250')) {
            fclose($fp);
            return false;
        }
        $resp = $cmd('DATA');
        if (!$ok($resp, '354')) {
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
