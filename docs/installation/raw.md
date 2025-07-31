# Raw Installation Guide

This guide walks you through deploying Thessia directly on your server using Bun runtime. This method provides maximum control and minimal overhead but requires manual configuration of all components.

## 📋 Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+, CentOS 8+, or similar) or macOS
- **Bun**: Version 1.0+ (recommended runtime)
- **Node.js**: Version 18+ (alternative to Bun)
- **CPU**: Minimum 2 cores (4+ recommended for production)
- **Memory**: Minimum 4GB RAM (8GB+ recommended for production)
- **Storage**: Minimum 50GB SSD storage
- **Network**: Stable internet connection for ESI API access

### Required Services

You need to have these services running and accessible:

- **MongoDB**: Version 4.4+ (database)
- **Redis**: Version 6.0+ (caching and job queue)
- **Meilisearch**: Version 1.0+ (search engine)

### EVE Online API Credentials

Register an application with EVE Online:

1. Go to [EVE Online Developers](https://developers.eveonline.com/)
2. Create a new application with required scopes
3. Note your Client ID, Client Secret, and Callback URL

## 🛠️ Installation Steps

### Step 1: Install Dependencies

#### Install Bun (Recommended)

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Reload shell or source profile
source ~/.bashrc  # or ~/.zshrc
```

#### Install Node.js (Alternative)

```bash
# Using NodeSource repository (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Using package manager (CentOS/RHEL)
sudo dnf install nodejs npm
```

### Step 2: Install and Configure Services

#### MongoDB Installation

```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Redis Installation

```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# CentOS/RHEL
sudo dnf install redis

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis
```

#### Meilisearch Installation

```bash
# Download and install Meilisearch
curl -L https://install.meilisearch.com | sh

# Move to system path
sudo mv ./meilisearch /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/meilisearch.service > /dev/null <<EOF
[Unit]
Description=Meilisearch
After=network.target

[Service]
Type=simple
User=meilisearch
Group=meilisearch
ExecStart=/usr/local/bin/meilisearch --env production --db-path /var/lib/meilisearch/data --http-addr 127.0.0.1:7700
Restart=on-failure
RestartSec=1

[Install]
WantedBy=multi-user.target
EOF

# Create user and data directory
sudo useradd -r -s /bin/false meilisearch
sudo mkdir -p /var/lib/meilisearch/data
sudo chown -R meilisearch:meilisearch /var/lib/meilisearch

# Start Meilisearch
sudo systemctl start meilisearch
sudo systemctl enable meilisearch
```

### Step 3: Download and Setup Thessia

```bash
# Clone the repository
git clone https://github.com/eve-kill/Thessia.git
cd Thessia

# Switch to latest stable release (optional)
git checkout $(git describe --tags --abbrev=0)

# Install dependencies
bun install

# Or with npm if using Node.js
npm install
```

### Step 4: Configure Environment

Create a `.env` file with your configuration:

```bash
cp .env.example .env
```

Edit the `.env` file:

```env
# Database Configuration
MONGO_URI=mongodb://mongodb:27017/thessia
REDIS_URI=redis
REDIS_PORT=6379
REDIS_DB=0
MEILISEARCH_URI=http://meilisearch:7700

# EVE Online API Configuration
ESI_URL=https://esi.evetech.net/
ESI_RATE_LIMIT=25

# REQUIRED: EVE Online API Credentials
EVE_CLIENT_ID=your-eve-client-id
EVE_CLIENT_SECRET=your-eve-client-secret
EVE_CLIENT_REDIRECT=https://your-domain.com/auth/callback

# Optional: Development credentials
EVE_CLIENT_ID_DEV=your-dev-client-id
EVE_CLIENT_SECRET_DEV=your-dev-client-secret
EVE_CLIENT_REDIRECT_DEV=http://localhost:3000/auth/callback

# RedisQ Configuration (for killmail streaming)
REDISQ_ID=your-redisq-id

# Optional: Discord Webhooks
BACKEND_DISCORD_URL=your-discord-webhook-url
DISCORD_NEW_COMMENT=your-comment-webhook-url
DISCORD_REPORT_COMMENT=your-report-webhook-url

# Optional: OpenAI for content moderation
OPENAI_API_KEY=your-openai-api-key

# Optional: Tenor API for GIF support
TENOR_API_KEY=your-tenor-api-key

# Runtime Configuration
ENABLE_RUNTIME_CACHE=true
THESSIA_CONTAINER=true
```

### Step 5: Build the Application

```bash
# Build the application
bun run build

# Verify build completed successfully
ls -la .output/
```

### Step 6: Run the Application

#### Start the Main Application

```bash
# Run with Bun (recommended)
bun --bun run .output/server/index.mjs

# Or with Node.js
node .output/server/index.mjs
```

The application will start on port 3000 by default.

#### Start Background Services

Open additional terminal sessions for background services:

```bash
# RedisQ service (killmail streaming)
./bin/console redisq

# Queue processors
./bin/queue processKillmails
./bin/queue processEntities
./bin/queue processStats
./bin/queue processCampaigns
./bin/queue processAchievements
./bin/queue processHistoricalStats
./bin/queue processWars

# Cron jobs
./bin/cron
```

## 🔧 Process Management

### Using PM2 (Recommended)

Install and configure PM2 for process management:

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'thessia-app',
      script: 'bun',
      args: '--bun run .output/server/index.mjs',
      cwd: '/path/to/Thessia',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'thessia-redisq',
      script: './bin/console',
      args: 'redisq',
      cwd: '/path/to/Thessia',
      instances: 1,
      autorestart: true
    },
    {
      name: 'thessia-process-killmails',
      script: './bin/queue',
      args: 'processKillmails',
      cwd: '/path/to/Thessia',
      instances: 2,
      autorestart: true
    },
    {
      name: 'thessia-process-entities',
      script: './bin/queue',
      args: 'processEntities',
      cwd: '/path/to/Thessia',
      instances: 1,
      autorestart: true
    },
    {
      name: 'thessia-process-stats',
      script: './bin/queue',
      args: 'processStats',
      cwd: '/path/to/Thessia',
      instances: 1,
      autorestart: true
    },
    {
      name: 'thessia-cron',
      script: './bin/cron',
      cwd: '/path/to/Thessia',
      instances: 1,
      autorestart: true
    }
  ]
};
EOF

