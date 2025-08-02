<template>
    <div class="admin-logs">
        <div class="logs-header">
            <div class="header-content">
                <div class="header-title">
                    <Icon name="heroicons:document-text" class="header-icon" />
                    <h2>{{ t('admin.logs.title') }}</h2>
                </div>
                <div class="header-controls">
                    <div class="control-group">
                        <label for="pod-select">{{ t('admin.logs.selectPods') }} (excludes jobs):</label>
                        <select id="pod-select" v-model="selectedPods" multiple size="4"
                            class="pod-select multi-select">
                            <option value="all">{{ t('admin.logs.allPods') }}</option>
                            <option v-for="pod in availablePods" :key="pod.name" :value="pod.name">
                                {{ pod.name }}
                            </option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="log-limit">Max log lines:</label>
                        <input id="log-limit" v-model.number="logLimit" type="number" min="100" max="1000000" step="100"
                            class="log-limit-input" @blur="validateLogLimit" />
                    </div>
                    <div class="control-group">
                        <label class="connection-status">
                            <Icon
                                :name="connectionStatus === 'connected' ? 'heroicons:signal' : connectionStatus === 'error' ? 'heroicons:x-circle' : 'heroicons:ellipsis-horizontal-circle'"
                                :class="['status-icon', connectionStatus]" />
                            {{ connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'error' ?
                                'Connection Error' : 'Connecting...' }}
                        </label>
                    </div>
                </div>
            </div>
        </div>

        <div class="logs-content">
            <!-- Connection Status -->
            <div v-if="connectionStatus === 'connecting'" class="loading-state">
                <Icon name="heroicons:arrow-path" class="loading-icon spinning" />
                <p>{{ t('admin.logs.loading') }}</p>
            </div>

            <!-- Error State -->
            <div v-else-if="connectionStatus === 'error'" class="error-state">
                <Icon name="heroicons:exclamation-triangle" class="error-icon" />
                <p>{{ t('admin.logs.error') }}: Connection Error</p>
            </div>

            <!-- Logs Display -->
            <div v-else-if="connectionStatus === 'connected'" class="logs-display">
                <div class="logs-info">
                    <span class="info-item">
                        <Icon name="heroicons:server" class="info-icon" />
                        {{ selectedPods.includes('all') || selectedPods.length === 0 ? t('admin.logs.totalPods') :
                            t('admin.logs.selectedPods') }}:
                        {{ selectedPods.includes('all') || selectedPods.length === 0 ? totalPods : selectedPods.length
                        }}
                    </span>
                    <span class="info-item">
                        <Icon name="heroicons:clock" class="info-icon" />
                        {{ t('admin.logs.lastUpdate') }}: {{ formatTimestamp(lastUpdate) }}
                    </span>
                    <span class="info-item">
                        <Icon name="heroicons:document-text" class="info-icon" />
                        Total lines: {{ totalLogLines }}
                    </span>
                    <span v-if="isPaused" class="info-item pause-indicator">
                        <Icon name="heroicons:pause" class="info-icon pause-icon" />
                        Paused ({{ pauseBuffer.length }} buffered)
                    </span>
                </div>

                <div class="unified-logs" @mouseenter="pauseLogs" @mouseleave="scheduleResume">
                    <pre ref="logsContainer" class="log-content" v-html="combinedLogs"></pre>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else class="empty-state">
                <Icon name="heroicons:document-text" class="empty-icon" />
                <p>{{ t('admin.logs.noData') }}</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface LogLine {
    podName: string;
    namespace: string;
    timestamp: Date;
    message: string;
    container?: string;
}

interface LogsResponse {
    success: boolean;
    data: {
        logLines: LogLine[];
        totalPods: number;
        linesPerPod: number;
        timestamp: string;
        availablePods: Array<{
            name: string;
            namespace: string;
            containers: string[];
        }>;
    };
}

const { t } = useI18n();

// Reactive state
const selectedPods = ref(['all']);
const eventSource = ref<EventSource | null>(null);
const logsContainer = ref<HTMLElement>();
const connectionStatus = ref<'connecting' | 'connected' | 'error'>('connecting');
const logLimit = ref(1000); // Default to 1000 logs
const availablePods = ref<Array<{
    name: string;
    namespace: string;
    containers: string[];
}>>([]);
const logLines = ref<Array<{
    timestamp: string;
    pod: string;
    message: string;
    container?: string;
    html?: string;
}>>([]);
const totalPods = ref(0);
const lastUpdate = ref(new Date().toISOString());
const error = ref<string | null>(null);
const pending = ref(false);

