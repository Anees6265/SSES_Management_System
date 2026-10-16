# 🚀 SSES Management System - AWS Deployment & Docker Guide

Ye guide aapko **SSES Management System** ko AWS par deploy karne ka step-by-step process explain karti hai.

---

## 🏗️ Architecture Overview

Full-stack application Dockerized setup ke through deploy hoti hai:

```
[ Client Browser ]
        │
        ▼ (Port 80 / 443)
┌────────────────────────────────────────────────────────┐
│  SSES Frontend Container (Nginx + React Build)          │
│                                                        │
│  • React SPA (try_files for 404-safe routing)          │
│  • Gzip Compression & Static Asset Caching             │
│  • Reverse Proxy: `/api/*` ──► `http://backend:5000`   │
└───────────────────────┬────────────────────────────────┘
                        │ (Internal Docker Bridge Network)
                        ▼
┌────────────────────────────────────────────────────────┐
│  SSES Backend Container (Node.js 20 + Express)         │
│                                                        │
│  • Port 5000 (0.0.0.0 binding)                         │
│  • Health check: `/health` & `/api/health-check`       │
│  • Graceful shutdown on SIGTERM/SIGINT                 │
│  • Connected to MongoDB Atlas & Cloudinary             │
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ Kya Changes Kiye Gaye Hain (Code Updates)

1. **Docker Setup**:
   - `backend/Dockerfile`: Production-ready `node:20-slim`, non-root user `node`, layer caching, healthcheck.
   - `frontend/Dockerfile`: Multi-stage build (`node:20-alpine` build + `nginx:alpine` serve), build arguments support (`VITE_API_URL`).
   - `frontend/nginx.conf`: Single Page Application (SPA) routing fix (refresh karne par 404 nahi aayega), `/api/` reverse proxy, Gzip compression, asset caching, security headers.
   - `.dockerignore` files for backend, frontend, and root.
   - `docker-compose.yml` aur `docker-compose.prod.yml`: Multi-container orchestration with automatic restart, healthchecks, and log rotation (EBS disk full hone se bachata hai).

2. **Backend Updates**:
   - `server.js`: Enhanced CORS to support AWS EC2 IPs, AWS ALB DNS, custom domains (`*.ssism.org`), and `ALLOWED_ORIGINS` env variable.
   - Added `/health` and `/` endpoints for AWS Elastic Load Balancers / ECS target groups.
   - Added graceful shutdown handling (`SIGTERM` / `SIGINT`).
   - Bound explicitly to `0.0.0.0`.

3. **Frontend Updates**:
   - Added centralized `frontend/src/config/apiConfig.js`.
   - Updated API instances and face-auth components so they safely fall back to relative `/api` or window origin without crashing on `undefined`.

---

## 📦 Method 1: Deploy on AWS EC2 (Sabse Popular aur Recommended)

### Step 1: EC2 Instance Launch Karein
1. **AWS Console** > **EC2** > **Launch Instance**.
2. **OS**: Ubuntu 22.04 LTS ya Ubuntu 24.04 LTS (64-bit x86).
3. **Instance Type**: `t3.small` (2GB RAM) ya `t3.medium` (4GB RAM recommended for build).
4. **Storage**: 20 GB gp3 SSD.
5. **Security Group (Inbound Rules)**:
   | Type | Port | Source | Description |
   |---|---|---|---|
   | SSH | 22 | My IP / 0.0.0.0/0 | Server access |
   | HTTP | 80 | 0.0.0.0/0 | Web traffic |
   | HTTPS | 443 | 0.0.0.0/0 | Secure web traffic |
   | Custom TCP | 5000 | 0.0.0.0/0 | (Optional) Backend direct test |

---

### Step 2: EC2 Server me SSH karein aur Code Clone karein
Apne computer ke terminal se connect karein:
```bash
ssh -i your-key.pem ubuntu@<YOUR-EC2-PUBLIC-IP>
```

Repository clone karein:
```bash
git clone -b prod https://github.com/Anees6265/SSES_Management_System.git
cd SSES_Management_System
```

---

### Step 3: Backend `.env` Configure Karein
```bash
cp backend/.env.example backend/.env
nano backend/.env
```
Apne actual production credentials dalein:
- `MONGO_URI=mongodb+srv://...`
- `JWT_SECRET=...`
- `CLOUDINARY_CLOUD_NAME=...`
- `CLOUDINARY_API_KEY=...`
- `CLOUDINARY_API_SECRET=...`
- `FAST2SMS_API_KEY=...`
- `EMAIL_USER=...`
- `EMAIL_PASS=...`
- `ALLOWED_ORIGINS=http://<YOUR-EC2-PUBLIC-IP>,https://yourdomain.com`

---

### Step 4: 1-Click Deploy Script Run Karein
```bash
./deploy-aws.sh
```
Ye script automatically:
- Docker aur Docker Compose install karega (agar nahi hai).
- Production containers build aur start karega.
- Old unused images clean karega.

Ya fir manually run kar sakte hain:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

### Step 5: Verify Deployment
Browser me open karein:
- **Frontend App**: `http://<YOUR-EC2-PUBLIC-IP>`
- **Backend Health Check**: `http://<YOUR-EC2-PUBLIC-IP>:5000/health` ya `http://<YOUR-EC2-PUBLIC-IP>/api/health-check`

---

## 🔒 Step 6: Free SSL (HTTPS) Setup with Certbot (Optional Domain)

Agar aapke paas domain hai (jaise `iteg.ssism.org`):
1. Domain ke DNS me **A Record** add karein: `yourdomain.com -> <EC2-PUBLIC-IP>`.
2. Server par Certbot install karein:
```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

---

## 🐳 Method 2: Push Images to AWS ECR (For AWS ECS / App Runner)

Agar aap AWS ECR (Elastic Container Registry) aur ECS / App Runner use karna chahte hain:

### 1. AWS ECR Repositories Banayein:
```bash
aws ecr create-repository --repository-name sses-backend --region ap-south-1
aws ecr create-repository --repository-name sses-frontend --region ap-south-1
```

### 2. Login to ECR:
```bash
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com
```

### 3. Build & Push Backend:
```bash
docker build -t sses-backend ./backend
docker tag sses-backend:latest <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/sses-backend:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/sses-backend:latest
```

### 4. Build & Push Frontend:
```bash
docker build --build-arg VITE_API_URL=/api -t sses-frontend ./frontend
docker tag sses-frontend:latest <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/sses-frontend:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/sses-frontend:latest
```

---

## 📋 Useful Maintenance Commands

```bash
# Check status of containers
docker compose -f docker-compose.prod.yml ps

# View backend logs live
docker logs -f sses_backend_prod

# View frontend logs live
docker logs -f sses_frontend_prod

# Restart all services
docker compose -f docker-compose.prod.yml restart

# Pull latest branch update & redeploy
git pull origin prod
docker compose -f docker-compose.prod.yml up -d --build
```
