# Installation Guide

This guide will walk you through setting up Thessia for production on Kubernetes using the provided Helm chart.

## 📋 Prerequisites

Before installing Thessia, ensure you have the following prerequisites:

### Required Tools

- **Kubernetes Cluster**: A running Kubernetes cluster (v1.20+)
  - Local development: Minikube, kind, or Docker Desktop
  - Cloud providers: GKE, EKS, AKS, or DigitalOcean Kubernetes
- **kubectl**: Kubernetes CLI tool installed and configured to access your cluster
- **Helm**: Package manager for Kubernetes (v3.0+)

### Required Services

The following services need to be available in your cluster or externally accessible:

- **MongoDB**: Database for storing killmail and entity data
- **Redis**: Caching and job queue backend
- **Ingress Controller**: For external access (we recommend NGINX Ingress Controller)
- **Cert-Manager**: For automatic SSL certificate management (optional but recommended)

### EVE Online API Credentials

You'll need to register an application with EVE Online to get API credentials:

1. Go to [EVE Online Developers](https://developers.eveonline.com/)
2. Create a new application with the following scopes:
   - `esi-characters.read_corporation_roles.v1`
   - `esi-alliances.read_contacts.v1`
   - `esi-corporations.read_contacts.v1`
   - Any other scopes your application requires
3. Note down your Client ID, Client Secret, and Callback URL

## 🛠️ Installation Steps

### Step 1: Prepare Your Cluster

#### Install Required Components

If you don't have these components installed, you can install them using Helm:

```bash
# Add Helm repositories
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add jetstack https://charts.jetstack.io
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install NGINX Ingress Controller
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Install Cert-Manager (for SSL certificates)
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# Install MongoDB (if not using external service)
helm install mongodb bitnami/mongodb \
  --namespace mongodb \
  --create-namespace \
  --set auth.enabled=false \
  --set persistence.size=100Gi

# Install Redis (if not using external service)
helm install redis bitnami/redis \
  --namespace redis \
  --create-namespace \
  --set auth.enabled=false \
  --set master.persistence.size=20Gi
```

#### Create ClusterIssuer for SSL Certificates

Create a ClusterIssuer for Let's Encrypt:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@domain.com
    privateKeySecretRef:
      name: letsencrypt
    solvers:
    - http01:
        ingress:
          class: nginx
```

Apply it with:

```bash
kubectl apply -f cluster-issuer.yaml
```

### Step 2: Configure Thessia Values

Copy or directly edit the `values.yaml`


### Step 3: Install Thessia

Install Thessia using Helm:

```bash
cd Thessia/chart

# Install Thessia
helm install thessia . \
  --namespace eve-kill \
  --create-namespace \
  --values values.yaml

# Or upgrade if already installed
helm upgrade thessia . \
  --namespace eve-kill \
  --values values.yaml
```

### Step 4: Verify Installation

Check that all components are running:

```bash
# Check pods status
kubectl get pods -n eve-kill

# Check services
kubectl get svc -n eve-kill

# Check ingress
kubectl get ingress -n eve-kill

# View logs
kubectl logs -n eve-kill deployment/thessia -f
```

### Step 5: Access Your Application

Once everything is running, you can access Thessia through:

- **Web Interface**: `https://your-domain.com`
- **API Status**: `https://your-domain.com/api/status`
- **Health Check**: `https://your-domain.com/health`

## 🔧 Configuration Options

### Environment Variables

The following environment variables can be configured through the Helm values:

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://mongodb:27017/thessia` |
| `REDIS_URI` | Redis host | `redis` |
| `REDIS_PORT` | Redis port | `6379` |
| `ESI_URL` | EVE Online ESI API URL | `https://esi.evetech.net/` |
| `ESI_RATE_LIMIT` | ESI API rate limit | `25` |

### Scaling Components

You can scale individual components based on your needs:

```bash
# Scale the main application
helm upgrade thessia . --set thessia.replicas=2

# Enable autoscaling
helm upgrade thessia . --set thessia.autoscaling.enabled=true

# Scale processing services
helm upgrade thessia . --set processKillmails.replicas=3
```

### Resource Allocation

Adjust resource requests and limits based on your cluster capacity:

```yaml
thessia:
  resources:
    requests:
      cpu: 1000m
      memory: 1Gi
    limits:
      cpu: 4000m
      memory: 4Gi
```

## 🔍 Monitoring and Observability

### Metrics

Thessia exposes metrics at `/api/status` endpoint which includes:

- Queue counts and status
- Database entity counts
- Processing statistics
- System load and uptime
- Cache hit rates

It can also be viewed on the `/status` URL in the frontend

### Prometheus Integration

If you have Prometheus Operator installed, enable ServiceMonitor:

```yaml
monitoring:
  serviceMonitor:
    enabled: true
    interval: 30s
```

### Logs

View application logs:

```bash
# Main application logs
kubectl logs -n eve-kill deployment/thessia -f

# Processing service logs
kubectl logs -n eve-kill deployment/process-killmails -f

# Cron job logs
kubectl logs -n eve-kill job/thessia-cron -f
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Pod Fails to Start

Check pod events and logs:

```bash
kubectl describe pod -n eve-kill <pod-name>
kubectl logs -n eve-kill <pod-name>
```

#### 2. Database Connection Issues

Verify MongoDB is accessible:

```bash
kubectl exec -it -n eve-kill deployment/thessia -- bun console
```

#### 3. Redis Connection Issues

Check Redis connectivity:

```bash
kubectl exec -it -n eve-kill deployment/thessia -- redis-cli -h redis-master.redis.svc.cluster.local ping
```

#### 4. Ingress Not Working

Check ingress controller and certificates:

```bash
kubectl get ingress -n eve-kill
kubectl describe certificate -n eve-kill thessia-tls
```

### Performance Tuning

#### Database Optimization

Ensure proper MongoDB indexes are created:

```bash
kubectl exec -it -n mongodb mongodb-0 -- mongo thessia --eval "db.killmails.createIndex({killmail_id: 1})"
```

#### Memory Management

Monitor memory usage and adjust limits:

```bash
kubectl top pods -n eve-kill
```

## 🔄 Maintenance

### Updating Thessia

To update to a new version:

```bash
# Update the image tag
helm upgrade thessia . --set global.image.tag=v1.2.3

# Or update your values.yaml and upgrade
helm upgrade thessia . --values values.yaml
```

### Backup and Recovery

#### Database Backup

Create MongoDB backups:

```bash
kubectl exec -it -n mongodb mongodb-0 -- mongodump --db thessia --gzip --archive > thessia-backup-$(date +%Y%m%d).gz
```

#### Persistent Volume Backup

Backup persistent volumes using your cloud provider's snapshot functionality or a backup tool like Velero.

## � Additional Resources

- [Thessia Documentation](../index.md)
- [API Documentation](../api/index.md)
- [Development Guide](development-guide.md)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)

## 🆘 Support

If you encounter issues:

1. Check the [GitHub Issues](https://github.com/eve-kill/Thessia/issues)
2. Review the application logs
3. Join our Discord server for community support
4. Create a detailed issue report with logs and configuration

