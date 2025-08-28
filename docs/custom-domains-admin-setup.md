# Custom Domains Admin Setup Guide

This guide provides step-by-step instructions for system administrators to set up and maintain the custom domains system for EVE-KILL.

## Quick Setup Checklist

- [ ] Environment configuration
- [ ] Database setup and indexes
- [ ] DNS infrastructure
- [ ] SSL certificate management
- [ ] Monitoring setup
- [ ] Admin interface access
- [ ] Testing and validation

## Environment Configuration

### Required Environment Variables

```bash
# Copy to .env file
NODE_ENV=production

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/eve-kill
REDIS_URL=redis://localhost:6379

# Domain System
DOMAIN_VERIFICATION_SECRET=your-secure-random-secret
DOMAIN_CACHE_TTL=300
SSL_CHECK_TIMEOUT=10000

# Analytics and Monitoring
ANALYTICS_ENABLED=true
DOMAIN_HEALTH_CHECK_INTERVAL=3600

# Security
RATE_LIMIT_WINDOW=3600
RATE_LIMIT_MAX_ATTEMPTS=10

# Optional: External Services
CLOUDFLARE_API_KEY=your-cloudflare-api-key
CLOUDFLARE_ZONE_ID=your-zone-id
```

### Development Environment

```bash
# Development-specific settings
DEBUG=domain:*
DOMAIN_DEBUG=true
ALLOW_TEST_DOMAINS=true
SKIP_SSL_VERIFICATION=false
```

## Database Setup

### 1. Create Required Collections

```javascript
// MongoDB setup script
use eve-kill;

// Create custom domains collection
db.createCollection('customdomains', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['domain', 'owner_character_id', 'entity_type', 'entity_id'],
      properties: {
        domain: { bsonType: 'string', pattern: '^[a-z0-9.-]+$' },
        owner_character_id: { bsonType: 'number' },
        entity_type: { enum: ['character', 'corporation', 'alliance'] },
        entity_id: { bsonType: 'number' },
        active: { bsonType: 'bool' },
        verified: { bsonType: 'bool' }
      }
    }
  }
});

// Create domain analytics collection
db.createCollection('domainanalytics');

// Create domain errors collection
db.createCollection('domainerrors');
```

### 2. Create Indexes

```javascript
// Performance indexes
db.customdomains.createIndex({ 'domain': 1 }, { unique: true });
db.customdomains.createIndex({ 'owner_character_id': 1 });
db.customdomains.createIndex({ 'entity_type': 1, 'entity_id': 1 });
db.customdomains.createIndex({ 'active': 1, 'verified': 1 });
db.customdomains.createIndex({ 'created_at': 1 });

// Composite indexes for common queries
db.customdomains.createIndex({ 'active': 1, 'verified': 1, 'domain': 1 });
db.customdomains.createIndex({ 'owner_character_id': 1, 'active': 1 });

// Analytics indexes
db.domainanalytics.createIndex({ 'domain': 1, 'date': 1 });
db.domainanalytics.createIndex({ 'domain': 1, 'timestamp': 1 });

// Error tracking indexes
db.domainerrors.createIndex({ 'domain': 1, 'timestamp': 1 });
db.domainerrors.createIndex({ 'timestamp': 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL
```

### 3. Initial Data Setup

```javascript
// Create admin user permissions
db.users.updateMany(
  { role: 'admin' },
  { $addToSet: { permissions: 'manage_custom_domains' } }
);

// Set up default blocked domains
db.blockeddomains.insertMany([
  { domain: 'eve-kill.com', reason: 'Main domain' },
  { domain: 'www.eve-kill.com', reason: 'Main domain' },
  { domain: 'api.eve-kill.com', reason: 'API domain' },
  { domain: 'admin.eve-kill.com', reason: 'Admin domain' },
  { domain: 'localhost', reason: 'Development domain' }
]);
```

## DNS Infrastructure

### Primary DNS Setup

For domains to work properly, you need:

1. **Wildcard SSL Certificate** (recommended)
   - Certificate for `*.eve-kill.com` or use individual certificates
   - Automatic certificate management via Let's Encrypt or CloudFlare

2. **DNS Wildcard Record**
   ```
   *.eve-kill.com  CNAME  eve-kill.com
   ```

3. **Main Domain A Records**
   ```
   eve-kill.com    A      your-server-ip
   www.eve-kill.com A     your-server-ip
   ```

### CloudFlare Setup (Recommended)

```bash
# Install CloudFlare CLI
npm install -g @cloudflare/wrangler

# Configure CloudFlare
wrangler config

# Set up DNS records via API
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "*",
    "content": "eve-kill.com",
    "proxied": true
  }'
```

