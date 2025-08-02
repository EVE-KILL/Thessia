import * as k8s from "@kubernetes/client-node";
import { cliLogger } from "../helpers/Logger";

/**
 * Kubernetes utility class for managing cluster resources
 * @TODO: Make namespace configurable instead of hardcoded 'eve-kill'
 */
export class KubernetesManager {
    private kc: k8s.KubeConfig;
    private coreV1Api: k8s.CoreV1Api;
    private appsV1Api: k8s.AppsV1Api;
    private autoscalingV1Api: k8s.AutoscalingV1Api;
    private networkingV1Api: k8s.NetworkingV1Api;
    private metricsApi: k8s.Metrics;
    private batchV1Api: k8s.BatchV1Api;
    private namespace: string;

    constructor() {
        // @TODO: Make namespace configurable
        this.namespace = "eve-kill";

        this.kc = new k8s.KubeConfig();

        // Try loading configuration - prefer in-cluster if available, fallback to local
        try {
            // Check if we're in a Kubernetes cluster
            if (process.env.KUBERNETES_SERVICE_HOST) {
                cliLogger.info(
                    "Detected in-cluster environment, loading in-cluster config"
                );
                this.kc.loadFromCluster();
                cliLogger.info("Loaded Kubernetes config from cluster");
            } else {
                cliLogger.info(
                    "Detected local environment, loading from default location"
                );
                this.kc.loadFromDefault();
                cliLogger.info(
                    "Loaded Kubernetes config from default location"
                );
            }
        } catch (error) {
            cliLogger.error(
                `Failed to load Kubernetes configuration: ${error}`
            );
            throw new Error("Unable to load Kubernetes configuration");
        }

        // Validate that we have the necessary configuration
        const cluster = this.kc.getCurrentCluster();
        if (!cluster?.server) {
            throw new Error("No cluster server found in kubeconfig");
        }

        // Validate URL format
        try {
            new URL(cluster.server);
        } catch (urlError) {
            cliLogger.error(
                `Cluster server URL is invalid: ${cluster.server} - ${urlError}`
            );
            throw new Error(`Invalid cluster server URL: ${cluster.server}`);
        }

        try {
            // For in-cluster connections, disable SSL verification to handle self-signed certs
            if (process.env.KUBERNETES_SERVICE_HOST) {
                // Set reject unauthorized to false for in-cluster connections
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
            }

            // Initialize API clients
            this.coreV1Api = this.kc.makeApiClient(k8s.CoreV1Api);
            this.appsV1Api = this.kc.makeApiClient(k8s.AppsV1Api);
            this.autoscalingV1Api = this.kc.makeApiClient(k8s.AutoscalingV1Api);
            this.networkingV1Api = this.kc.makeApiClient(k8s.NetworkingV1Api);
            this.metricsApi = new k8s.Metrics(this.kc);
            this.batchV1Api = this.kc.makeApiClient(k8s.BatchV1Api);

            cliLogger.info("Kubernetes API clients initialized successfully");
        } catch (error) {
            cliLogger.error(
                `Failed to initialize Kubernetes API clients: ${error}`
            );
            if (error instanceof Error) {
                cliLogger.error(`Client init error stack: ${error.stack}`);
            }
            throw error;
        }
    }

    /**
     * Get all pods in the namespace
     */
    async getPods() {
        try {
            const response = await this.coreV1Api.listNamespacedPod({
                namespace: this.namespace,
            });
            return response.items;
        } catch (error) {
            cliLogger.error(`Failed to get pods: ${error}`);
            throw error;
        }
    }

    /**
     * Get pod logs
     */
    async getPodLogs(
        podName: string,
        lines: number = 100,
        follow: boolean = false,
        container?: string
    ) {
        try {
            const logParams: any = {
                name: podName,
                namespace: this.namespace,
                follow,
                tailLines: lines,
            };

            // Add container parameter if specified
            if (container) {
                logParams.container = container;
            }

            const response = await this.coreV1Api.readNamespacedPodLog(
                logParams
            );
            return response;
        } catch (error) {
            cliLogger.error(`Failed to get pod logs for ${podName}: ${error}`);
            throw error;
        }
    }

    /**
     * Delete a pod (restart it)
     */
    async deletePod(podName: string) {
        try {
            await this.coreV1Api.deleteNamespacedPod({
                name: podName,
                namespace: this.namespace,
            });
            cliLogger.info(`Pod ${podName} deleted successfully`);
            return { success: true };
        } catch (error) {
            cliLogger.error(`Failed to delete pod ${podName}: ${error}`);
            throw error;
        }
    }

    /**
     * Get all deployments in the namespace
     */
    async getDeployments() {
        try {
            const response = await this.appsV1Api.listNamespacedDeployment({
                namespace: this.namespace,
            });
            return response.items;
        } catch (error) {
            cliLogger.error(`Failed to get deployments: ${error}`);
            throw error;
        }
    }

