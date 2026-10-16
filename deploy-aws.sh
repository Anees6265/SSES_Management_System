#!/usr/bin/env bash
# ========================================================
# SSES Management System - AWS Production Deployment Script
# ========================================================

set -e

echo "🚀 Starting SSES Management System Deployment..."

# 1. Check Docker installation
if ! command -v docker &> /dev/null; then
    echo "⚠️ Docker not found. Installing Docker..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y ca-certificates curl gnupg lsb-release
        sudo mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
          $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        sudo usermod -aG docker $USER || true
    else
        echo "❌ Please install Docker manually on this operating system."
        exit 1
    fi
fi

# 2. Check for backend .env file
if [ ! -f "backend/.env" ]; then
    echo "⚠️ Warning: backend/.env not found!"
    if [ -f "backend/.env.example" ]; then
        echo "Creating backend/.env from backend/.env.example..."
        cp backend/.env.example backend/.env
        echo "❗ Please edit backend/.env with your production credentials before continuing."
        exit 1
    fi
fi

# 3. Pull latest code (if inside a git repo)
if [ -d ".git" ]; then
    echo "📥 Pulling latest git changes from branch..."
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo "Current branch: $CURRENT_BRANCH"
    git pull origin "$CURRENT_BRANCH" || true
fi

# 4. Build and run containers
echo "🐳 Building and starting Docker containers..."
docker compose -f docker-compose.prod.yml down --remove-orphans || true
docker compose -f docker-compose.prod.yml up -d --build

# 5. Clean up unused images to save disk space
echo "🧹 Cleaning up unused Docker images..."
docker image prune -f

# 6. Check running containers
echo "✅ Checking container status:"
docker compose -f docker-compose.prod.yml ps

echo "🎉 Deployment completed successfully!"
echo "➡️ Frontend accessible on http://<YOUR-SERVER-IP> or your domain."
echo "➡️ Backend health check on http://<YOUR-SERVER-IP>:5000/health"