# Start all processes
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup
# Follow the displayed instructions to enable auto-start
```

### Using Systemd Services

Create systemd service files for each component:

```bash
# Main application service
sudo tee /etc/systemd/system/thessia-app.service > /dev/null <<EOF
[Unit]
Description=Thessia Main Application
After=network.target mongodb.service redis.service meilisearch.service

[Service]
Type=simple
User=thessia
Group=thessia
WorkingDirectory=/opt/thessia
ExecStart=/usr/local/bin/bun --bun run .output/server/index.mjs
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# RedisQ service
sudo tee /etc/systemd/system/thessia-redisq.service > /dev/null <<EOF
[Unit]
Description=Thessia RedisQ Service
After=network.target redis.service

[Service]
Type=simple
User=thessia
Group=thessia
WorkingDirectory=/opt/thessia
ExecStart=/opt/thessia/bin/console redisq
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Create user and set permissions
sudo useradd -r -s /bin/false thessia
sudo mkdir -p /opt/thessia
sudo cp -r /path/to/Thessia/* /opt/thessia/
sudo chown -R thessia:thessia /opt/thessia

# Enable and start services
sudo systemctl enable thessia-app thessia-redisq
sudo systemctl start thessia-app thessia-redisq
```

## 🌐 Reverse Proxy Setup

### NGINX Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/your-domain.com.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.com.key;

    # Proxy to Thessia
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 📊 Monitoring and Maintenance

### Health Checks

```bash
# Check application health
curl http://localhost:3000/api/status

# Check service status
systemctl status thessia-app
systemctl status thessia-redisq

# Monitor logs
journalctl -u thessia-app -f
journalctl -u thessia-redisq -f
```

### Log Management

Configure log rotation:

```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/thessia > /dev/null <<EOF
/var/log/thessia/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 thessia thessia
    postrotate
        systemctl reload thessia-app
    endscript
}
EOF
```

### Database Maintenance

```bash
# Create MongoDB indexes
mongo thessia --eval "
db.killmails.createIndex({killmail_id: 1});
db.killmails.createIndex({killmail_time: -1});
db.characters.createIndex({character_id: 1});
db.corporations.createIndex({corporation_id: 1});
db.alliances.createIndex({alliance_id: 1});
"

# Backup MongoDB
mongodump --db thessia --gzip --archive=thessia-backup-$(date +%Y%m%d).gz

# Redis maintenance
redis-cli BGSAVE
```

### Updates

```bash
# Stop services
sudo systemctl stop thessia-app thessia-redisq

# Update code
cd /opt/thessia
git pull origin main

# Rebuild application
bun install
bun run build

# Restart services
sudo systemctl start thessia-app thessia-redisq
```

## 🚨 Troubleshooting

### Common Issues

#### Application Won't Start

```bash
# Check logs
journalctl -u thessia-app -n 50

# Check dependencies
bun --version
mongo --version
redis-cli ping

# Verify configuration
cat .env | grep -v '^#'
```

#### Database Connection Issues

```bash
# Test MongoDB connection
mongo thessia --eval "db.runCommand({connectionStatus: 1})"

# Test Redis connection
redis-cli ping

# Check network connectivity
netstat -tlnp | grep -E ':(27017|6379|7700)'
```

#### Performance Issues

```bash
# Monitor system resources
top
htop
iotop

# Check application metrics
curl http://localhost:3000/api/status

# Monitor MongoDB performance
mongo thessia --eval "db.runCommand({serverStatus: 1})"
```

### Performance Optimization

#### System Tuning

```bash
# Increase file descriptor limits
echo "thessia soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "thessia hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Optimize kernel parameters
sudo tee -a /etc/sysctl.conf > /dev/null <<EOF
net.core.somaxconn = 65536
net.ipv4.tcp_max_syn_backlog = 65536
vm.overcommit_memory = 1
EOF
sudo sysctl -p
```

#### MongoDB Optimization

```bash
# Configure MongoDB for production
sudo tee -a /etc/mongod.conf > /dev/null <<EOF
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 4
operationProfiling:
  slowOpThresholdMs: 100
  mode: slowOp
EOF
sudo systemctl restart mongod
```

## 🔗 Additional Resources

- [Production Overview](./index.md)
- [Docker Deployment](./docker.md)
- [Kubernetes Deployment](./kubernetes.md)
- [Development Guide](../development-guide.md)
- [API Documentation](../api/index.md)
