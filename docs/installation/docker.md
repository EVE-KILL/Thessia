# Docker Compose Production Deployment

This guide will walk you through deploying Thessia in production using Docker Compose. This method provides a containerized deployment that's easier to manage than raw installation while still being simpler than Kubernetes.

## 📋 Prerequisites

### System Requirements

- **Docker**: Version 20.10+ with Docker Compose v2
- **Operating System**: Linux (Ubuntu 20.04+, CentOS 8+, or similar)
- **CPU**: Minimum 4 cores (8+ recommended for production)
- **Memory**: Minimum 8GB RAM (16GB+ recommended for production)
- **Storage**: Minimum 100GB SSD storage
- **Network**: Stable internet connection for ESI API access

### Required Services

The Docker Compose setup includes all required services:

- **MongoDB**: Database container
- **Redis**: Caching and queue container
- **Meilisearch**: Search engine container
- **Thessia Application**: Main web application
- **Processing Services**: Background job processors

### EVE Online API Credentials

You'll need to register an application with EVE Online:

1. Go to [EVE Online Developers](https://developers.eveonline.com/)
2. Create a new application with the following scopes:
   - `esi-characters.read_corporation_roles.v1`
   - `esi-alliances.read_contacts.v1`
   - `esi-corporations.read_contacts.v1`
   - Any other scopes your application requires
3. Note down your Client ID, Client Secret, and Callback URL

## 🚀 Installation Steps

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/eve-kill/Thessia.git
cd Thessia

# Switch to the latest stable release (optional)
git checkout $(git describe --tags --abbrev=0)
```

### Step 2: Configure Environment Variables

Create a `.env` file in the project root with your configuration:

```bash
cp .env.example .env
```

Edit the `.env` file with your specific configuration:

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

### Step 3: Prepare Data Directories

Create directories for persistent data:

```bash
# Create data directories
mkdir -p .data/mongo
mkdir -p .data/redis
mkdir -p .data/meilisearch

# Set proper permissions
sudo chown -R 1000:1000 .data/
```

### Step 4: Start the Application

Start all services using Docker Compose:

```bash
# Start all services in detached mode
docker compose -f docker-compose.production.yml up -d

# Or start specific services
docker compose -f docker-compose.production.yml up -d mongodb redis meilisearch
docker compose -f docker-compose.production.yml up -d app

# View logs
docker compose -f docker-compose.production.yml logs -f app
```

### Step 5: Verify Installation

Check that all services are running:

```bash
# Check service status
docker compose -f docker-compose.production.yml ps

# Check application health
curl http://localhost:3000/api/status

# Check logs for any errors
docker compose -f docker-compose.production.yml logs app
```

## 🔧 Configuration and Management

### Service Components

The Docker Compose setup includes the following services:

- **app**: Main Thessia web application (port 3000)
- **redisq**: RedisQ service for killmail streaming
- **processWars**: Background processor for war data
- **processStats**: Background processor for statistics
- **processKillmails**: Background processor for killmails
- **processHistoricalStats**: Background processor for historical data
- **processEntities**: Background processor for EVE entities
- **processCampaigns**: Background processor for campaigns
- **processAchievements**: Background processor for achievements
- **mongodb**: MongoDB database (port 27017)
- **redis**: Redis cache and queue (port 6379)
- **meilisearch**: Search engine (port 7700)

### Managing Services

```bash
# Stop all services
docker compose -f docker-compose.production.yml down

# Stop and remove volumes (⚠️ This will delete all data)
docker compose -f docker-compose.production.yml down -v

# Restart a specific service
docker compose -f docker-compose.production.yml restart app

# Scale processing services
docker compose -f docker-compose.production.yml up -d --scale processKillmails=3

# View logs for a specific service
docker compose -f docker-compose.production.yml logs -f processKillmails
```

### Updating the Application

To update to a new version:

```bash
# Pull the latest images
docker compose -f docker-compose.production.yml pull

# Restart services with new images
docker compose -f docker-compose.production.yml up -d

# Or do a rolling restart
docker compose -f docker-compose.production.yml up -d --force-recreate
```

## 🌐 Reverse Proxy Setup

### NGINX Configuration

Create an NGINX configuration for SSL termination and load balancing:

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
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Proxy to Thessia
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Traefik Configuration

Alternatively, use Traefik with Docker labels:

```yaml
# Add to your docker-compose.production.yml app service
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.thessia.rule=Host(`your-domain.com`)"
  - "traefik.http.routers.thessia.entrypoints=websecure"
  - "traefik.http.routers.thessia.tls.certresolver=letsencrypt"
  - "traefik.http.services.thessia.loadbalancer.server.port=3000"
```

## 📊 Monitoring and Maintenance

### Health Checks

Monitor application health:

```bash
# Check application status
curl http://localhost:3000/api/status

# Check individual service health
docker compose -f docker-compose.production.yml exec app curl http://localhost:3000/health

# Monitor resource usage
docker stats
```

### Log Management

```bash
# View all logs
docker compose -f docker-compose.production.yml logs

# Follow logs for specific service
docker compose -f docker-compose.production.yml logs -f app

# View last 100 lines
docker compose -f docker-compose.production.yml logs --tail=100 app

# Configure log rotation in docker-compose.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Backup and Recovery

#### Database Backup

```bash
# Create MongoDB backup
docker compose -f docker-compose.production.yml exec mongodb mongodump --db thessia --gzip --archive > thessia-backup-$(date +%Y%m%d).gz

# Restore from backup
docker compose -f docker-compose.production.yml exec -T mongodb mongorestore --db thessia --gzip --archive < thessia-backup-20240101.gz
```

#### Full Data Backup

```bash
# Stop application services (keep databases running)
docker compose -f docker-compose.production.yml stop app redisq process*

# Create backup of data directory
tar -czf thessia-data-backup-$(date +%Y%m%d).tar.gz .data/

# Restart services
docker compose -f docker-compose.production.yml start
```

## 🚨 Troubleshooting

### Common Issues

#### Services Won't Start

```bash
# Check service status
docker compose -f docker-compose.production.yml ps

# Check logs for errors
docker compose -f docker-compose.production.yml logs app

# Check system resources
docker system df
docker system prune  # Clean up unused resources
```

#### Database Connection Issues

```bash
# Test MongoDB connection
docker compose -f docker-compose.production.yml exec app bun console
# In console: mongoose.connection.readyState should be 1

# Check MongoDB logs
docker compose -f docker-compose.production.yml logs mongodb
```

#### Performance Issues

```bash
# Monitor resource usage
docker stats

# Check application metrics
curl http://localhost:3000/api/status

# Scale processing services
docker compose -f docker-compose.production.yml up -d --scale processKillmails=3
```

### Performance Tuning

#### Resource Limits

Add resource limits to your docker-compose.production.yml:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 1G
```

#### Database Optimization

```bash
# Create database indexes
docker compose -f docker-compose.production.yml exec mongodb mongo thessia --eval "
  db.killmails.createIndex({killmail_id: 1});
  db.killmails.createIndex({killmail_time: -1});
  db.characters.createIndex({character_id: 1});
"
```

## 🔗 Additional Resources

- [Production Overview](./index.md)
- [Kubernetes Deployment](./kubernetes.md)
- [Raw Installation](./raw.md)
- [Development Guide](../development-guide.md)
- [API Documentation](../api/index.md)
