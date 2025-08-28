# Custom Domains Technical Documentation

This document provides technical implementation details for the EVE-KILL custom domains system. It's intended for developers, system administrators, and anyone maintaining the codebase.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Request Flow](#request-flow)
4. [Core Components](#core-components)
5. [API Endpoints](#api-endpoints)
6. [Middleware System](#middleware-system)
7. [SEO Implementation](#seo-implementation)
8. [Caching Strategy](#caching-strategy)
9. [Security Considerations](#security-considerations)
10. [Monitoring & Analytics](#monitoring--analytics)
11. [Deployment Guide](#deployment-guide)
12. [Troubleshooting](#troubleshooting)

## Architecture Overview

The custom domains system is built on several key architectural principles:

### Multi-Tenant Architecture
- Single codebase serves multiple domains
- Domain-specific configuration stored in database
- Runtime domain detection and context switching

### Request Processing Pipeline
```
Incoming Request → Domain Detection → Context Loading → Routing → Response
```

### Key Technologies
- **Backend**: Node.js with Nuxt 3
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis for domain mappings and configurations
- **DNS**: Multi-provider verification system
- **SSL**: Support for multiple certificate providers

## Database Schema

### CustomDomains Collection

```javascript
{
  _id: ObjectId,
  domain: String, // Unique domain name
  owner_character_id: Number, // Character ID of domain owner
  entity_type: String, // "character", "corporation", "alliance"
  entity_id: Number, // ID of the associated entity

  // Status fields
  active: Boolean,
  verified: Boolean,
  verification_token: String,
  verification_methods: [String], // DNS, HTTP, META

  // Configuration
  default_page: String, // Default landing page
  public_campaigns: Boolean, // Show campaigns

  // Branding
  branding: {
    header_title: String,
    primary_color: String, // Hex color
    secondary_color: String, // Hex color
    logo_url: String,
    custom_css: String,
    show_eve_kill_branding: Boolean
  },

  // Timestamps
  created_at: Date,
  updated_at: Date,
  verified_at: Date,
  last_checked: Date,

  // Analytics
  analytics: {
    total_views: Number,
    unique_visitors: Number,
    last_view: Date
  },

  // SSL Information (cached)
  ssl_info: {
    valid: Boolean,
    expires_at: Date,
    issuer: String,
    status: String // "valid", "expiring", "expired", "invalid"
  }
}
```

### Indexes

```javascript
// Primary indexes for performance
db.customdomains.createIndex({ "domain": 1 }, { unique: true })
db.customdomains.createIndex({ "owner_character_id": 1 })
db.customdomains.createIndex({ "entity_type": 1, "entity_id": 1 })
db.customdomains.createIndex({ "active": 1, "verified": 1 })

// Composite indexes for common queries
db.customdomains.createIndex({ "active": 1, "verified": 1, "domain": 1 })
db.customdomains.createIndex({ "owner_character_id": 1, "active": 1 })
```

## Request Flow

### 1. Domain Detection (`server/middleware/domainDetection.ts`)

```typescript
export default defineEventHandler(async (event) => {
  const host = getHeader(event, 'host')

  // Skip main domains
  if (isMainDomain(host)) {
    return
  }

  // Get domain configuration from cache/database
  const domainConfig = await getDomainConfig(host)

  if (domainConfig?.active && domainConfig?.verified) {
    // Set domain context for request
    event.context.domainContext = {
      isCustomDomain: true,
      domain: domainConfig.domain,
      config: domainConfig,
      entity: await getEntityData(domainConfig),
      entityType: domainConfig.entity_type
    }
  }
})
```

### 2. Context Propagation

The domain context is propagated through:
- **Server-side**: Event context object
- **Client-side**: Nuxt state management
- **Components**: Composables and providers

### 3. Response Customization

Based on domain context:
- Custom branding injection
- Entity-specific routing
- SEO optimization
- Analytics tracking

## Core Components

### Domain Context Composable (`app/composables/useDomainContext.ts`)

```typescript
export const useDomainContext = () => {
  const domainContextState = useState<IDomainContext>("domainContext", () => {
    // Initialize from SSR context
    if (process.server && nuxtApp.ssrContext?.event?.context?.domainContext) {
      return serializeDomainContext(nuxtApp.ssrContext.event.context.domainContext)
    }
    return { isCustomDomain: false }
  })

  return {
    domainContext: readonly(domainContextState),
    isCustomDomain: computed(() => domainContextState.value.isCustomDomain),
    // ... other reactive helpers
  }
}
```

### Custom Branding Provider (`app/components/common/CustomBrandingProvider.vue`)

```vue
<template>
  <div :class="customCssClasses" :style="customCssVariables">
    <component :is="'style'" v-if="customCss">{{ customCss }}</component>
    <slot />
  </div>
</template>

<script setup lang="ts">
const { customCssVariables, customCssClasses, customCss } = useCustomBranding()
</script>
```

### Domain Cache Helper (`server/helpers/domainCache.ts`)

```typescript
class DomainCache {
  private cache = new Map<string, CachedDomain>()
  private readonly TTL = 5 * 60 * 1000 // 5 minutes

  async getDomainConfig(domain: string): Promise<any> {
    const cached = this.cache.get(domain.toLowerCase())

    if (cached && !this.isExpired(cached)) {
      return cached.config
    }

    const config = await CustomDomains.findOne({ domain: domain.toLowerCase() })

    this.cache.set(domain.toLowerCase(), {
      config,
      timestamp: Date.now()
    })

    return config
  }
}
```

## API Endpoints

### Domain Management

#### `POST /api/user/domains`
Create new custom domain configuration.

**Request Body:**
```json
{
  "domain": "killboard.example.com",
  "entity_type": "corporation",
  "entity_id": 123456789,
  "default_page": "dashboard",
  "public_campaigns": true,
  "branding": {
    "header_title": "Corp Killboard",
    "primary_color": "#ff0000"
  }
}
```

**Response:**
```json
{
  "success": true,
  "domain": { /* domain configuration */ },
  "verification_token": "abc123..."
}
```

#### `GET /api/user/domains`
List user's custom domains.

#### `PATCH /api/user/domains/[id]`
Update domain configuration.

#### `DELETE /api/user/domains/[id]`
Delete custom domain.

### Domain Verification

#### `POST /api/user/domains/[id]/verify`
Trigger domain verification process.

**Methods:**
- DNS TXT record verification
- HTTP file verification
- Meta tag verification

#### `GET /api/ssl-check/[domain]`
Check SSL certificate status for domain.

**Response:**
```json
{
  "success": true,
  "domain": "example.com",
  "ssl": {
    "valid": true,
    "status": "valid",
    "expires_at": "2024-12-31T23:59:59Z",
    "issuer": "Let's Encrypt",
    "days_until_expiry": 90
  }
}
```

### SEO Endpoints

#### `GET /api/sitemap/[domain].xml`
Generate domain-specific XML sitemap.

#### `GET /api/robots/[domain].txt`
Generate domain-specific robots.txt.

#### `GET /api/og/index`
Generate Open Graph images for social sharing.

### Admin Endpoints

#### `GET /api/admin/domains`
List all domains (admin only).

#### `PATCH /api/admin/domains/[id]`
Admin domain management.

## Middleware System

### Domain Detection Middleware

**File**: `server/middleware/domainDetection.ts`

**Purpose**: Detect custom domains and set request context.

**Process**:
1. Extract hostname from request
2. Check if hostname is main domain
3. Query domain configuration from cache/database
4. Set domain context if valid
5. Track analytics

### SEO Routing Middleware

**File**: `server/middleware/seoRouting.ts`

**Purpose**: Handle SEO-related routes (`/sitemap.xml`, `/robots.txt`).

**Process**:
1. Check if request is for SEO resource
2. Extract domain from request
3. Redirect to appropriate API endpoint
4. Set proper content-type headers

## SEO Implementation

### Domain-Specific SEO (`app/composables/useDomainSeo.ts`)

```typescript
export const useDomainSeo = () => {
  const { domainContext, isCustomDomain } = useDomainContext()

  const setDomainSeoTags = (pageData: any) => {
    if (!isCustomDomain.value) return

    const domain = domainContext.value.domain
    const entityName = domainContext.value.entity?.name

    useSeoMeta({
      title: `${pageData.title} - ${entityName}`,
      description: `${pageData.description} on ${entityName} killboard`,
      ogTitle: `${pageData.title} - ${entityName}`,
      ogDescription: `${pageData.description}`,
      ogUrl: `https://${domain}${pageData.path}`,
      canonical: `https://${domain}${pageData.path}`
    })
  }

  return { setDomainSeoTags }
}
```

### Structured Data

JSON-LD structured data is automatically generated for:
- Organizations (corporations/alliances)
- WebSite schema
- BreadcrumbList navigation
- Killmail events

### Sitemap Generation

Dynamic XML sitemaps include:
- Entity overview pages
- Recent killmail pages
- Statistics pages
- Campaign pages (if enabled)

## Caching Strategy

### Multi-Level Caching

1. **Application Cache**: In-memory domain configuration cache
2. **Database Cache**: MongoDB query result caching
3. **CDN Cache**: CloudFlare caching for static assets
4. **Browser Cache**: Client-side caching with appropriate headers

### Cache Invalidation

```typescript
// Invalidate caches when domain config changes
export const invalidateDomainCache = async (domain: string) => {
  // Clear application cache
  domainCache.delete(domain.toLowerCase())

  // Clear database query cache
  await mongoose.connection.db.collection('querycache').deleteMany({
    key: new RegExp(domain, 'i')
  })

  // Purge CDN cache (if using CloudFlare)
  if (process.env.CLOUDFLARE_API_KEY) {
    await purgeCloudflareCache([
      `https://${domain}/*`
    ])
  }
}
```

### Cache Headers

```typescript
// Set appropriate cache headers based on content type
export const setCacheHeaders = (event: H3Event, type: 'static' | 'dynamic' | 'api') => {
  const headers = {
    static: { 'Cache-Control': 'public, max-age=31536000' }, // 1 year
    dynamic: { 'Cache-Control': 'public, max-age=300' }, // 5 minutes
    api: { 'Cache-Control': 'private, max-age=60' } // 1 minute
  }

  setHeaders(event, headers[type])
}
```

## Security Considerations

### Domain Validation

```typescript
const validateDomain = (domain: string): boolean => {
  // Check format
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/.test(domain)) {
    return false
  }

  // Check against blocked domains
  const blockedDomains = ['eve-kill.com', 'www.eve-kill.com', 'localhost']
  if (blockedDomains.some(blocked => domain.toLowerCase().includes(blocked))) {
    return false
  }

  // Check length limits
  if (domain.length > 253) {
    return false
  }

  return true
}
```

### Input Sanitization

```typescript
// Sanitize custom CSS input
const sanitizeCSS = (css: string): string => {
  // Remove potentially dangerous CSS
  return css
    .replace(/@import\s+url\([^)]*\)/gi, '') // Remove @import
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/expression\s*\(/gi, '') // Remove CSS expressions
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
}

// Sanitize color values
const sanitizeColor = (color: string): string => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color) ? color : '#000000'
}
```

### Rate Limiting

```typescript
// Rate limit domain verification attempts
const verificationLimiter = new Map<string, number[]>()

const isRateLimited = (domain: string): boolean => {
  const now = Date.now()
  const attempts = verificationLimiter.get(domain) || []

  // Clean old attempts (older than 1 hour)
  const recentAttempts = attempts.filter(time => now - time < 3600000)

  // Allow max 10 attempts per hour
  if (recentAttempts.length >= 10) {
    return true
  }

  recentAttempts.push(now)
  verificationLimiter.set(domain, recentAttempts)
  return false
}
```

## Monitoring & Analytics

### Domain Analytics (`server/helpers/domainAnalytics.ts`)

```typescript
export const trackDomainView = async (domain: string, request: any) => {
  const visitorIP = getClientIP(request)
  const userAgent = getHeader(request, 'user-agent')

  // Update domain statistics
  await CustomDomains.updateOne(
    { domain: domain.toLowerCase() },
    {
      $inc: { 'analytics.total_views': 1 },
      $set: { 'analytics.last_view': new Date() }
    }
  )

  // Track unique visitors (simplified)
  const visitorHash = hashIP(visitorIP)
  await DomainVisitors.updateOne(
    { domain: domain.toLowerCase(), visitor_hash: visitorHash },
    { $set: { last_visit: new Date() } },
    { upsert: true }
  )
}
```

### Health Monitoring

```typescript
// Monitor domain health
export const checkDomainHealth = async (domain: string) => {
  const checks = {
    dns: await checkDNSResolution(domain),
    ssl: await checkSSLCertificate(domain),
    response: await checkHTTPResponse(domain)
  }

  const healthy = Object.values(checks).every(check => check.healthy)

  // Update domain health status
  await CustomDomains.updateOne(
    { domain: domain.toLowerCase() },
    {
      $set: {
        'health_check': {
          ...checks,
          healthy,
          last_checked: new Date()
        }
      }
    }
  )

  return checks
}
```

### Error Tracking

```typescript
// Track domain-related errors
export const logDomainError = async (domain: string, error: Error, context: any) => {
  await DomainErrors.create({
    domain: domain.toLowerCase(),
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context,
    timestamp: new Date()
  })

  // Alert if error threshold exceeded
  const recentErrors = await DomainErrors.countDocuments({
    domain: domain.toLowerCase(),
    timestamp: { $gte: new Date(Date.now() - 3600000) } // Last hour
  })

  if (recentErrors >= 10) {
    await sendAlert(`High error rate for domain ${domain}`)
  }
}
```

## Deployment Guide

### Prerequisites

1. **Environment Variables**
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/eve-kill

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# Domain verification
DOMAIN_VERIFICATION_SECRET=your-secret-key

# SSL checking
SSL_CHECK_TIMEOUT=10000

# Analytics
ANALYTICS_ENABLED=true
```

2. **Database Setup**
```bash
# Create indexes
npm run db:create-indexes

# Migrate existing data (if applicable)
npm run db:migrate
```

### Deployment Steps

1. **Code Deployment**
```bash
# Install dependencies
npm install

# Build application
npm run build

# Start application
npm run start
```

2. **Database Migration**
```bash
# Run database migrations
npm run migrate:up

# Verify schema
npm run db:verify
```

3. **Cache Warming**
```bash
# Pre-warm domain cache
npm run cache:warm-domains
```

4. **Health Checks**
```bash
# Verify deployment
npm run health:check

# Test domain functionality
npm run test:domains
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name _;

    # Redirect to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;

    # SSL configuration for custom domains
    ssl_certificate /path/to/wildcard/cert.pem;
    ssl_certificate_key /path/to/wildcard/key.pem;

    # Proxy to Node.js application
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
    }

    # SEO files
    location ~ ^/(sitemap\.xml|robots\.txt)$ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        add_header Content-Type text/xml;
    }
}
```

## Troubleshooting

### Common Issues

#### Domain Not Resolving
```bash
# Check DNS propagation
dig +short CNAME your-domain.com
nslookup your-domain.com

# Check domain cache
curl -H "X-Debug: 1" http://localhost:3000/api/domain-detection \
  -d '{"host": "your-domain.com"}'
```

#### SSL Certificate Issues
```bash
# Check SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Test SSL API
curl http://localhost:3000/api/ssl-check/your-domain.com
```

#### Verification Failures
```bash
# Check TXT record
dig +short TXT _eve-kill-verification.your-domain.com

# Check HTTP verification
curl http://your-domain.com/.well-known/eve-kill-verification.txt
```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Set debug environment
DEBUG=domain:* npm run start

# Enable verbose logging
DOMAIN_DEBUG=true npm run start
```

### Performance Issues

```bash
# Monitor domain cache hit rates
npm run stats:cache

# Check database query performance
npm run db:explain-queries

# Profile application
npm run profile:start
```

### Database Queries

Useful MongoDB queries for troubleshooting:

```javascript
// Find domains with issues
db.customdomains.find({
  $or: [
    { verified: false },
    { 'ssl_info.status': { $in: ['expired', 'expiring', 'invalid'] } },
    { 'health_check.healthy': false }
  ]
})

// Check domain statistics
db.customdomains.aggregate([
  { $group: {
    _id: '$entity_type',
    count: { $sum: 1 },
    verified: { $sum: { $cond: ['$verified', 1, 0] } }
  }}
])

// Find recent errors
db.domainerrors.find({
  timestamp: { $gte: new Date(Date.now() - 3600000) }
}).sort({ timestamp: -1 })
```

---

## Additional Resources

- [MongoDB Indexing Best Practices](https://docs.mongodb.com/manual/applications/indexes/)
- [Nuxt 3 Documentation](https://nuxt.com/docs)
- [DNS Records Reference](https://www.cloudflare.com/learning/dns/dns-records/)
- [SSL Certificate Guide](https://letsencrypt.org/docs/)

Last Updated: 2024
Version: 1.0
