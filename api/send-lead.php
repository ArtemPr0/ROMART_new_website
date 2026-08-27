<?php
/**
 * Lead form endpoint for romart.ru
 * Accepts POST (name, phone, optional email) and emails zotova@romart.ru
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
if (!empty($_POST['website'])) {
    echo json_encode(['ok' => true]);
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

$to = 'zotova@romart.ru';
$subject = 'Заявка с сайта ROMART';
$body = "Имя: {$name}\nТелефон: {$phone}\n";
if ($email !== '') {
    $body .= "Email: {$email}\n";
}
$body .= "\nЗаявка с сайта romart.ru\n";
$body .= 'IP: ' . ($_SERVER['REMOTE_ADDR'] ?? '') . "\n";
$body .= 'Время: ' . date('c') . "\n";

$from = 'noreply@romart.ru';
$reply = $email !== '' ? $email : $from;
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: ROMART <' . $from . '>',
    'Reply-To: ' . $reply,
    'X-Mailer: ROMART-Lead-Form',
];

$sent = @mail($to, $encodedSubject, $body, implode("\r\n", $headers));

if (!$sent) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'send']);
    exit;
}

echo json_encode(['ok' => true]);
