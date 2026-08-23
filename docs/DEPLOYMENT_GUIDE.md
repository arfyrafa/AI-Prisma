# Panduan Deployment PRISMA AI ke VPS Hostinger (Ubuntu)

Panduan praktis langkah-demi-langkah untuk menyalakan sistem **PRISMA AI** di VPS Hostinger menggunakan Docker & menghubungkan domain Anda.

---

## 1. Hubungkan Domain ke IP VPS
1. Buka dashboard Hostinger $\rightarrow$ **Kelola Domain** $\rightarrow$ **DNS / Nameservers**.
2. Tambahkan **A Record**:
   - **Type:** `A`
   - **Name:** `@` (atau subdomain misal `app`)
   - **Points to:** `[IP_ADDRESS_VPS_ANDA]` (Contoh: `194.163.xxx.xxx`)
   - **TTL:** `300` (atau Default)

---

## 2. Login ke VPS via Terminal / PowerShell
Buka PowerShell atau Terminal di laptop Anda, lalu ketik:
```bash
ssh root@IP_ADDRESS_VPS_ANDA
```
*(Masukkan password root yang Anda buat di Hostinger).*

---

## 3. Install Docker & Git di VPS (Cukup 1 Kali)
Jalankan perintah ini di VPS:
```bash
# Update package
apt update && apt upgrade -y

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install -y docker-compose-plugin git
```

---

## 4. Clone & Nyalakan PRISMA AI
```bash
# Clone repository proyek Anda (atau upload via SCP/FileZilla)
git clone https://github.com/USERNAME/prisma-ai.git /var/www/prisma-ai
cd /var/www/prisma-ai

# Buat file konfigurasi .env
cp .env.example .env

# Jalankan sistem (Frontend + Backend + PostgreSQL)
docker compose up -d --build
```

---

## 5. Pasang SSL HTTPS Otomatis (Let's Encrypt Certbot)
Agar website Anda aman dengan gembok hijau HTTPS (`https://domain-anda.com`):

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d domain-anda.com
```

Selesai! Sistem PRISMA AI langsung aktif secara online dan siap diakses dari mana saja. 🚀
