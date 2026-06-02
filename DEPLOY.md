# Deploying InsurOps to Hostinger (PHP / Shared Hosting)

## Stack
- **Hosting**: Hostinger Shared Hosting (Business plan or above)
- **Language**: PHP 8.1+
- **Email**: ZeptoMail SMTP via PHPMailer
- **Spam protection**: Google reCAPTCHA v3

---

## One-time reCAPTCHA setup (2 minutes)

1. Go to [google.com/recaptcha/admin/create](https://www.google.com/recaptcha/admin/create)
2. Choose **reCAPTCHA v3**
3. Add domains: `insurops.tech` and `localhost`
4. Copy the **Site Key** → paste in `js/main.js` line 8:
   ```js
   const RECAPTCHA_SITE_KEY = 'paste_site_key_here';
   ```
5. Copy the **Secret Key** → paste in `config.php`:
   ```php
   define('RECAPTCHA_SECRET', 'paste_secret_key_here');
   ```

---

## Deploy to Hostinger — option A: File Manager (easiest)

1. Log in to **Hostinger hPanel**
2. Go to **Files → File Manager**
3. Navigate to `public_html` (or your domain's folder)
4. Upload ALL files from this project folder EXCEPT:
   - `.git/` folder
   - `.DS_Store`
5. Make sure these are uploaded:
   - `api/send.php` and `api/.htaccess`
   - `config.php` (with your reCAPTCHA secret filled in)
   - `vendor/` folder (the whole folder — required for PHPMailer)
   - All `.html`, `css/`, `js/`, `images/` files
   - `.htaccess` (root)

---

## Deploy to Hostinger — option B: FTP (FileZilla)

**Hostinger FTP credentials**: hPanel → Files → FTP Accounts

1. Connect to `ftp.yourdomain.com` with your FTP credentials
2. Upload everything from local project to `/public_html/`
3. Ensure `.htaccess` files are included (they are hidden by default — enable "Show hidden files" in FileZilla)

---

## Deploy to Hostinger — option C: SSH + rsync (fastest)

**Get SSH access**: hPanel → Advanced → SSH Access → Enable

```bash
# Run this on your Mac terminal — replace YOUR_SERVER with your Hostinger SSH host
rsync -az --progress \
  --exclude '.git' \
  --exclude '.DS_Store' \
  --exclude '*.log' \
  /Users/pavanverma/Documents/Insurops/ \
  u123456789@ssh.hostinger.com:/home/u123456789/public_html/

# Your SSH credentials are in hPanel → SSH Access
```

---

## After upload — verify it works

1. Visit `https://insurops.tech` — site should load
2. Click **Request Demo**, fill in the form, submit
3. Check `hello@insurops.tech` inbox — email should arrive from `enquiry@rediansoftware.com`

---

## PHP version

Hostinger shared hosting ships with PHP 8.x. Verify in hPanel:
- **hPanel → Advanced → PHP Configuration** → set to **PHP 8.1** or **8.2**

---

## File permissions (if needed)

If you get permission errors, set via File Manager:
- `config.php` → **644**
- `api/send.php` → **644**
- `vendor/` folder → **755**
- All directories → **755**

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Form shows "Could not send email" | Check SMTP settings in `config.php`; make sure ZeptoMail sender address is verified |
| reCAPTCHA fails silently | Check site key in `js/main.js` matches your domain |
| 500 error on submit | Check PHP error logs: hPanel → Error Logs |
| `.htaccess` not working | hPanel → Advanced → enable **mod_rewrite** |

---

## Environment summary

| Setting | Value |
|---|---|
| SMTP Host | `smtp.zeptomail.in` |
| SMTP Port | `587` (STARTTLS) |
| SMTP User | `emailapikey` |
| SMTP From | `enquiry@rediansoftware.com` |
| SMTP To | `hello@insurops.tech` |
| PHP min version | 8.1 |