// Pause functionality
const isPaused = ref(false);
const pauseBuffer = ref<Array<{
    timestamp: string;
    pod: string;
    message: string;
    container?: string;
    html?: string;
}>>([]);
const resumeTimeout = ref<NodeJS.Timeout | null>(null);
const smoothResumeInterval = ref<NodeJS.Timeout | null>(null);

// Computed API endpoint for SSE streaming
const streamEndpoint = computed(() => {
    const pods = selectedPods.value.includes('all') || selectedPods.value.length === 0
        ? 'all'
        : selectedPods.value.join(',');
    return `/adminlogs/stream?pods=${pods}`;
});

// Log processing functions
const removeKubernetesTimestamp = (logLine: string): string => {
    // Remove Kubernetes timestamp: 2025-08-02T16:45:01.410581456+02:00
    return logLine.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+[+-]\d{2}:\d{2}\s*/, '');
};

const colorizeLogLine = (logLine: string): string => {
    // Check if line has deployment prefix: "deployment | content"
    const podPrefixMatch = logLine.match(/^([^|]+)\|\s*(.*)$/);

    if (podPrefixMatch) {
        const [, podInfo, actualLog] = podPrefixMatch;
        const podName = podInfo.trim();

        // Remove Kubernetes timestamp from the actual log part
        const cleanActualLog = actualLog.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+[+-]\d{2}:\d{2}\s*/, '');

        // Now colorize the cleaned content
        const logPattern = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+\[([^\]]+)\]\s+(.*)$/;
        const match = cleanActualLog.match(logPattern);

        if (match) {
            const [, timestamp, logType, message] = match;
            const typeClass = `log-${logType.toLowerCase()}`;

            return `<span class="log-pod">${podName}</span> | <span class="log-timestamp">${timestamp}</span> <span class="${typeClass}">[${logType}]</span> <span class="log-message">${message}</span>`;
        } else {
            // For logs without the standard format, just show as default
            return `<span class="log-pod">${podName}</span> | <span class="log-default">${cleanActualLog}</span>`;
        }
    } else {
        // Fallback for logs without deployment prefix (shouldn't happen)
        return `<span class="log-default">${logLine}</span>`;
    }
};

const processLogLine = (rawLogLine: string) => {
    // Don't remove Kubernetes timestamp here - do it in colorizeLogLine instead
    const cleanedLine = rawLogLine;

    // Extract application timestamp for sorting (look for it after removing K8s timestamp)
    const podMatch = rawLogLine.match(/^([^|]+)\|\s*(.*)$/);
    if (podMatch) {
        const actualLog = podMatch[2].replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+[+-]\d{2}:\d{2}\s*/, '');
        const timestampMatch = actualLog.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
        const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();

        // Create colored HTML version
        const html = colorizeLogLine(cleanedLine);

        return {
            timestamp,
            pod: 'mixed',
            message: cleanedLine,
            container: undefined,
            html
        };
    }

    // Fallback
    const html = colorizeLogLine(cleanedLine);
    return {
        timestamp: new Date().toISOString(),
        pod: 'mixed',
        message: cleanedLine,
        container: undefined,
        html
    };
};

// Pause/Resume functionality
const pauseLogs = () => {
    isPaused.value = true;

    // Clear any existing timers
    if (resumeTimeout.value) {
        clearTimeout(resumeTimeout.value);
        resumeTimeout.value = null;
    }
    if (smoothResumeInterval.value) {
        clearInterval(smoothResumeInterval.value);
        smoothResumeInterval.value = null;
    }
};

const scheduleResume = () => {
    if (resumeTimeout.value) {
        clearTimeout(resumeTimeout.value);
    }

    resumeTimeout.value = setTimeout(() => {
        resumeLogs();
    }, 2000);
};

const resumeLogs = () => {
    isPaused.value = false;

    // Start smooth resume if there are buffered logs
    if (pauseBuffer.value.length > 0) {
        startSmoothResume();
    }

    if (resumeTimeout.value) {
        clearTimeout(resumeTimeout.value);
        resumeTimeout.value = null;
    }
};

