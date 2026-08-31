<?php
/**
 * Optional settings for lead emails / admin log viewer.
 * Copy to mail-config.php on the server and fill in.
 * Do NOT commit real passwords.
 *
 * Reg.ru SMTP (optional, after FormSubmit or instead of it):
 *   smtp_host => mail.hosting.reg.ru
 *   smtp_port => 465
 *   smtp_secure => ssl
 */
return [
    'to' => ['zotova@romart.ru', 'info@romart.info'],
    'leads_view_password' => 'romart2026',
    'smtp_host' => '',
    'smtp_port' => 465,
    'smtp_secure' => 'ssl',
    'smtp_user' => '',
    'smtp_pass' => '',
];
