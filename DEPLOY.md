# Deploying InsurOps to Hostinger VPS

## Prerequisites
- Hostinger VPS (Ubuntu 22.04 recommended)
- Domain `insurops.tech` pointing to the VPS IP in Hostinger DNS
- SSH access to the server

---

## Step 1 — SSH into the server

```bash
ssh root@YOUR_VPS_IP
```

---

## Step 2 — Install Node.js 20 (via nvm)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20
node -v   # should print v20.x.x
```

---

## Step 3 — Install PM2 and Nginx

```bash
npm install -g pm2
apt update && apt install -y nginx certbot python3-certbot-nginx
```

---

## Step 4 — Upload the project

**Option A — Git (recommended)**
```bash
cd /var/www
git clone https://github.com/YOUR_ORG/insurops.git insurops
# OR if no git repo, use SFTP/FTP to upload the folder to /var/www/insurops
```

**Option B — SFTP from your local machine**
```bash
# Run this on your LOCAL machine
scp -r /Users/pavanverma/Documents/Insurops root@YOUR_VPS_IP:/var/www/insurops
```

---

## Step 5 — Install dependencies

```bash
cd /var/www/insurops
npm install --omit=dev
```

---

## Step 6 — Create the .env file on the server

```bash
nano /var/www/insurops/.env
```

Paste the following (fill in your reCAPTCHA secret):

```env
SMTP_HOST=smtp.zeptomail.in
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=emailapikey
SMTP_PASS=PHtE6r0MF7jp2WUrpkQJ5qLtR8WnMdsu9b40fwhH445ECfJQGk0Dr499mje3rEwjXaFBE6KTwYs55enJ5uOMdznlM2lND2qyqK3sx/VYSPOZsbq6x00euF0SdEbeV4/sdN5p1CDVudbbNA==
SMTP_FROM=enquiry@rediansoftware.com
SMTP_TO=hello@insurops.tech

RECAPTCHA_SECRET=YOUR_RECAPTCHA_V3_SECRET_KEY

PORT=3000
NODE_ENV=production
```

Lock down the file:
```bash
chmod 600 /var/www/insurops/.env
```

---

## Step 7 — Create log directory

```bash
mkdir -p /var/log/insurops
```

---

## Step 8 — Start with PM2

```bash
cd /var/www/insurops
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup   # follow the printed command to enable auto-start on reboot
```

Verify it's running:
```bash
pm2 status
pm2 logs insurops --lines 20
```

---

## Step 9 — Configure Nginx

```bash
cp /var/www/insurops/nginx.conf.example /etc/nginx/sites-available/insurops
ln -s /etc/nginx/sites-available/insurops /etc/nginx/sites-enabled/insurops
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

---

## Step 10 — SSL certificate (Let's Encrypt — free)

```bash
certbot --nginx -d insurops.tech -d www.insurops.tech
```

Follow the prompts. Certbot will automatically edit the Nginx config and add SSL certificates.

Auto-renewal is set up automatically by certbot. Verify:
```bash
certbot renew --dry-run
```

---

## Updating the site

```bash
cd /var/www/insurops

# If using Git:
git pull

# If using FTP/SFTP: re-upload changed files, then:
npm install --omit=dev   # only needed if package.json changed
pm2 reload insurops      # zero-downtime reload
```

---

## Useful PM2 commands

```bash
pm2 status                  # show running processes
pm2 logs insurops           # tail live logs
pm2 logs insurops --lines 100  # last 100 lines
pm2 reload insurops         # zero-downtime restart
pm2 restart insurops        # full restart
pm2 stop insurops           # stop
pm2 monit                   # live CPU/memory monitor
```

---

## Environment variables summary

| Variable | Value |
|---|---|
| `SMTP_HOST` | `smtp.zeptomail.in` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` (STARTTLS) |
| `SMTP_USER` | `emailapikey` |
| `SMTP_PASS` | *(your ZeptoMail key)* |
| `SMTP_FROM` | `enquiry@rediansoftware.com` |
| `SMTP_TO` | `hello@insurops.tech` |
| `RECAPTCHA_SECRET` | *(from Google reCAPTCHA admin)* |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
