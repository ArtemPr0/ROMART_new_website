<?php
/**
 * Copy to mail-config.php on the server (same folder as send-lead.php).
 * Do NOT commit real secrets.
 *
 * Petr (smtp.bz): send From zotova@romart.ru → To info@romart.info
 *   smtp_host => connect.smtp.bz
 *   smtp_port => 465
 *   smtp_secure => ssl
 *   smtp_user => r.ignatenko@romart.ru
 *   smtp_pass => (from Petr)
 */
return [
    'to' => ['info@romart.info'],
    'from_email' => 'zotova@romart.ru',
    'from_name' => 'ROMART сайт',
    'leads_view_password' => 'romart2026',

    'telegram_bot_token' => '',
    'telegram_chat_id' => '',

    'smtp_host' => 'connect.smtp.bz',
    'smtp_port' => 465,
    'smtp_secure' => 'ssl',
    'smtp_user' => 'r.ignatenko@romart.ru',
    'smtp_pass' => '',
];
