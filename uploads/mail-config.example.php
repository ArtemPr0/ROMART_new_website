<?php
/**
 * Optional SMTP settings for lead emails.
 * Copy to mail-config.php on the server (same folder as send-lead.php) and fill in.
 * Do NOT commit real passwords.
 *
 * Reg.ru typical:
 *   smtp_host => mail.hosting.reg.ru
 *   smtp_port => 465
 *   smtp_secure => ssl
 */
return [
    'smtp_host' => '',
    'smtp_port' => 465,
    'smtp_secure' => 'ssl',
    'smtp_user' => '',
    'smtp_pass' => '',
];
