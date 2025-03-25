# Thessia Helm Chart

A Helm chart for deploying EVE-Kill Thessia, an EVE Online killboard application.

## Introduction

This chart deploys the Thessia application and its associated components on a Kubernetes cluster. Thessia is a modern killboard for EVE Online, designed to provide a comprehensive view of in-game combat activities.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+
- PV provisioner support in the underlying infrastructure (if persistence is needed)
- Ingress controller (nginx recommended)

## Installing the Chart

To install the chart with the release name `my-release`:

```bash
# Clone the repository
git clone https://github.com/EVE-KILL/Thessia.git
cd Thessia/chart

# Install the chart
helm install my-release .
```

## Uninstalling the Chart

To uninstall/delete the `my-release` deployment:

```bash
helm uninstall my-release
```

## Configuration

The following table lists the configurable parameters of the Thessia chart and their default values.

### Global Settings

| Parameter | Description | Default |
| --------- | ----------- | ------- |
| `global.image.repository` | Image repository | `ghcr.io/eve-kill/thessia` |
| `global.image.tag` | Image tag | `latest` |
| `global.image.pullPolicy` | Image pull policy | `Always` |
| `global.env.mongoUri` | MongoDB connection URI | `mongodb://mongodb.mongodb.svc.cluster.local:27017/thessia` |
| `global.env.redisUri` | Redis host | `redis.redis.svc.cluster.local` |
| `global.env.redisPort` | Redis port | `6379` |
| `global.env.redisDb` | Redis database number | `1` |
| `global.env.meilisearchUri` | Meilisearch URI | `http://meilisearch.meilisearch.svc.cluster.local:7700` |
| `global.env.processKillmails` | Enable killmail processing | `false` |
| `global.env.enableTasks` | Enable background tasks | `false` |
| `global.env.host` | Host address to bind to | `0.0.0.0` |
| `global.env.esiUrl` | EVE ESI API URL | `https://esi.evetech.net` |
| `global.env.esiRateLimit` | ESI API rate limit | `25` |
| `global.env.redisqId` | RedisQ ID | `""` |
| `global.env.sensitive.eveClientId` | EVE Online OAuth Client ID | `""` |
| `global.env.sensitive.eveClientSecret` | EVE Online OAuth Client Secret | `""` |
| `global.env.sensitive.eveClientRedirect` | EVE Online OAuth Redirect URI | `""` |
| `global.env.sensitive.eveClientIdDev` | EVE Online OAuth Client ID (dev) | `""` |
| `global.env.sensitive.eveClientSecretDev` | EVE Online OAuth Client Secret (dev) | `""` |
| `global.env.sensitive.eveClientRedirectDev` | EVE Online OAuth Redirect URI (dev) | `""` |
| `global.env.sensitive.backendDiscordUrl` | Discord webhook URL for backend notifications | `""` |
| `global.env.sensitive.discordNewComment` | Discord webhook URL for new comments | `""` |
| `global.env.sensitive.discordReportComment` | Discord webhook URL for reported comments | `""` |
| `global.env.sensitive.openAIAPIKey` | OpenAI API key for content moderation | `""` |
| `global.env.sensitive.tenorAPIKey` | Tenor API key for GIF support | `""` |
| `global.env.sensitive.*` | Other sensitive configuration values | `""` |

### Service Account Configuration

| Parameter | Description | Default |
| --------- | ----------- | ------- |
| `serviceAccount.create` | Create service account | `true` |
| `serviceAccount.name` | Service account name | `""` (Defaults to release name) |
| `serviceAccount.annotations` | Service account annotations | `{}` |
| `rbac.create` | Create RBAC resources | `true` |

### Components

#### Thessia Web Application

| Parameter | Description | Default |
| --------- | ----------- | ------- |
| `thessia.enabled` | Enable Thessia web application | `true` |
| `thessia.replicas` | Number of replicas | `1` |
| `thessia.autoscaling.enabled` | Enable autoscaling | `true` |
| `thessia.autoscaling.minReplicas` | Minimum replicas | `1` |
| `thessia.autoscaling.maxReplicas` | Maximum replicas | `5` |
| `thessia.autoscaling.targetCPUUtilizationPercentage` | Target CPU utilization | `50` |
| `thessia.resources` | Resource requests and limits | See values.yaml |
| `thessia.service.port` | Service port | `3000` |
| `thessia.service.targetPort` | Container port | `3000` |
| `thessia.securityContext` | Pod security context | See values.yaml |

#### Processing Components

| Parameter | Description | Default |
| --------- | ----------- | ------- |
| `processKillmails.enabled` | Enable Killmail processing | `false` |
| `processKillmails.replicas` | Number of replicas | `1` |
| `processEntities.enabled` | Enable Entity processing | `false` |
| `processEntities.replicas` | Number of replicas | `1` |
| `processWars.enabled` | Enable War processing | `false` |
| `processWars.replicas` | Number of replicas | `1` |
| `redisq.enabled` | Enable RedisQ consumer | `false` |
| `redisq.replicas` | Number of replicas | `1` |
| `cron.enabled` | Enable Cron jobs | `false` |
| `cron.schedule` | Cron schedule | `* * * * *` |

### Ingress Configuration

| Parameter | Description | Default |
| --------- | ----------- | ------- |
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.className` | Ingress class name | `nginx` |
| `ingress.annotations` | Ingress annotations | See values.yaml |
| `ingress.hosts` | List of ingress hosts | See values.yaml |
| `ingress.tls` | Ingress TLS configuration | See values.yaml |

## Security Considerations

This chart implements several security best practices:

1. **Pod Security Context**: All pods run with a non-root user (UID 1000)
2. **Secret Management**: Sensitive data is stored in Kubernetes Secrets
3. **Network Policies**: Restricts pod communication to only necessary services
4. **RBAC**: Uses dedicated service accounts with minimal permissions
5. **Resource Limits**: Sets resource requests and limits to prevent resource exhaustion
6. **TLS**: Configures TLS for ingress traffic
7. **Horizontal Pod Autoscaler**: Automatically scales based on load

## Customizing Environment Variables

To add custom environment variables, you can override the default values:

```yaml
global:
  env:
    # Add your custom environment variables
    redisqId: "thessia-production"
    backendDiscordUrl: "https://discord.com/api/webhooks/your-webhook-url"

    # Sensitive information
    sensitive:
      eveClientId: "your-client-id"
      eveClientSecret: "your-client-secret"
```

## Troubleshooting

### Pods Stuck in Pending State

Check if your cluster has enough resources:

```bash
kubectl describe pod -n <namespace> <pod-name>
```

## Development

To contribute to this chart:

1. Make your changes
2. Update the documentation
3. Use `helm lint` and `helm template` to validate your changes
4. Submit a pull request to <https://github.com/EVE-KILL/Thessia>
