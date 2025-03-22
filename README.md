# Thessia - EVE-KILL Application

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/eve-kill/Thessia/actions/workflows/pipeline.yml/badge.svg)](https://github.com/eve-kill/Thessia/actions/workflows/pipeline.yml)
[![Dependency Status](https://img.shields.io/github/dependabot/eve-kill/Thessia)](https://github.com/eve-kill/Thessia/pulls?q=is%3Apr+author%3Aapp%2Fdependabot)
[![Translation Status](https://img.shields.io/badge/Translations-Transifex-blue)](https://app.transifex.com/eve-kill/thessia)
[![Powered by Bun](https://img.shields.io/badge/Powered%20by-Bun-orange)](https://bun.sh)

A modern application for EVE Online killmail tracking and analysis, built with Nuxt 3, MongoDB, Redis, and BullMQ.

## 🛠️ Tech Stack

- **Frontend & Backend**: Nuxt 3 (Vue 3 & Nitro)
- **UI Components**: Nuxt/UI
- **Database**: MongoDB (via Mongoose)
- **Caching**: Redis (via ioredis)
- **Job Processing**: BullMQ
- **Package Manager**: Bun
- **Search Engine**: Meilisearch
- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **Monitoring**: Sentry

## 📋 Prerequisites

- [Bun](https://bun.sh) (required)
- MongoDB
- Redis
- Meilisearch
- Docker & Docker Compose (for containerized deployment)
- Kubernetes (for k8s deployment)

## 🚀 Installation

Clone the repository and install dependencies:

```bash
# Clone the repository
git clone https://github.com/eve-kill/Thessia.git
cd Thessia

# Install dependencies with Bun
bun install
```

## ⚙️ Configuration

Create a `.env` file in the project root with the following variables:

```env
# Database Configuration
MONGO_URI=mongodb://localhost:27017/thessia
REDIS_URI=localhost
REDIS_PORT=6379
REDIS_DB=0
MEILISEARCH_URI=http://localhost:7700

# EVE Online API
ESI_URL=https://esi.evetech.net/
ESI_RATE_LIMIT=25
EVE_CLIENT_ID=your-client-id
EVE_CLIENT_SECRET=your-client-secret
EVE_CLIENT_REDIRECT=http://localhost:3000/auth/callback
### Development
EVE_CLIENT_ID_DEV=your-client-id-dev
EVE_CLIENT_SECRET_DEV=your-client-secret-dev
EVE_CLIENT_REDIRECT_DEV=http://localhost:3000/auth/callback

# Monitoring
SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token

# RedisQ
REDISQ_ID=your-redisq-id

# Discord webhooks
BACKEND_DISCORD_URL=your-backend-discord-url
```

## 🧪 Development

Start the development server on `http://localhost:3000`:

```bash
bun run dev
```

For debugging with inspector:

```bash
bun run debug
```

## 🔨 Building for Production

Build the application for production:

```bash
bun run build
```

Preview the production build locally:

```bash
bun run preview
```

## 🐳 Deployment with Docker Compose

The application can be easily deployed using Docker Compose:

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

## ☸️ Kubernetes Deployment

For production environments, you can deploy Thessia using Kubernetes:

```bash
# Apply the Kubernetes configuration
kubectl apply -k k8s/

# Check deployment status
kubectl get pods -n eve-kill
```

## 🔄 CI/CD

This project uses GitHub Actions for continuous integration and delivery:

- Automated builds on push to the main branch
- Container image publishing to GitHub Container Registry
- Vulnerability scanning with Trivy

## 🌐 Internationalization

Thessia supports multiple languages through Transifex:

- Contribute translations: [Transifex Project](https://app.transifex.com/eve-kill/thessia)
- Localization files are stored in `i18n/locales/`

## 🔐 Security

We use Dependabot to maintain dependency security:

- Weekly security updates for npm packages
- Weekly updates for GitHub Actions
- Automated pull requests for updates

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
