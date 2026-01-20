# 🚀 Production Deployment Guide

Complete guide for deploying the Mafia game to production.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Environment Setup](#environment-setup)
- [Deployment Steps](#deployment-steps)
- [Post-Deployment](#post-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)
- [Security Hardening](#security-hardening)

---

## Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04 LTS or later (recommended)
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB+ available space
- **Network**: Static IP address or domain name

### Software Requirements
- Docker Engine 24.0+
- Docker Compose v2.0+
- Git
- Node.js 18+ (for local development)

### Installation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

---

## Pre-Deployment Checklist

### ✅ Security Checklist
- [ ] Strong JWT secret generated (min 32 characters)
- [ ] Strong MongoDB password (min 16 characters)
- [ ] Strong Redis password (min 16 characters)
- [ ] CORS origins configured correctly
- [ ] SSL certificate obtained (Let's Encrypt recommended)
- [ ] Firewall configured (UFW or similar)
- [ ] SSH key authentication enabled
- [ ] Default passwords changed

### ✅ Configuration Checklist
- [ ] Environment variables set in `.env.production`
- [ ] Database backup strategy planned
- [ ] Log rotation configured
- [ ] Error tracking service set up (optional: Sentry)
- [ ] Uptime monitoring configured (optional: UptimeRobot)

### ✅ Performance Checklist
- [ ] MongoDB indexes created
- [ ] Redis persistence configured
- [ ] Nginx caching headers set
- [ ] CDN configured (optional)
- [ ] Load balancer configured (for multi-instance)

---

## Environment Setup

### 1. Generate Strong Secrets

```bash
# Generate JWT secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate strong passwords
openssl rand -base64 32

# Or use a password manager to generate strong passwords
```

### 2. Create Production Environment File

Create `.env.production` in the project root:

```env
# Application
NODE_ENV=production
PORT=3001

# MongoDB Configuration
MONGO_USERNAME=admin
MONGO_PASSWORD=<YOUR_STRONG_MONGO_PASSWORD>
MONGODB_URI=mongodb://admin:<YOUR_STRONG_MONGO_PASSWORD>@mongodb:27017/mafia?authSource=admin

# Redis Configuration
REDIS_PASSWORD=<YOUR_STRONG_REDIS_PASSWORD>
REDIS_URL=redis://:<YOUR_STRONG_REDIS_PASSWORD>@redis:6379

# JWT Configuration
JWT_SECRET=<YOUR_STRONG_JWT_SECRET_MIN_32_CHARS>

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Frontend URLs (for production, use your domain)
VITE_SOCKET_URL=https://yourdomain.com
VITE_API_URL=https://yourdomain.com/api

# Logging
LOG_LEVEL=info
```

**⚠️ IMPORTANT**: 
- Replace ALL placeholder values
- Never commit `.env.production` to git
- Keep a secure backup of this file

### 3. Configure DNS

Point your domain to your server's IP address:

```
# A Records
yourdomain.com     → YOUR_SERVER_IP
www.yourdomain.com → YOUR_SERVER_IP
```

---

## Deployment Steps

### Step 1: Server Preparation

```bash
# SSH into your server
ssh user@your-server-ip

# Create project directory
mkdir -p /opt/mafia-game
cd /opt/mafia-game

# Clone repository
git clone <your-repo-url> .

# Or upload files via SCP
# scp -r /local/project/* user@server:/opt/mafia-game/
```

### Step 2: Set Up Environment

```bash
# Copy production environment file
cp .env.example .env.production

# Edit with your values
nano .env.production

# Secure the file
chmod 600 .env.production
```

### Step 3: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be in:
# /etc/letsencrypt/live/yourdomain.com/
```

### Step 4: Nginx Reverse Proxy (Optional but Recommended)

Create `/etc/nginx/sites-available/mafia-game`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/mafia-game /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Deploy with Docker

```bash
# Build and start containers
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check container status
docker compose -f docker-compose.prod.yml ps
```

### Step 6: Verify Deployment

```bash
# Check health endpoint
curl http://localhost:3001/api/health

# Expected response:
# {"status":"ok","environment":"production","timestamp":"...","uptime":...}

# Check frontend
curl http://localhost

# Check from external
curl https://yourdomain.com/api/health
```

---

## Post-Deployment

### Database Indexes

Create indexes for better performance:

```bash
# Connect to MongoDB
docker exec -it mafia-mongodb-prod mongosh -u admin -p <password>

# Switch to database
use mafia

# Create indexes
db.users.createIndex({ username: 1 }, { unique: true })
db.rooms.createIndex({ code: 1 }, { unique: true })
db.rooms.createIndex({ isActive: 1, createdAt: -1 })
db.gamestates.createIndex({ roomCode: 1 })
```

### Set Up Automated Backups

```bash
# Create backup script
sudo nano /usr/local/bin/backup-mafia-db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/mafia"
mkdir -p $BACKUP_DIR

# Backup MongoDB
docker exec mafia-mongodb-prod mongodump \
  --username=admin \
  --password=<YOUR_PASSWORD> \
  --authenticationDatabase=admin \
  --out=/backup/$DATE

# Copy from container
docker cp mafia-mongodb-prod:/backup/$DATE $BACKUP_DIR/

# Compress
tar -czf $BACKUP_DIR/mongodb-backup-$DATE.tar.gz -C $BACKUP_DIR $DATE
rm -rf $BACKUP_DIR/$DATE

# Keep only last 7 days
find $BACKUP_DIR -name "mongodb-backup-*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make executable and schedule:
```bash
sudo chmod +x /usr/local/bin/backup-mafia-db.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-mafia-db.sh
```

### Log Rotation

Logs are already configured in docker-compose with max-size and max-file options.

For additional log management:
```bash
# View logs
docker compose -f docker-compose.prod.yml logs --tail=100 server

# Clear old logs
docker system prune -a --volumes
```

---

## Monitoring & Maintenance

### Health Checks

Create monitoring script `/usr/local/bin/health-check.sh`:

```bash
#!/bin/bash
HEALTH_URL="http://localhost:3001/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "$(date): Health check passed"
else
    echo "$(date): Health check FAILED - HTTP $RESPONSE"
    # Send alert (email, Slack, etc.)
    # docker compose -f /opt/mafia-game/docker-compose.prod.yml restart server
fi
```

### Update Deployment

```bash
# Pull latest changes
cd /opt/mafia-game
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

# Or zero-downtime with rolling updates
docker compose -f docker-compose.prod.yml up -d --no-deps --build server
```

### Database Maintenance

```bash
# Check database size
docker exec mafia-mongodb-prod mongosh -u admin -p <password> --eval "db.stats()"

# Compact database
docker exec mafia-mongodb-prod mongosh -u admin -p <password> --eval "use mafia; db.runCommand({compact: 'users'})"
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs server

# Check if port is already in use
sudo lsof -i :3001
sudo lsof -i :80

# Check environment variables
docker compose -f docker-compose.prod.yml config
```

### Database Connection Issues

```bash
# Test MongoDB connection
docker exec -it mafia-mongodb-prod mongosh -u admin -p <password>

# Check network
docker network ls
docker network inspect mafia-network
```

### High Memory/CPU Usage

```bash
# Check resource usage
docker stats

# Restart service
docker compose -f docker-compose.prod.yml restart server

# Check logs for errors
docker compose -f docker-compose.prod.yml logs --tail=100 server
```

### SSL Certificate Renewal

```bash
# Certificates auto-renew, but to manually renew:
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

---

## Security Hardening

### Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### SSH Hardening

Edit `/etc/ssh/sshd_config`:
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

### Docker Security

```bash
# Run Docker rootless (advanced)
# See: https://docs.docker.com/engine/security/rootless/

# Regular security updates
sudo apt update && sudo apt upgrade -y
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Rate Limiting

Already implemented in the application code. Additional protection:

```nginx
# In nginx config
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=100r/s;

# In server block
location /api {
    limit_req zone=api burst=20;
    # ... rest of config
}
```

---

## Performance Optimization

### Enable Caching

Already implemented. Verify:
```bash
curl -I https://yourdomain.com
# Look for Cache-Control headers
```

### MongoDB Performance

```bash
# Enable profiling
docker exec mafia-mongodb-prod mongosh -u admin -p <password> \
  --eval "use mafia; db.setProfilingLevel(1, { slowms: 100 })"

# Check slow queries
docker exec mafia-mongodb-prod mongosh -u admin -p <password> \
  --eval "use mafia; db.system.profile.find().limit(5).sort({ts:-1}).pretty()"
```

### Redis Performance

```bash
# Check memory usage
docker exec mafia-redis-prod redis-cli -a <password> INFO memory

# Monitor commands
docker exec mafia-redis-prod redis-cli -a <password> MONITOR
```

---

## Support

For issues or questions:
- Check logs: `docker compose logs`
- Review [README.md](README.md)
- Open an issue on GitHub

## License

See [LICENSE](LICENSE) file.