const startSmoothResume = () => {
    // Clear any existing smooth resume
    if (smoothResumeInterval.value) {
        clearInterval(smoothResumeInterval.value);
        smoothResumeInterval.value = null;
    }

    // Add logs gradually - faster if more logs to catch up
    const logsPerBatch = Math.max(1, Math.min(5, Math.floor(pauseBuffer.value.length / 10)));
    const intervalSpeed = pauseBuffer.value.length > 20 ? 50 : 100; // Faster for lots of logs

    smoothResumeInterval.value = setInterval(() => {
        if (pauseBuffer.value.length === 0) {
            // All caught up, stop the interval
            if (smoothResumeInterval.value) {
                clearInterval(smoothResumeInterval.value);
                smoothResumeInterval.value = null;
            }
            return;
        }

        // Move logs from buffer to main display in small batches
        const batch = pauseBuffer.value.splice(0, logsPerBatch);
        logLines.value.unshift(...batch);

        // Keep only the configured number of logs
        if (logLines.value.length > logLimit.value) {
            logLines.value = logLines.value.slice(0, logLimit.value);
        }
    }, intervalSpeed);
};

// Computed properties for unified logs
const combinedLogs = computed(() => {
    if (!logLines.value.length) {
        return 'No logs available';
    }

    // Return HTML formatted logs for v-html
    return logLines.value
        .map(logLine => logLine.html || logLine.message)
        .join('\n');
});

const totalLogLines = computed(() => {
    return logLines.value.length;
});

// SSE connection management
const connectToLogStream = async () => {
    if (eventSource.value) {
        eventSource.value.close();
    }

    // First fetch available pods if we don't have them
    if (availablePods.value.length === 0) {
        try {
            const pods = await $fetch('/api/admin/kubernetes/pods');

            // Filter to only running pods and extract relevant info
            const runningPods = pods.filter(
                (pod: any) =>
                    pod.status?.phase === "Running" &&
                    pod.metadata?.name &&
                    !pod.metadata.name.startsWith("kube-") &&
                    !pod.metadata.name.includes("traefik") &&
                    !pod.metadata.name.includes("coredns") &&
                    !pod.metadata.name.startsWith("cron-") && // Exclude cron jobs
                    !pod.metadata.name.match(/^[a-z-]+-\d{8}-[a-z0-9]{5}$/) // Exclude job pods pattern
            );

            availablePods.value = runningPods.map((pod: any) => ({
                name: pod.metadata?.name || "",
                namespace: pod.metadata?.namespace || "",
                containers: pod.spec?.containers?.map((c: any) => c.name) || [],
            }));

            totalPods.value = runningPods.length;
        } catch (error) {
            console.error('Error fetching available pods:', error);
        }
    }

    const url = `/adminlogs/stream?pods=${selectedPods.value.join(',')}`;
    eventSource.value = new EventSource(url);

    eventSource.value.onopen = () => {
        connectionStatus.value = 'connected';
        lastUpdate.value = new Date().toISOString();
    };

    eventSource.value.onmessage = (event) => {
        try {
            const rawLogLine = event.data.trim();

            if (rawLogLine) {
                const processedLog = processLogLine(rawLogLine);
                lastUpdate.value = new Date().toISOString();

                if (isPaused.value) {
                    // Add to buffer when paused
                    pauseBuffer.value.unshift(processedLog);

                    // Keep buffer reasonable size
                    if (pauseBuffer.value.length > 100) {
                        pauseBuffer.value = pauseBuffer.value.slice(0, 100);
                    }
                } else {
                    // Add directly when not paused
                    logLines.value.unshift(processedLog);

                    // Keep only the configured number of logs to prevent memory issues
                    if (logLines.value.length > logLimit.value) {
                        logLines.value = logLines.value.slice(0, logLimit.value);
                    }
                }
            }
        } catch (error) {
            console.error('Error processing SSE message:', error);
        }
    };

    eventSource.value.onerror = (error) => {
        console.error('SSE connection error:', error);
        connectionStatus.value = 'error';

        // Attempt to reconnect after a delay
        setTimeout(() => {
            if (connectionStatus.value === 'error') {
                connectToLogStream();
            }
        }, 5000);
    };
};

// Watch for pod selection changes
watch(selectedPods, () => {
    connectToLogStream();
});

// Methods
const validateLogLimit = () => {
    // Enforce hard caps
    if (logLimit.value < 100) {
        logLimit.value = 100;
    } else if (logLimit.value > 1000000) {
        logLimit.value = 1000000;
    }

    // Trim existing logs if they exceed the new limit
    if (logLines.value.length > logLimit.value) {
        logLines.value = logLines.value.slice(0, logLimit.value);
    }
};

