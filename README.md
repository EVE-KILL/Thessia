# Content v2 Minimal Starter

Look at the [Content documentation](https://content.nuxt.com/) to learn more.

## Setup

Make sure to install the dependencies:

```bash
# yarn
yarn install

# npm
npm install

# pnpm
pnpm install
```

## Development Server

Start the development server on http://localhost:3000

```bash
npm run dev
```

## Production

Build the application for production:

```bash
npm run build
```

Locally preview production build:

```bash
npm run preview
```

Checkout the
[deployment documentation](https://nuxt.com/docs/getting-started/deployment) for
more information.

## Docker

Build the Docker container:

```bash
docker build -t your-image-name -f .docker/Dockerfile .
```

Run the Docker container:

```bash
docker run -p 3000:3000 your-image-name
```

## Helm-Chart Deployment

Deploy the application using Helm-Chart:

1. Install Helm: Follow the instructions at https://helm.sh/docs/intro/install/
2. Add the Helm repository: `helm repo add your-repo-name https://your-repo-url`
3. Update the Helm repository: `helm repo update`
4. Install the Helm-Chart: `helm install your-release-name your-repo-name/your-chart-name`

## GitHub Actions

Set up GitHub actions for building and deploying the Docker container:

1. Create a new directory for GitHub actions: `.github/workflows/`
2. Add the GitHub action for building the Docker container: `.github/workflows/docker-build.yml`
3. Add the placeholder action for deploying to a Kubernetes cluster: `.github/workflows/k8s-deploy.yml`
