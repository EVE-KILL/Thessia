# Production Deployment Guide

This guide covers different methods for deploying Thessia in production environments. Choose the deployment method that best fits your infrastructure and requirements.

## 🚀 Deployment Options

### Kubernetes (Recommended)

Deploy Thessia on Kubernetes using our Helm chart for scalable, production-ready deployments with high availability, automatic scaling, and comprehensive monitoring.

**Best for**: Large-scale deployments, high availability requirements, cloud environments

[📖 Kubernetes Deployment Guide](./kubernetes.md)

### Docker Compose

Deploy Thessia using Docker Compose for simpler setups with all components containerized. This method provides good isolation and easy management for medium-scale deployments.

**Best for**: Medium-scale deployments, VPS hosting, traditional server environments

[📖 Docker Compose Deployment Guide](./docker.md)

### Raw Installation

Deploy Thessia directly on your server using Node.js/Bun runtime. This method provides maximum control and minimal overhead but requires more manual configuration.

**Best for**: Small-scale deployments, development environments, custom setups

[📖 Raw Installation Guide](./raw.md)

## 🔧 Prerequisites (All Methods)

Before deploying Thessia, ensure you have:

### Required Services

- **MongoDB**: Database for storing killmail and entity data
- **Redis**: Caching and job queue backend
- **Meilisearch**: Search engine for fast data queries

### EVE Online API Credentials

You'll need to register an application with EVE Online:

1. Go to [EVE Online Developers](https://developers.eveonline.com/)
2. Create a new application with required scopes
3. Note your Client ID, Client Secret, and Callback URL

### System Requirements

- **CPU**: Minimum 2 cores (4+ recommended for production)
- **Memory**: Minimum 4GB RAM (8GB+ recommended for production)
- **Storage**: Minimum 50GB (SSD recommended)
- **Network**: Stable internet connection for ESI API access

## 📊 Comparison of Deployment Methods

| Feature | Kubernetes | Docker Compose | Raw Installation |
|---------|------------|----------------|------------------|
| **Complexity** | High | Medium | Low |
| **Scalability** | Excellent | Good | Limited |
| **High Availability** | Yes | Limited | No |
| **Resource Efficiency** | Good | Good | Excellent |
| **Monitoring** | Built-in | Manual | Manual |
| **Updates** | Rolling | Restart | Manual |
| **Backup** | Automated | Manual | Manual |

## 🔗 Additional Resources

- [Development Guide](../development-guide.md)
- [API Documentation](../api/index.md)
- [Websocket Client Guide](../websocket-client-guide.md)
- [Main Documentation](../index.md)