## Web Server Configuration

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/eve-kill-domains
server {
    listen 80;
    server_name *.eve-kill.com eve-kill.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name *.eve-kill.com eve-kill.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/eve-kill.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/eve-kill.com/privkey.pem;
    ssl_certificate /etc/ssl/certs/wildcard-eve-kill.crt;
    ssl_certificate_key /etc/ssl/private/wildcard-eve-kill.key;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_dhparam /etc/nginx/dhparam.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Proxy to Node.js Application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout settings
        proxy_connect_timeout       60s;
        proxy_send_timeout          60s;
        proxy_read_timeout          60s;
    }

    # Static file serving
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://localhost:3000;
    }

    # SEO files
    location ~ ^/(sitemap\.xml|robots\.txt)$ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        expires 1h;
    }

    # Block access to sensitive files
    location ~ /\.(ht|env|git) {
        deny all;
    }
}
```

### Apache Configuration (Alternative)

```apache
<VirtualHost *:80>
    ServerName eve-kill.com
    ServerAlias *.eve-kill.com
    Redirect permanent / https://eve-kill.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName eve-kill.com
    ServerAlias *.eve-kill.com

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/wildcard-eve-kill.crt
    SSLCertificateKeyFile /etc/ssl/private/wildcard-eve-kill.key

    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # Security headers
    Header always set X-Frame-Options SAMEORIGIN
    Header always set X-Content-Type-Options nosniff
    Header always set X-XSS-Protection "1; mode=block"
</VirtualHost>
```

## SSL Certificate Management

### Let's Encrypt Setup

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get wildcard certificate
sudo certbot certonly --manual \
  --preferred-challenges=dns \
  --email admin@eve-kill.com \
  --agree-tos \
  -d eve-kill.com \
  -d "*.eve-kill.com"

# Set up automatic renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### CloudFlare SSL Setup

```bash
# Install CloudFlare Origin CA certificate
curl -s https://developers.cloudflare.com/ssl/static/origin_ca_ecc_root.pem > /etc/ssl/certs/cloudflare_origin_ca.pem

# Generate Origin Certificate in CloudFlare Dashboard
# Download and install certificate files
```

## Application Deployment

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/eve-kill
cd eve-kill

# Install dependencies
npm install

# Build application
npm run build

# Set up environment
cp .env.example .env
# Edit .env with your configuration
```

### Process Management

```bash
# Using PM2 (recommended)
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'eve-kill',
    script: '.output/server/index.mjs',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF

# Start application
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### Systemd Service (Alternative)

```bash
# Create service file
sudo tee /etc/systemd/system/eve-kill.service << EOF
[Unit]
Description=EVE-KILL Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/eve-kill
ExecStart=/usr/bin/node .output/server/index.mjs
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=eve-kill
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable eve-kill
sudo systemctl start eve-kill
```

## Monitoring Setup

### Application Monitoring

```bash
# Install monitoring dependencies
npm install --save @sentry/node @sentry/profiling-node

# Set up health check endpoint monitoring
curl -X POST "https://api.uptimerobot.com/v2/newMonitor" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "api_key=$UPTIMEROBOT_API_KEY&format=json&type=1&url=https://eve-kill.com/health&friendly_name=EVE-KILL Main"
```

### Log Management

```bash
# Set up log rotation
sudo tee /etc/logrotate.d/eve-kill << EOF
/var/www/eve-kill/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    copytruncate
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### Database Monitoring

```javascript
// MongoDB monitoring script
const { MongoClient } = require('mongodb');

async function checkDomainHealth() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    // Check domain statistics
    const stats = await db.collection('customdomains').aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$active', 1, 0] } },
          verified: { $sum: { $cond: ['$verified', 1, 0] } }
        }
      }
    ]).toArray();

    console.log('Domain Statistics:', stats[0]);

    // Check recent errors
    const errors = await db.collection('domainerrors').countDocuments({
      timestamp: { $gte: new Date(Date.now() - 3600000) }
    });

    console.log('Recent Errors (1h):', errors);

  } finally {
    await client.close();
  }
}

// Run every 5 minutes
setInterval(checkDomainHealth, 5 * 60 * 1000);
```

## Admin Interface Access

### Creating Admin Users

```javascript
// Add admin permissions to user
db.users.updateOne(
  { characterId: YOUR_CHARACTER_ID },
  {
    $set: { role: 'admin' },
    $addToSet: { permissions: { $each: ['manage_custom_domains', 'view_domain_analytics'] } }
  }
);
```

### Admin Dashboard Access

Navigate to `https://eve-kill.com/admin/domains` to access:
- Domain management interface
- Verification status overview
- Analytics and statistics
- Error monitoring
- System health checks

## Testing and Validation

### Basic Functionality Test

```bash
# Test domain detection API
curl -X POST "https://eve-kill.com/api/domain-detection" \
  -H "Content-Type: application/json" \
  -d '{"host": "test.eve-kill.com"}'

# Test SSL checking
curl "https://eve-kill.com/api/ssl-check/test.eve-kill.com"

# Test verification
curl -X POST "https://eve-kill.com/api/user/domains/DOMAIN_ID/verify" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Domain Health Check

```bash
#!/bin/bash
# health_check.sh - Domain system health check

echo "=== EVE-KILL Custom Domains Health Check ==="

# Check application status
if curl -f -s "https://eve-kill.com/health" > /dev/null; then
    echo "✓ Application is responding"
else
    echo "✗ Application is not responding"
