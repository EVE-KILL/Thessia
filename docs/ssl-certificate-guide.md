# SSL Certificate Guide for Custom Domains

This guide provides comprehensive instructions for setting up SSL certificates for custom domains on EVE-KILL.

## Overview

When setting up a custom domain for your EVE-KILL killboard, you'll need to configure SSL certificates to ensure secure HTTPS connections. This guide covers various SSL certificate options and setup procedures.

## SSL Certificate Options

### 1. Let's Encrypt (Recommended - Free)

Let's Encrypt provides free SSL certificates with automatic renewal.

**Advantages:**
- Completely free
- Automatic renewal
- Widely supported
- Easy to set up with most hosting providers

**Setup Process:**
1. Ensure your domain is properly pointed to EVE-KILL servers
2. Contact your hosting provider or use automated tools like Certbot
3. Generate certificate for your domain
4. Configure automatic renewal

**Example with Certbot:**
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Set up automatic renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Cloudflare SSL (Recommended - Free/Paid)

Cloudflare provides free SSL certificates and additional security features.

**Advantages:**
- Free SSL certificates
- DDoS protection
- CDN capabilities
- Easy DNS management
- Automatic certificate management

**Setup Process:**
1. Sign up for Cloudflare account
2. Add your domain to Cloudflare
3. Update nameservers at your domain registrar
4. Enable SSL/TLS encryption (Full or Full Strict mode)
5. Set up page rules for EVE-KILL integration

**Cloudflare Configuration:**
```
DNS Records:
CNAME   @   eve-kill.com   (Orange cloud enabled)
CNAME   www   eve-kill.com   (Orange cloud enabled)

SSL/TLS Settings:
- Encryption mode: Full (strict)
- Always use HTTPS: On
- HTTP Strict Transport Security (HSTS): Enabled
```

### 3. Commercial SSL Certificates

Purchase SSL certificates from certificate authorities like DigiCert, Sectigo, or GlobalSign.

**Advantages:**
- Extended validation options
- Longer validity periods
- Insurance coverage
- Phone support

**Setup Process:**
1. Purchase SSL certificate from CA
2. Generate Certificate Signing Request (CSR)
3. Complete domain validation
4. Install certificate on your server
5. Configure web server

### 4. Domain Registrar SSL

Many domain registrars offer SSL certificates as add-on services.

**Advantages:**
- Integrated with domain management
- Simple purchasing process
- Often includes support

**Disadvantages:**
- Usually more expensive than alternatives
- May require manual renewal

## DNS Configuration for SSL

### Required DNS Records

For proper SSL certificate validation and EVE-KILL integration:

```
Type    Name    Value               TTL
CNAME   @       eve-kill.com        300
CNAME   www     eve-kill.com        300
TXT     @       "v=spf1 -all"       300
```

### Certificate Validation Records

During SSL certificate issuance, you may need to add validation records:

```
# Example DNS validation record
TXT   _acme-challenge.yourdomain.com   "validation-string-here"
```

## Security Best Practices

### 1. SSL/TLS Configuration

**Minimum TLS Version:** TLS 1.2 or higher
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
```

**Strong Cipher Suites:**
```nginx
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers off;
```

### 2. HTTP Security Headers

Configure security headers for enhanced protection:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options nosniff;
add_header X-Frame-Options DENY;
add_header X-XSS-Protection "1; mode=block";
```

### 3. Certificate Monitoring

Set up monitoring for certificate expiration:

```bash
# Check certificate expiration
openssl x509 -in /path/to/certificate.crt -text -noout | grep "Not After"

# Automated monitoring script
#!/bin/bash
DOMAIN="yourdomain.com"
EXPIRY=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
echo "Certificate expires: $EXPIRY"
```

## Verification and Testing

### 1. SSL Certificate Verification

Test your SSL certificate installation:

```bash
# Check certificate details
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Test with SSL Labs
# Visit: https://www.ssllabs.com/ssltest/
```

### 2. EVE-KILL Integration Testing

Verify your custom domain works correctly with EVE-KILL:

1. Visit your domain: `https://yourdomain.com`
2. Check for proper SSL padlock in browser
3. Verify domain verification status in EVE-KILL admin panel
4. Test various pages and functionality

### 3. Performance Testing

Monitor SSL performance impact:

```bash
# Test connection speed
curl -w "Connect: %{time_connect}s\nSSL: %{time_appconnect}s\nTotal: %{time_total}s\n" -o /dev/null -s https://yourdomain.com
```

## Common Issues and Troubleshooting

### Mixed Content Warnings

Ensure all resources load over HTTPS:

```javascript
// Correct - Protocol-relative URLs
<img src="//images.eve-kill.com/character/123.jpg">

// Incorrect - HTTP URLs
<img src="http://images.eve-kill.com/character/123.jpg">
```

### Certificate Chain Issues

Verify complete certificate chain installation:

```bash
# Check certificate chain
openssl s_client -connect yourdomain.com:443 -showcerts
```

### Domain Validation Failures

Common causes and solutions:

1. **DNS propagation delays:** Wait 24-48 hours for DNS changes
2. **Incorrect DNS records:** Verify CNAME points to eve-kill.com
3. **Firewall blocking:** Ensure ports 80 and 443 are open
4. **Rate limiting:** Let's Encrypt has rate limits for certificate requests

### Certificate Renewal Issues

Automatic renewal troubleshooting:

```bash
# Test renewal process
sudo certbot renew --dry-run

# Check renewal logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

## Provider-Specific Instructions

### Cloudflare Setup

1. **Add Domain to Cloudflare:**
   - Log into Cloudflare dashboard
   - Click "Add a Site"
   - Enter your domain name

2. **Configure DNS:**
   ```
   Type: CNAME, Name: @, Target: eve-kill.com, Proxy: ON
   Type: CNAME, Name: www, Target: eve-kill.com, Proxy: ON
   ```

3. **SSL/TLS Settings:**
   - Go to SSL/TLS → Overview
   - Set encryption mode to "Full (strict)"
   - Enable "Always Use HTTPS"

### AWS Certificate Manager

1. **Request Certificate:**
   ```bash
   aws acm request-certificate \
     --domain-name yourdomain.com \
     --validation-method DNS
   ```

2. **Validate Domain:**
   - Add CNAME records provided by ACM
   - Wait for validation to complete

### GoDaddy SSL

1. Purchase SSL certificate from GoDaddy
2. Generate CSR on your server
3. Submit CSR to GoDaddy
4. Complete domain validation
5. Download and install certificate

## Monitoring and Maintenance

### Automated Monitoring

Set up automated SSL certificate monitoring:

```python
#!/usr/bin/env python3
import ssl
import socket
import datetime
from datetime import timedelta

def check_ssl_expiry(hostname, port=443):
    context = ssl.create_default_context()
    with socket.create_connection((hostname, port)) as sock:
        with context.wrap_socket(sock, server_hostname=hostname) as ssock:
            cert = ssock.getpeercert()
            expiry_date = datetime.datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
            days_until_expiry = (expiry_date - datetime.datetime.now()).days
            return days_until_expiry

# Check certificate
days_left = check_ssl_expiry('yourdomain.com')
if days_left < 30:
    print(f"WARNING: Certificate expires in {days_left} days!")
```

### Renewal Automation

Set up automated certificate renewal:

```bash
#!/bin/bash
# SSL renewal script
DOMAIN="yourdomain.com"
CERT_PATH="/etc/ssl/certs/${DOMAIN}.crt"
KEY_PATH="/etc/ssl/private/${DOMAIN}.key"

# Check if renewal is needed
if openssl x509 -checkend 2592000 -noout -in "$CERT_PATH"; then
    echo "Certificate is still valid for more than 30 days"
else
    echo "Certificate needs renewal"
    # Add renewal commands here
fi
```

## Support and Resources

### Official Documentation Links

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Cloudflare SSL Documentation](https://developers.cloudflare.com/ssl/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)

### SSL Testing Tools

- [SSL Labs Server Test](https://www.ssllabs.com/ssltest/)
- [SSL Checker](https://www.sslshopper.com/ssl-checker.html)
- [Security Headers Test](https://securityheaders.com/)

### EVE-KILL Support

For EVE-KILL specific SSL issues:

1. Check domain verification status in your account settings
2. Ensure your domain CNAME points to eve-kill.com
3. Contact EVE-KILL support with your domain details

---

**Note:** This guide provides general SSL certificate setup instructions. Specific implementation details may vary based on your hosting provider, domain registrar, and chosen SSL certificate authority. Always refer to your provider's specific documentation for detailed instructions.