const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
};

// Cleanup on unmount
onUnmounted(() => {
    if (eventSource.value) {
        eventSource.value.close();
    }
    if (resumeTimeout.value) {
        clearTimeout(resumeTimeout.value);
    }
    if (smoothResumeInterval.value) {
        clearInterval(smoothResumeInterval.value);
    }
});

// Initialize SSE connection on mount
onMounted(() => {
    connectToLogStream();
});
</script>

<style scoped>
.admin-logs {
    display: flex;
    flex-direction: column;
    height: 100vh;
    color: white;
}

.logs-header {
    padding: 1rem;
    flex-shrink: 0;
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
}

.header-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.header-icon {
    width: 1.5rem;
    height: 1.5rem;
    color: rgb(99, 102, 241);
}

.header-title h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
}

.header-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.control-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.control-group label {
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
}

.lines-select,
.pod-select,
.log-limit-input,
.refresh-interval-select {
    background-color: rgb(55, 65, 81);
    color: white;
    border: 1px solid rgb(75, 85, 99);
    border-radius: 0.375rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
    min-width: 120px;
}

.log-limit-input {
    min-width: 100px;
    text-align: center;
}

.pod-select.multi-select {
    min-height: 100px;
    max-height: 150px;
    overflow-y: auto;
}

.spinning {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.logs-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.loading-state,
.error-state,
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
    text-align: center;
}

.loading-icon,
.error-icon,
.empty-icon {
    width: 3rem;
    height: 3rem;
    margin-bottom: 1rem;
}

.loading-icon {
    color: rgb(99, 102, 241);
}

.error-icon {
    color: rgb(239, 68, 68);
}

.empty-icon {
    color: rgb(156, 163, 175);
}

.logs-display {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.logs-info {
    display: flex;
    gap: 1.5rem;
    padding: 1rem;
    flex-shrink: 0;
    flex-wrap: wrap;
}

.info-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
}

.info-icon {
    width: 1rem;
    height: 1rem;
}

.pause-indicator {
    color: rgb(251, 191, 36) !important;
    font-weight: 600;
}

.pause-icon {
    color: rgb(251, 191, 36);
    animation: pulse 2s infinite;
}

@keyframes pulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.5;
    }
}

.unified-logs {
    flex: 1;
    overflow: hidden;
}

.log-content {
    width: 100%;
    height: 100%;
    background-color: rgb(0, 0, 0);
    color: rgb(229, 231, 235);
    padding: 1rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.75rem;
    line-height: 1.4;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    border: none;

    /* Custom scrollbar styling */
    scrollbar-width: thin;
    scrollbar-color: rgb(75, 85, 99) rgb(31, 41, 55);
}

.log-content::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

.log-content::-webkit-scrollbar-track {
    background: rgb(31, 41, 55);
}

.log-content::-webkit-scrollbar-thumb {
    background: rgb(75, 85, 99);
    border-radius: 4px;
}

.log-content::-webkit-scrollbar-thumb:hover {
    background: rgb(107, 114, 128);
}

/* Log coloring styles */
.log-content :deep(.log-pod) {
    color: rgb(168, 85, 247);
    font-weight: 600;
}

.log-content :deep(.log-timestamp) {
    color: rgb(156, 163, 175);
}

.log-content :deep(.log-info) {
    color: rgb(34, 197, 94);
}

.log-content :deep(.log-debug) {
    color: rgb(99, 102, 241);
}

.log-content :deep(.log-warn) {
    color: rgb(251, 191, 36);
}

.log-content :deep(.log-error) {
    color: rgb(239, 68, 68);
}

.log-content :deep(.log-fatal) {
    color: rgb(239, 68, 68);
    font-weight: bold;
}

.log-content :deep(.log-message) {
    color: rgb(229, 231, 235);
}

.log-content :deep(.log-default) {
    color: rgb(156, 163, 175);
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .admin-logs {
        height: 100vh;
    }

    .header-content {
        flex-direction: column;
        align-items: stretch;
    }

    .header-controls {
        justify-content: space-between;
    }

    .logs-info {
        flex-direction: column;
        gap: 0.5rem;
    }

    .log-content {
        font-size: 0.7rem;
        padding: 0.5rem;
    }
}
</style>