fi

# Check database connection
if mongo --eval "db.adminCommand('ismaster')" > /dev/null 2>&1; then
    echo "✓ Database is accessible"
else
    echo "✗ Database connection failed"
fi

# Check Redis connection
if redis-cli ping > /dev/null 2>&1; then
    echo "✓ Redis is accessible"
else
    echo "✗ Redis connection failed"
fi

# Check domain statistics
DOMAIN_COUNT=$(mongo --quiet --eval "db.customdomains.countDocuments({})")
echo "Total domains configured: $DOMAIN_COUNT"

VERIFIED_COUNT=$(mongo --quiet --eval "db.customdomains.countDocuments({verified: true})")
echo "Verified domains: $VERIFIED_COUNT"

echo "=== Health Check Complete ==="
```

## Backup and Recovery

### Database Backup

```bash
#!/bin/bash
# backup_domains.sh - Backup custom domains data

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/eve-kill"

mkdir -p $BACKUP_DIR

# Backup custom domains collection
mongodump --uri="$MONGODB_URI" --collection=customdomains --out="$BACKUP_DIR/domains_$DATE"

# Backup analytics data
mongodump --uri="$MONGODB_URI" --collection=domainanalytics --out="$BACKUP_DIR/analytics_$DATE"

# Compress backup
tar -czf "$BACKUP_DIR/domains_backup_$DATE.tar.gz" -C "$BACKUP_DIR" "domains_$DATE" "analytics_$DATE"

# Clean up old backups (keep 30 days)
find $BACKUP_DIR -name "domains_backup_*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/domains_backup_$DATE.tar.gz"
```

### Recovery Procedure

```bash
#!/bin/bash
# restore_domains.sh - Restore custom domains from backup

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    exit 1
fi

# Extract backup
tar -xzf "$BACKUP_FILE" -C /tmp/

# Restore collections
mongorestore --uri="$MONGODB_URI" --drop /tmp/domains_*/
mongorestore --uri="$MONGODB_URI" --drop /tmp/analytics_*/

# Recreate indexes
mongo --eval "
use eve-kill;
db.customdomains.createIndex({'domain': 1}, {unique: true});
db.customdomains.createIndex({'owner_character_id': 1});
// ... other indexes
"

echo "Restore completed from $BACKUP_FILE"
```

## Troubleshooting

### Common Issues

1. **Domains not resolving**
   - Check DNS propagation
   - Verify CNAME records
   - Check Nginx/Apache configuration

2. **SSL certificate errors**
   - Verify certificate validity
   - Check certificate chain
   - Ensure proper Nginx SSL configuration

3. **Verification failures**
   - Check TXT record propagation
   - Verify HTTP verification files
   - Check domain accessibility

4. **Performance issues**
   - Monitor database query performance
   - Check Redis cache hit rates
   - Review application logs

### Log Analysis

```bash
# Check application logs
tail -f /var/www/eve-kill/logs/combined.log | grep -i domain

# Check Nginx access logs
tail -f /var/log/nginx/access.log | grep -E "(sitemap|robots|\.well-known)"

# Check SSL certificate expiry
echo | openssl s_client -servername test.eve-kill.com -connect test.eve-kill.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Database Queries for Debugging

```javascript
// Find domains with issues
db.customdomains.find({
  $or: [
    { verified: false },
    { 'ssl_info.status': { $in: ['expired', 'expiring'] } },
    { active: false }
  ]
});

// Check recent domain activity
db.domainanalytics.find({
  timestamp: { $gte: new Date(Date.now() - 86400000) }
}).sort({ timestamp: -1 });

// Find domains by entity
db.customdomains.find({
  entity_type: 'corporation',
  entity_id: 123456789
});
```

## Maintenance Tasks

### Regular Maintenance

```bash
#!/bin/bash
# maintenance.sh - Regular maintenance tasks

echo "Starting EVE-KILL domain maintenance..."

# Check SSL certificate expiry
node scripts/check-ssl-expiry.js

# Update domain health status
node scripts/update-domain-health.js

# Clean up old error logs
mongo --eval "
db.domainerrors.deleteMany({
  timestamp: { \$lt: new Date(Date.now() - 2592000000) }
});
"

# Optimize database
mongo --eval "
db.customdomains.reIndex();
db.domainanalytics.reIndex();
"

echo "Maintenance completed."
```

### Performance Optimization

```bash
# Enable MongoDB profiling
mongo --eval "db.setProfilingLevel(1, { slowms: 100 })"

# Analyze slow queries
mongo --eval "db.system.profile.find().sort({ts: -1}).limit(5).pretty()"

# Check index usage
mongo --eval "db.customdomains.aggregate([{\$indexStats: {}}])"
```

---

## Support and Documentation

- **Technical Documentation**: `docs/custom-domains-technical.md`
- **User Guide**: `docs/custom-domains-guide.md`
- **API Documentation**: `docs/api-reference.md`
- **System Requirements**: `docs/system-requirements.md`

For additional support, contact the development team or create an issue in the project repository.

Last Updated: 2024
Version: 1.0