    /**
     * Scale a deployment
     */
    async scaleDeployment(deploymentName: string, replicas: number) {
        try {
            const patch = [
                {
                    op: "replace",
                    path: "/spec/replicas",
                    value: replicas,
                },
            ];

            await this.appsV1Api.patchNamespacedDeployment({
                name: deploymentName,
                namespace: this.namespace,
                body: patch,
            });

            cliLogger.info(
                `Deployment ${deploymentName} scaled to ${replicas} replicas successfully`
            );
            return { success: true };
        } catch (error) {
            cliLogger.error(
                `Failed to scale deployment ${deploymentName} to ${replicas}: ${error}`
            );
            throw error;
        }
    }

    /**
     * Get all services in the namespace
     */
    async getServices() {
        try {
            const response = await this.coreV1Api.listNamespacedService({
                namespace: this.namespace,
            });
            return response.items;
        } catch (error) {
            cliLogger.error(`Failed to get services: ${error}`);
            throw error;
        }
    }

    /**
     * Get all ingresses in the namespace
     */
    async getIngresses() {
        try {
            const response = await this.networkingV1Api.listNamespacedIngress({
                namespace: this.namespace,
            });
            return response.items;
        } catch (error) {
            cliLogger.error(`Failed to get ingresses: ${error}`);
            throw error;
        }
    }

    /**
     * Get all horizontal pod autoscalers in the namespace
     */
    async getHPAs() {
        try {
            const response =
                await this.autoscalingV1Api.listNamespacedHorizontalPodAutoscaler(
                    { namespace: this.namespace }
                );
            return response.items;
        } catch (error) {
            cliLogger.error(`Failed to get HPAs: ${error}`);
            throw error;
        }
    }

    /**
     * Get all persistent volume claims in the namespace
     */
    async getPVCs() {
        try {
            const response =
                await this.coreV1Api.listNamespacedPersistentVolumeClaim({
                    namespace: this.namespace,
                });
            return response.items;
        } catch (error) {
            cliLogger.error(`Failed to get PVCs: ${error}`);
            throw error;
        }
    }

    /**
     * Get pod metrics
     */
    async getPodMetrics() {
        try {
            const response = await this.metricsApi.getPodMetrics(
                this.namespace
            );
            return response.items;
        } catch (error) {
            cliLogger.warn(
                `Failed to get pod metrics (metrics-server may not be available): ${error}`
            );
            return [];
        }
    }

    /**
     * Get all jobs in the namespace
     */
    async getJobs() {
        try {
            const response = await this.batchV1Api.listNamespacedJob({
                namespace: this.namespace,
            });
            return response.items;
        } catch (error) {
            cliLogger.error(`Failed to get jobs: ${error}`);
            throw error;
        }
    }

    /**
     * Get all cron jobs in the namespace
     */
    async getCronJobs() {
        try {
            const response = await this.batchV1Api.listNamespacedCronJob({
                namespace: this.namespace,
            });
            return response.items;
        } catch (error) {
            cliLogger.error(`Failed to get cron jobs: ${error}`);
            throw error;
        }
    }

    /**
     * Get cluster-wide overview information
     */
    async getClusterOverview() {
        try {
            const [
                pods,
                deployments,
                services,
                ingresses,
                hpas,
                pvcs,
                jobs,
                cronJobs,
            ] = await Promise.all([
                this.getPods(),
                this.getDeployments(),
                this.getServices(),
                this.getIngresses(),
                this.getHPAs(),
                this.getPVCs(),
                this.getJobs(),
                this.getCronJobs(),
            ]);

            // Calculate pod status counts
            const podStatusCounts = pods.reduce((acc, pod) => {
                const phase = pod.status?.phase || "Unknown";
                acc[phase] = (acc[phase] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            // Calculate deployment status
            const deploymentStatusCounts = deployments.reduce(
                (acc, deployment) => {
                    const replicas = deployment.spec?.replicas || 0;
                    const readyReplicas = deployment.status?.readyReplicas || 0;
                    const isHealthy = replicas === readyReplicas;

                    if (isHealthy) {
                        acc.healthy = (acc.healthy || 0) + 1;
                    } else {
                        acc.unhealthy = (acc.unhealthy || 0) + 1;
                    }
                    return acc;
                },
                {} as Record<string, number>
            );

            return {
                namespace: this.namespace,
                counts: {
                    pods: pods.length,
                    deployments: deployments.length,
                    services: services.length,
                    ingresses: ingresses.length,
                    hpas: hpas.length,
                    pvcs: pvcs.length,
                    jobs: jobs.length,
                    cronJobs: cronJobs.length,
                },
                podStatusCounts,
                deploymentStatusCounts,
            };
        } catch (error) {
            cliLogger.error(`Failed to get cluster overview: ${error}`);
            throw error;
        }
    }
}

// Export singleton instance
export const kubernetesManager = new KubernetesManager();
