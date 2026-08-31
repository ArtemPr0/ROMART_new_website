<?php
/**
 * Copy to mail-config.php on the server (same folder as send-lead.php).
 * Do NOT commit real secrets.
 *
 * Preferred for Russia (pick at least one):
 *
 * A) Telegram bot (fastest, works in RF):
 *    1. Open @BotFather in Telegram → /newbot → get token
 *    2. Message the bot, or add it to a group
 *    3. Get chat_id via https://api.telegram.org/bot<TOKEN>/getUpdates
 *    4. Fill telegram_bot_token + telegram_chat_id below
 *
 * B) SMTP mailbox (real email to info@romart.info):
 *    Ask Petr/Reg.ru for password of info@romart.info (or noreply@romart.ru)
 *    Typical Reg.ru:
 *      smtp_host => mail.hosting.reg.ru
 *      smtp_port => 465
 *      smtp_secure => ssl
 */
return [
    'to' => ['info@romart.info'],
    'from_email' => 'noreply@romart.ru',
    'from_name' => 'ROMART',
    'leads_view_password' => 'romart2026',

    // Telegram (recommended for RF)
    'telegram_bot_token' => '',
    'telegram_chat_id' => '',

    // SMTP (recommended for email)
    'smtp_host' => '',
    'smtp_port' => 465,
    'smtp_secure' => 'ssl',
    'smtp_user' => '',
    'smtp_pass' => '',
];
