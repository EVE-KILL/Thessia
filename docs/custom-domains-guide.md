# Custom Domain Guide for EVE-KILL

This comprehensive guide will walk you through setting up and managing custom domains for your EVE Online corporation or alliance killboard on EVE-KILL.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Domain Setup Process](#domain-setup-process)
4. [DNS Configuration](#dns-configuration)
5. [SSL Certificate Setup](#ssl-certificate-setup)
6. [Domain Verification](#domain-verification)
7. [Customization Options](#customization-options)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)
10. [FAQ](#faq)

## Overview

Custom domains allow EVE Online corporations and alliances to run their killboards on their own domain names while leveraging EVE-KILL's powerful infrastructure. Your killboard will be fully branded with your organization's identity while maintaining all the features and performance of EVE-KILL.

### Key Features

- **Full Branding**: Customize colors, logos, and styling to match your organization
- **SEO Optimized**: Your domain gets proper search engine optimization
- **SSL Support**: Secure HTTPS connections with your own SSL certificate
- **Campaign Integration**: Show your recruitment campaigns on your custom domain
- **Performance**: Same high-performance infrastructure as EVE-KILL
- **Analytics**: Track visitors and engagement on your domain

### Supported Entity Types

- **Characters**: Personal killboards for individual pilots
- **Corporations**: Corporate killboards for your corp
- **Alliances**: Alliance-wide killboards for your coalition

## Getting Started

### For Users

1. **Setup Cloudflare** for your domain (free plan sufficient)
2. **Login to EVE-KILL** with your character
3. **Navigate to Settings** → Custom Domains
4. **Click "Add New Domain"** and configure your domain
5. **Configure DNS in Cloudflare** as instructed (CNAME to `c.eve-kill.com`)
6. **Enable Cloudflare Proxy** (orange cloud icon) - required for SSL
7. **Verify your domain** using the provided methods
8. **Customize your branding** and launch your killboard

### Account Requirements

- Character, corporation, or alliance must be registered on EVE-KILL
- Account holder must have appropriate permissions for the entity
- Domain must not conflict with existing EVE-KILL domains

## Domain Setup Process

### Step 1: Access Domain Settings

1. Log into EVE-KILL with your character
2. Navigate to **Settings** → **Custom Domains**
3. Click **"Add New Domain"**

### Step 2: Configure Domain Details

Fill out the domain configuration form:

**Basic Information:**
- **Domain Name**: Enter your fully qualified domain name (e.g., `killboard.example.com`)
- **Entity Type**: Select Character, Corporation, or Alliance
- **Entity**: Choose the specific entity this domain represents

**Display Settings:**
- **Default Page**: Choose what visitors see first (Dashboard, Recent Kills, etc.)
- **Show Campaigns**: Enable/disable recruitment campaign display
- **Show EVE-KILL Branding**: Choose whether to display EVE-KILL attribution

**Branding Options:**
- **Header Title**: Custom title for your killboard
- **Primary Color**: Main color for UI elements
- **Secondary Color**: Accent color for highlights
- **Custom Logo**: Upload your organization's logo
- **Custom CSS**: Advanced styling options

### Step 3: DNS Configuration

After creating your domain configuration, you'll need to set up DNS records using **Cloudflare** (our officially supported DNS provider):

1. **CNAME Record**: Point your domain to `c.eve-kill.com`
   ```dns
   Type: CNAME
   Name: killboard (or @ for root domain)
   Value: c.eve-kill.com
   TTL: Auto (or 300 seconds)
   Proxy Status: Proxied (Orange Cloud)
   ```

   **Important**: Use `c.eve-kill.com` as your CNAME target and ensure the **Proxy Status is enabled** (orange cloud) for SSL and performance benefits.

2. **Verification Record**: Add the provided TXT record for verification
   ```dns
   Type: TXT
   Name: _eve-kill-verification
   Value: [provided verification token]
   TTL: Auto (or 300 seconds)
   ```

### Step 4: Domain Verification

EVE-KILL will automatically verify your domain using multiple methods:

1. **DNS TXT Record**: Checks for the verification token
2. **HTTP Verification**: Places a verification file on your domain
3. **Meta Tag Verification**: Adds verification meta tags to pages

Verification usually completes within a few minutes but can take up to 24 hours.

## DNS Configuration

### Cloudflare Setup (Required)

**EVE-KILL officially supports Cloudflare only** for custom domains. Other DNS providers are not supported due to the complexity of SSL certificate management, security configurations, and performance optimization.

#### Why Cloudflare Only?

Cloudflare provides essential features that make custom domains reliable and secure:

- **Free SSL certificates** with automatic renewal and management
- **DDoS protection** and advanced security features
- **Global CDN** for superior performance worldwide
- **Seamless proxy handling** for SSL and traffic routing
- **Advanced security rules** and bot protection
- **Analytics and monitoring** built-in
- **Easy management** through their intuitive dashboard

#### Setup Instructions

1. **Create Cloudflare Account**
   - Sign up at [cloudflare.com](https://cloudflare.com) (free plan is sufficient)
   - Add your domain to Cloudflare

2. **Update Nameservers**
   - Cloudflare will provide you with nameservers
   - Update nameservers at your domain registrar
   - Wait for nameserver propagation (usually 5-15 minutes)

3. **Configure DNS Records**
   - Go to **DNS** → **Records** in Cloudflare dashboard
   - Add CNAME record pointing to `c.eve-kill.com`
   - **Enable Proxy Status** (orange cloud icon) - this is crucial
   - Add the TXT verification record provided by EVE-KILL

4. **SSL/TLS Settings**
   - Go to **SSL/TLS** → **Overview**
   - Set encryption mode to **Flexible** (required due to upstream HTTP configuration)
   - Enable **Always Use HTTPS** under **Edge Certificates**

5. **Security Settings (Recommended)**
   - Go to **Security** → **Settings**
   - Set Security Level to **Medium** or **High**
   - Enable **Bot Fight Mode** for additional protection

#### Verification Process

Once configured, EVE-KILL will automatically:
- Detect your Cloudflare proxy configuration
- Verify domain ownership through the TXT record
- Enable your custom domain within 5-15 minutes

### DNS Propagation

DNS changes can take time to propagate globally:
- **Typical Time**: 5-15 minutes
- **Maximum Time**: 24-48 hours
- **Check Status**: Use DNS checking tools to verify propagation

## SSL Certificate Setup

### Cloudflare

Cloudflare provides free SSL certificates with automatic renewal:

1. **Add Domain to Cloudflare**
   - Sign up for Cloudflare (free plan available)
   - Add your domain to Cloudflare
   - Update nameservers at your registrar

2. **Enable SSL**
   - Go to **SSL/TLS** → **Overview**
   - Set encryption mode to **Full** or **Full (Strict)**
   - Enable **Always Use HTTPS**

3. **Configure DNS**
   - Add CNAME record with **Proxy status** enabled (orange cloud)
   - SSL certificate is automatically provisioned

## Domain Verification

### Automatic Verification Methods

EVE-KILL uses multiple verification methods to ensure domain ownership:

#### 1. DNS TXT Record Verification
- **Record Name**: `_eve-kill-verification`
- **Record Value**: Unique token provided by EVE-KILL
- **Verification**: Automatic check every 5 minutes

#### 2. HTTP File Verification
- **File Location**: `http://yourdomain.com/.well-known/eve-kill-verification.txt`
- **File Content**: Verification token
- **Verification**: HTTP request to verify file presence

#### 3. Meta Tag Verification
- **Tag Location**: HTML `<head>` section of your pages
- **Tag Format**: `<meta name="eve-kill-verification" content="token">`
- **Verification**: Scrapes page for verification meta tag

### Manual Verification Steps

If automatic verification fails:

1. **Check DNS Propagation**
   - Use tools like WhatsMyDNS.net
   - Ensure TXT record is globally propagated

2. **Verify CNAME Record**
   - Confirm CNAME points to `eve-kill.com`
   - Check for conflicting A records

3. **Test HTTP Access**
   - Ensure domain resolves and responds
   - Check for redirect loops or errors

4. **Contact Support**
   - If issues persist, contact EVE-KILL support
   - Provide domain name and error details

## Customization Options

### Visual Branding

#### Logo Upload
- **Supported Formats**: PNG, JPG, SVG
- **Recommended Size**: 200x50 pixels
- **Maximum Size**: 2MB
- **Placement**: Header navigation area

#### Color Customization
- **Primary Color**: Main interface elements, buttons, links
- **Secondary Color**: Accents, highlights, hover states
- **Format**: Hex color codes (e.g., #FF0000)

#### Custom CSS
Advanced users can add custom CSS for complete control:

```css
/* Example custom CSS */
.navbar {
    background: linear-gradient(45deg, #your-color1, #your-color2);
}

.killmail-card {
    border-left: 4px solid var(--primary-color);
}

/* Custom fonts */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');

body {
    font-family: 'Orbitron', sans-serif;
}
```

### Functional Settings

#### Default Landing Page
Choose what visitors see first:
- **Dashboard**: Entity overview with recent activity
- **Recent Kills**: Latest killmails
- **Top Lists**: Most active pilots/ships
- **Statistics**: Detailed analytics and charts

#### Campaign Integration
- **Enable Campaigns**: Show recruitment posts
- **Campaign Filtering**: Display only relevant campaigns
- **Campaign Placement**: Choose where campaigns appear

#### EVE-KILL Branding
- **Show Attribution**: Display "Powered by EVE-KILL" footer
- **Hide Attribution**: Remove EVE-KILL branding (premium feature)

### SEO Optimization

EVE-KILL automatically optimizes your custom domain for search engines:

- **Custom Meta Tags**: Domain-specific titles and descriptions
- **Structured Data**: JSON-LD markup for killmails and entities
- **Sitemap Generation**: Automatic XML sitemap creation
- **Canonical URLs**: Proper URL canonicalization
- **Open Graph**: Social media sharing optimization

## Troubleshooting

### Common Issues

#### Domain Not Resolving
**Problem**: Visitors can't access your domain
**Solutions**:
1. Check DNS propagation with online tools
2. Verify CNAME record points to `eve-kill.com`
3. Clear DNS cache (`ipconfig /flushdns` on Windows)
4. Wait for full DNS propagation (up to 48 hours)

#### SSL Certificate Errors
**Problem**: Browser shows SSL warnings
**Solutions**:
1. Use EVE-KILL's SSL checker tool
2. Verify certificate covers your domain
3. Check certificate expiration date
4. Ensure intermediate certificates are installed

#### Verification Failed
**Problem**: Domain verification not completing
**Solutions**:
1. Double-check TXT record value
2. Ensure no typos in verification token
3. Verify DNS propagation of TXT record
4. Try manual verification methods

#### Custom Styling Not Applied
**Problem**: Custom CSS or branding not showing
**Solutions**:
1. Clear browser cache
2. Check CSS syntax for errors
3. Verify color codes are valid hex values
4. Test in incognito/private browsing mode

#### Slow Performance
**Problem**: Domain loads slowly
**Solutions**:
1. Use Cloudflare for CDN acceleration
2. Optimize uploaded images
3. Minimize custom CSS
4. Check DNS response times

### Error Messages

#### "Domain Already Exists"
- **Cause**: Domain is already configured by another user
- **Solution**: Contact support if you believe this is an error

#### "Invalid Domain Format"
- **Cause**: Domain name format is incorrect
- **Solution**: Use proper FQDN format (e.g., `subdomain.domain.com`)

#### "DNS Verification Timeout"
- **Cause**: TXT record not found or propagation delay
- **Solution**: Check TXT record and wait for propagation

#### "SSL Verification Failed"
- **Cause**: Certificate issues or HTTPS not properly configured
- **Solution**: Check SSL setup and certificate validity

### Getting Help

If you encounter issues not covered in this guide:

1. **Check System Status**: Visit EVE-KILL status page
2. **Search Forums**: Look for similar issues in community forums
3. **Contact Support**: Submit support ticket with:
   - Domain name
   - Error messages
   - Screenshots of issues
   - DNS configuration details

## Best Practices

### Security
- **Use HTTPS**: Always enable SSL/TLS encryption
- **Keep Certificates Updated**: Monitor expiration dates
- **Regular Monitoring**: Check domain health periodically
- **Backup DNS**: Keep backup DNS provider configured

### Performance
- **Use CDN**: Leverage Cloudflare or similar services
- **Optimize Images**: Compress logos and custom images
- **Minimize Custom CSS**: Keep styling lightweight
- **Monitor Speed**: Use tools like Google PageSpeed Insights

### SEO
- **Descriptive Titles**: Use clear, descriptive page titles
- **Meta Descriptions**: Write compelling meta descriptions
- **Regular Updates**: Keep content fresh with recent killmails
- **Social Sharing**: Enable Open Graph tags

### Maintenance
- **Monitor Uptime**: Use monitoring services
- **Regular Backups**: Backup Cloudflare configurations
- **Update Contact Info**: Keep domain registration current
- **Review Analytics**: Monitor traffic and engagement

## FAQ

### General Questions

**Q: How much does a custom domain cost?**
A: Custom domains are free for all EVE-KILL users. You only pay for your domain name and any additional services (SSL certificates, CDN, etc.).

**Q: Can I use a root domain (example.com) instead of a subdomain?**
A: Yes, you can use either root domains or subdomains. Root domains require A record setup instead of CNAME.

**Q: How many custom domains can I have?**
A: Each user can configure multiple domains, but each domain can only point to one entity.

**Q: Can I transfer a domain to another character/corp?**
A: Domain ownership can be transferred through the admin interface or by contacting support.

### Technical Questions

**Q: What happens if my domain expires?**
A: Your custom domain will become inaccessible, but your data remains safe. Renew your domain to restore access.

**Q: Can I use custom domains with APIs?**
A: Yes, all EVE-KILL APIs work with custom domains using the same endpoints.

**Q: Do custom domains support all EVE-KILL features?**
A: Yes, custom domains have full feature parity with the main EVE-KILL site.

**Q: How do I set up email with my domain?**
A: Custom domains only handle web traffic. Configure MX records separately for email services.

### Troubleshooting Questions

**Q: My domain shows a security warning, what should I do?**
A: This indicates an SSL certificate issue. Check your SSL configuration and ensure certificates are properly installed.

**Q: Why is my verification taking so long?**
A: DNS propagation can take up to 48 hours. Use DNS checking tools to verify your records have propagated globally.

**Q: Can I change my domain after it's set up?**
A: Yes, you can modify domain settings including the domain name itself through the admin interface.

**Q: What if I need help with Cloudflare configuration?**
A: Refer to Cloudflare's documentation or contact their support. EVE-KILL support can also provide guidance for Cloudflare-specific configurations.
