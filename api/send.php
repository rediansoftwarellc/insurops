<?php
/**
 * InsurOps — Form submission handler
 * Handles both demo requests and partner applications.
 * POST /api/send.php  →  { ok: true } | { ok: false, error: "..." }
 */

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception as MailException;

// ── Output headers ───────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// ── Only accept POST ─────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['ok' => false, 'error' => 'Method not allowed.']));
}

// ── Parse JSON body ──────────────────────────────────────────
$raw   = file_get_contents('php://input');
$input = json_decode($raw ?: '{}', true);
if (!is_array($input)) {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'error' => 'Invalid request body.']));
}

// ── Rate limiting (IP-based, file-backed) ────────────────────
function checkRateLimit(): bool
{
    // Get real client IP (works behind Cloudflare / load balancers)
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP']
        ?? $_SERVER['HTTP_X_FORWARDED_FOR']
        ?? $_SERVER['REMOTE_ADDR']
        ?? 'unknown';
    $ip   = trim(explode(',', $ip)[0]);
    $ip   = preg_replace('/[^a-f0-9:.]/', '', $ip);  // sanitise

    $file = sys_get_temp_dir() . '/io_rl_' . md5($ip);
    $now  = time();

    $data = ['count' => 0, 'reset' => $now + RATE_LIMIT_WINDOW];

    if (file_exists($file)) {
        $stored = json_decode((string) file_get_contents($file), true);
        if (is_array($stored) && $now < $stored['reset']) {
            $data = $stored;
        }
    }

    if ($data['count'] >= RATE_LIMIT_MAX) {
        return false;
    }

    $data['count']++;
    file_put_contents($file, json_encode($data), LOCK_EX);
    return true;
}

if (!checkRateLimit()) {
    http_response_code(429);
    exit(json_encode(['ok' => false, 'error' => 'Too many submissions. Please try again in a few minutes.']));
}

// ── Input validation ─────────────────────────────────────────
$type    = $input['type']    ?? '';
$name    = trim((string)($input['name']    ?? ''));
$email   = trim((string)($input['email']   ?? ''));
$company = trim((string)($input['company'] ?? ''));
$token   = (string)($input['recaptchaToken'] ?? '');

if (!in_array($type, ['demo', 'partner'], true)) {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'error' => 'Invalid form type.']));
}
if ($name === '' || $email === '' || $company === '') {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'error' => 'Missing required fields.']));
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'error' => 'Invalid email address.']));
}

// ── reCAPTCHA v3 verification ────────────────────────────────
function verifyRecaptcha(string $token): bool
{
    $secret = RECAPTCHA_SECRET;
    if ($secret === '') {
        return true;   // skip check if not configured (useful for local dev)
    }

    $ctx = stream_context_create([
        'http' => [
            'method'  => 'POST',
            'header'  => 'Content-Type: application/x-www-form-urlencoded',
            'content' => http_build_query([
                'secret'   => $secret,
                'response' => $token,
                'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '',
            ]),
            'timeout' => 10,
        ],
    ]);

    $result = @file_get_contents(
        'https://www.google.com/recaptcha/api/siteverify',
        false,
        $ctx
    );

    if ($result === false) {
        return true;   // if Google is unreachable, allow through
    }

    $data  = json_decode($result, true);
    $score = (float)($data['score'] ?? 0);

    return ($data['success'] ?? false) === true && $score >= 0.5;
}

if (!verifyRecaptcha($token)) {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'error' => 'Security check failed. Please refresh and try again.']));
}

// ── Build email content ──────────────────────────────────────
$isDemo     = ($type === 'demo');
$labelMap   = [
    'name'         => 'Full Name',
    'email'        => 'Email',
    'company'      => $isDemo ? 'Company' : 'Insurer / Company',
    'phone'        => 'Phone',
    'country'      => $isDemo ? 'Country' : 'Primary Market',
    'size'         => 'Team Size',
    'role'         => 'Role',
    'insurer_type' => 'Type of Insurer',
    'gwp'          => 'Annual GWP',
    'num_products' => 'No. of Products',
    'source'       => 'How They Heard',
    'message'      => $isDemo ? 'Goals' : 'Partnership Goals',
];

$skipKeys = ['type', 'recaptchaToken'];
$subject  = $isDemo
    ? 'InsurOps Demo Request — ' . $company
    : 'InsurOps Partner Application — ' . $company;

// HTML rows
$rows = '';
$text = $subject . "\n\n";
foreach ($labelMap as $key => $label) {
    if (in_array($key, $skipKeys, true)) continue;
    $val = trim((string)($input[$key] ?? ''));
    if ($val === '') continue;
    $valHtml = htmlspecialchars($val, ENT_QUOTES, 'UTF-8');
    $rows   .= "
        <tr>
          <td style=\"padding:10px 16px;color:#64748b;font-size:13px;white-space:nowrap;
                      vertical-align:top;border-bottom:1px solid #f1f5f9\">{$label}</td>
          <td style=\"padding:10px 16px;font-size:13px;color:#0f172a;
                      vertical-align:top;border-bottom:1px solid #f1f5f9\"><strong>{$valHtml}</strong></td>
        </tr>";
    $text .= "{$label}: {$val}\n";
}

$typeLabel = $isDemo ? 'New Demo Request' : 'New Partner Application';
$html = <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f8fafc;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto">
    <div style="background:#060E1E;padding:24px 28px;border-radius:10px 10px 0 0">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;
                  text-transform:uppercase;color:#3B82F6;margin-bottom:8px">
        {$typeLabel}
      </div>
      <h1 style="margin:0;font-size:18px;font-weight:800;color:white;
                 letter-spacing:-0.3px">{$subject}</h1>
    </div>
    <table style="width:100%;border-collapse:collapse;background:white;
                  border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px">
      {$rows}
    </table>
    <p style="margin-top:16px;font-size:11px;color:#94a3b8;text-align:center">
      Submitted via insurops.tech &middot; Reply-To: {$email}
    </p>
  </div>
</body>
</html>
HTML;

$text .= "\nSubmitted via insurops.tech";

// ── Send via PHPMailer ───────────────────────────────────────
$mail = new PHPMailer(true);

try {
    // Server settings
    $mail->isSMTP();
    $mail->Host       = SMTP_HOST;
    $mail->SMTPAuth   = true;
    $mail->Username   = SMTP_USER;
    $mail->Password   = SMTP_PASS;
    $mail->SMTPSecure = SMTP_SECURE;   // 'tls' = STARTTLS
    $mail->Port       = SMTP_PORT;
    $mail->CharSet    = PHPMailer::CHARSET_UTF8;

    // Addresses
    $mail->setFrom(SMTP_FROM, SMTP_FROM_NAME);
    $mail->addAddress(SMTP_TO);
    $mail->addReplyTo($email, $name);

    // Content
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body    = $html;
    $mail->AltBody = $text;

    $mail->send();

    exit(json_encode(['ok' => true]));

} catch (MailException $e) {
    error_log('[InsurOps] PHPMailer error: ' . $mail->ErrorInfo);
    http_response_code(500);
    exit(json_encode(['ok' => false, 'error' => 'Could not send email. Please try again shortly.']));
}
