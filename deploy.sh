#!/bin/bash
# ============================================================================
# PRISMA AI - Automated VPS Deployment Script
# VPS: 72.62.122.6 | Domain: aiprisma.tech | OS: Ubuntu 24.04 LTS
# ============================================================================

set -e

DOMAIN="aiprisma.tech"
APP_DIR="/var/www/prisma-ai"
REPO_URL="https://github.com/arfyrafa/AI-Prisma.git"

echo ""
echo "============================================"
echo "  PRISMA AI - VPS Deployment Installer"
echo "  Domain: $DOMAIN"
echo "============================================"
echo ""

# --- Step 1: Update System ---
echo "[1/7] Updating system packages..."
apt update && apt upgrade -y

# --- Step 2: Install Docker ---
echo "[2/7] Installing Docker & Docker Compose..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo "  -> Docker installed successfully!"
else
    echo "  -> Docker already installed, skipping."
fi

# --- Step 3: Install Nginx & Certbot ---
echo "[3/7] Installing Nginx & Certbot (SSL)..."
apt install -y nginx certbot python3-certbot-nginx git
systemctl enable nginx
systemctl start nginx

# --- Step 4: Clone Repository ---
echo "[4/7] Cloning PRISMA AI repository..."
if [ -d "$APP_DIR" ]; then
    echo "  -> Directory exists, pulling latest..."
    cd "$APP_DIR"
    git pull origin main
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# --- Step 5: Create Production .env ---
echo "[5/7] Creating production .env file..."
cat > "$APP_DIR/.env" << 'ENVFILE'
# === PRISMA AI Production Configuration ===

# --- Database (PostgreSQL via Docker) ---
DATABASE_URL=postgresql+psycopg2://prisma:prisma@postgres:5432/prisma_ai
POSTGRES_USER=prisma
POSTGRES_PASSWORD=prisma
POSTGRES_DB=prisma_ai
POSTGRES_PORT=5432

# --- Ports ---
BACKEND_PORT=8000
FRONTEND_PORT=8080

# --- CORS ---
CORS_ORIGINS=https://aiprisma.tech,http://aiprisma.tech,http://localhost:8080

# --- AI Agent ---
AGENT_PROVIDER=openclaw
AGENT_API_URL=
AGENT_API_KEY=
AGENT_TIMEOUT_SECONDS=20

# --- ML Prediction ---
PREDICTIVE_PROVIDER=regression
MODEL_API_URL=
MODEL_API_KEY=
PREDICTION_HORIZON_MINUTES=30

# --- Simulation ---
SIMULATION_MODE=true
SIMULATION_INTERVAL_SECONDS=5
SIMULATION_SEED_HOURS=24

# --- Deviation ---
CRITICAL_MARGIN_RATIO=0.125
ENVFILE
echo "  -> .env created!"

# --- Step 6: Configure Nginx Reverse Proxy ---
echo "[6/7] Configuring Nginx reverse proxy for $DOMAIN..."
cat > /etc/nginx/sites-available/prisma-ai << NGINXCONF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    client_max_body_size 50M;

    # Proxy everything (SPA, /api/, /ws, /docs) through Frontend Docker container
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 3600s;
    }
}
NGINXCONF

# Enable site and remove default
ln -sf /etc/nginx/sites-available/prisma-ai /etc/nginx/sites-enabled/prisma-ai
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "  -> Nginx configured!"

# --- Step 7: Build & Start Docker Containers ---
echo "[7/7] Building and starting PRISMA AI containers..."
cd "$APP_DIR"
docker compose up -d --build

echo ""
echo "============================================"
echo "  PRISMA AI DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "  Application:  http://$DOMAIN"
echo "  API Docs:     http://$DOMAIN/docs"
echo "  VPS IP:       72.62.122.6"
echo ""
echo "  Next step: Run SSL certificate command:"
echo "  certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "============================================"
