<template>
    <div class="admin-access-logs">
        <div class="logs-header">
            <div class="header-content">
                <div class="header-title">
                    <Icon name="lucide:file-text" class="header-icon" />
                    <h2>{{ t('admin.accessLogs.title') }}</h2>
                </div>

                <div class="header-controls">
                    <div class="control-group">
                        <label>{{ t('admin.accessLogs.search') }}:</label>
                        <input v-model="filters.search" type="text" class="filter-input"
                            :placeholder="t('admin.accessLogs.searchPlaceholder')" />
                    </div>

                    <div class="control-group">
                        <label>{{ t('admin.accessLogs.method') }}:</label>
                        <select v-model="filters.method" class="filter-select">
                            <option value="">{{ t('admin.accessLogs.allMethods') }}</option>
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                            <option value="PATCH">PATCH</option>
                        </select>
                    </div>

                    <div class="control-group">
                        <label>{{ t('admin.accessLogs.statusCode') }}:</label>
                        <select v-model="filters.statusCode" class="filter-select">
                            <option value="">{{ t('admin.accessLogs.allStatus') }}</option>
                            <option value="2xx">2xx Success</option>
                            <option value="3xx">3xx Redirect</option>
                            <option value="4xx">4xx Client Error</option>
                            <option value="5xx">5xx Server Error</option>
                        </select>
                    </div>

                    <div class="control-group">
                        <label>{{ t('admin.accessLogs.logTypeFilter') }}:</label>
                        <select v-model="filters.logType" class="filter-select">
                            <option value="">{{ t('admin.accessLogs.allLogTypes') }}</option>
                            <option value="server">{{ t('admin.accessLogs.serverLogs') }}</option>
                            <option value="client">{{ t('admin.accessLogs.clientLogs') }}</option>
                        </select>
                    </div>

                    <div class="control-group">
                        <label>{{ t('admin.accessLogs.botFilter') }}:</label>
                        <select v-model="filters.isBot" class="filter-select">
                            <option value="">{{ t('admin.accessLogs.allTraffic') }}</option>
                            <option value="false">{{ t('admin.accessLogs.humanTraffic') }}</option>
                            <option value="true">{{ t('admin.accessLogs.botTraffic') }}</option>
                        </select>
                    </div>

                    <div class="control-group">
                        <label>{{ t('admin.logs.maxLogs') }}:</label>
                        <input v-model.number="logLimit" type="number" min="100" max="10000" class="log-limit-input"
                            @blur="validateLogLimit" />
                    </div>

                    <button @click="isPaused ? resumeLogs() : pauseLogs()" class="pause-button"
                        :class="{ 'paused': isPaused }">
                        <Icon v-if="!isPaused" name="lucide:pause" class="control-icon" />
                        <Icon v-else name="lucide:play" class="control-icon" />
                        {{ isPaused ? t('admin.logs.resume') : t('admin.logs.pause') }}
                    </button>
                </div>
            </div>
        </div>

        <div class="logs-content">
            <!-- Loading State -->
            <div v-if="connectionStatus === 'connecting'" class="loading-state">
                <Icon name="lucide:loader-2" class="loading-icon spinning" />
                <p class="loading-text">{{ t('admin.accessLogs.connecting') }}</p>
            </div>

            <!-- Error State -->
            <div v-else-if="connectionStatus === 'error'" class="error-state">
                <Icon name="lucide:alert-triangle" class="error-icon" />
                <p class="error-text">{{ t('admin.accessLogs.connectionError') }}</p>
                <button @click="connectToLogStream" class="retry-button">
                    {{ t('admin.accessLogs.retry') }}
                </button>
            </div>

            <!-- Log Display -->
            <div v-else class="logs-display">
                <div class="logs-info">
                    <div class="info-item">
                        <Icon name="lucide:activity" class="info-icon" />
                        <span>{{ t('admin.accessLogs.totalLogs', { count: totalLogLines }) }}</span>
                    </div>
                    <div class="info-item">
                        <Icon name="lucide:clock" class="info-icon" />
                        <span>{{ t('admin.accessLogs.lastUpdate', { time: formatTimestamp(lastUpdate) }) }}</span>
                    </div>
                    <div v-if="isPaused" class="info-item pause-indicator">
                        <Icon name="lucide:pause" class="info-icon pause-icon" />
                        <span>{{ t('admin.logs.paused') }}</span>
                    </div>
                </div>

                <div class="unified-logs">
                    <pre ref="logsContainer" class="log-content" v-html="combinedLogs"></pre>
                </div>
            </div>
        </div>
    </div>
</template>


<script setup lang="ts">
// Import icons (using Icon component instead)
const { t } = useI18n();

// Reactive state for SSE connection
const connectionStatus = ref<'connecting' | 'connected' | 'error'>('connecting');
const eventSource = ref<EventSource | null>(null);
const logsContainer = ref<HTMLElement>();
const logLimit = ref(1000); // Default to 1000 logs
const lastUpdate = ref(new Date().toISOString());

// Log data
const logLines = ref<Array<{
    timestamp: string;
    content: string;
    html?: string;
}>>([]);

// Pause functionality
const isPaused = ref(false);
const pauseBuffer = ref<Array<{
    timestamp: string;
    content: string;
    html?: string;
}>>([]);
const resumeTimeout = ref<NodeJS.Timeout | null>(null);
const smoothResumeInterval = ref<NodeJS.Timeout | null>(null);

// Filters
const filters = reactive({
    search: '',
    method: '',
    statusCode: '',
    isBot: '',
    apiFilter: 'exclude', // 'exclude', 'include', 'only'
    hideUnderscoreUrls: 'true', // Hide URLs starting with _ by default
    logType: '' // 'server', 'client', or '' for all
});

// Computed API endpoint for SSE streaming
const streamEndpoint = computed(() => {
    const params = new URLSearchParams();

    // Add filters
    if (filters.search) params.append('search', filters.search);
    if (filters.method) params.append('method', filters.method);
    if (filters.statusCode) params.append('statusCode', filters.statusCode);
    if (filters.isBot) params.append('isBot', filters.isBot);
    if (filters.apiFilter) params.append('apiFilter', filters.apiFilter);
    if (filters.hideUnderscoreUrls) params.append('hideUnderscoreUrls', filters.hideUnderscoreUrls);
    if (filters.logType) params.append('logType', filters.logType);

    return `/adminlogs/access-stream?${params.toString()}`;
});

// Log processing functions
const colorizeAccessLogLine = (logLine: string): string => {
    // Parse log format: [FLAGS] timestamp ip "method url" status response_time "user_agent"
    const logPattern = /^(\[.*?\]\s*)?(\S+)\s+(\S+)\s+"(\w+)\s+([^"]+)"\s+(\d+)\s+(\d+)ms\s+"([^"]*)".*$/;
    const match = logLine.match(logPattern);

    if (match) {
        const [, flags, timestamp, ip, method, url, status, responseTime, userAgent] = match;

        // Color classes based on status code
        let statusClass = 'log-status-default';
        const statusCode = parseInt(status || '0');
        if (statusCode >= 200 && statusCode < 300) statusClass = 'log-status-success';
        else if (statusCode >= 300 && statusCode < 400) statusClass = 'log-status-redirect';
        else if (statusCode >= 400 && statusCode < 500) statusClass = 'log-status-client-error';
        else if (statusCode >= 500) statusClass = 'log-status-server-error';

        // Color class for method
        const methodClass = `log-method-${(method || 'unknown').toLowerCase()}`;

        // Color class for response time
        let responseTimeClass = 'log-response-fast';
        const responseMs = parseInt(responseTime || '0');
        if (responseMs > 1000) responseTimeClass = 'log-response-slow';
        else if (responseMs > 500) responseTimeClass = 'log-response-medium';

        // Process flags
        let flagsHtml = '';
        if (flags) {
            const flagsText = flags.trim();
            // Color different flag types
            let coloredFlags = flagsText;
            coloredFlags = coloredFlags.replace(/\[SERVER\]/g, '<span class="log-flag-server">[SERVER]</span>');
            coloredFlags = coloredFlags.replace(/\[CLIENT\]/g, '<span class="log-flag-client">[CLIENT]</span>');
            coloredFlags = coloredFlags.replace(/\[BOT\]/g, '<span class="log-flag-bot">[BOT]</span>');
            coloredFlags = coloredFlags.replace(/\[API\]/g, '<span class="log-flag-api">[API]</span>');
            flagsHtml = `${coloredFlags} `;
        }

        return `${flagsHtml}<span class="log-timestamp">${timestamp}</span> <span class="log-ip">${ip}</span> "<span class="${methodClass}">${method}</span> <span class="log-url">${url}</span>" <span class="${statusClass}">${status}</span> <span class="${responseTimeClass}">${responseTime}ms</span> "<span class="log-user-agent">${userAgent}</span>"`;
    } else {
        // Fallback for logs that don't match expected format
        return `<span class="log-default">${logLine}</span>`;
    }
};

const processLogLine = (rawLogLine: string) => {
    const cleanedLine = rawLogLine.trim();
    if (!cleanedLine) return null;

    // Extract timestamp for sorting (use current time if none found)
    const timestampMatch = cleanedLine.match(/^(\S+)/);
    const timestamp = timestampMatch?.[1] || new Date().toISOString();

    // Create colored HTML version
    const html = colorizeAccessLogLine(cleanedLine);

    return {
        timestamp,
        content: cleanedLine,
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
            clearInterval(smoothResumeInterval.value!);
            smoothResumeInterval.value = null;
            return;
        }

        // Move logs from buffer to main display in small batches (at the beginning)
        const batch = pauseBuffer.value.splice(0, logsPerBatch);
        logLines.value.unshift(...batch);

        // Trim from the end if exceeded limit
        if (logLines.value.length > logLimit.value) {
            logLines.value.splice(logLimit.value);
        }

        // Keep scroll at top
        nextTick(() => {
            if (logsContainer.value) {
                logsContainer.value.scrollTop = 0;
            }
        });
    }, intervalSpeed);
};

// Computed properties for unified logs
const combinedLogs = computed(() => {
    if (!logLines.value.length) {
        return '<span class="log-empty">No access logs yet...</span>';
    }

    // Return HTML formatted logs for v-html
    return logLines.value
        .map(log => log.html || log.content)
        .join('\n');
});

const totalLogLines = computed(() => {
    return logLines.value.length;
});

// SSE connection management
const connectToLogStream = async () => {
    // Always close existing connection first
    if (eventSource.value) {
        console.log('Closing existing SSE connection...');
        eventSource.value.close();
        eventSource.value = null;
        // Small delay to ensure cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    connectionStatus.value = 'connecting';

    try {
        console.log('Connecting to SSE endpoint:', streamEndpoint.value);
        eventSource.value = new EventSource(streamEndpoint.value);

        eventSource.value.onopen = () => {
            console.log('SSE connection opened');
            connectionStatus.value = 'connected';
            lastUpdate.value = new Date().toISOString();
        };

        eventSource.value.onmessage = (event) => {
            const rawData = event.data;

            // Handle JSON error messages
            if (rawData.startsWith('{')) {
                try {
                    const errorData = JSON.parse(rawData);
                    if (errorData.type === 'error') {
                        console.error('SSE Error:', errorData.message);
                        connectionStatus.value = 'error';
                        return;
                    }
                } catch (e) {
                    // Not JSON, treat as log line
                }
            }

            // Process as log line
            const processedLog = processLogLine(rawData);
            if (!processedLog) return;

            lastUpdate.value = new Date().toISOString();

            if (isPaused.value) {
                // Add to buffer instead of main display (at the beginning)
                pauseBuffer.value.unshift(processedLog);
                scheduleResume();
            } else {
                // Add to main display (at the beginning for newest first)
                logLines.value.unshift(processedLog);

                // Trim from the end if exceeded limit
                if (logLines.value.length > logLimit.value) {
                    logLines.value.splice(logLimit.value);
                }

                // Keep scroll position at top for new entries
                nextTick(() => {
                    if (logsContainer.value) {
                        logsContainer.value.scrollTop = 0;
                    }
                });
            }
        };

        eventSource.value.onerror = (error) => {
            console.error('SSE connection error:', error);
            connectionStatus.value = 'error';

            // Close the connection to prevent reconnection loops
            if (eventSource.value) {
                eventSource.value.close();
                eventSource.value = null;
            }
        };

    } catch (error) {
        console.error('Failed to connect to access log stream:', error);
        connectionStatus.value = 'error';

        // Ensure connection is cleaned up
        if (eventSource.value) {
            eventSource.value.close();
            eventSource.value = null;
        }
    }
};

// Debounced filter change handler
const filterChangeTimeout = ref<NodeJS.Timeout | null>(null);

// Watch for filter changes with debouncing
watch([filters], () => {
    // Clear existing timeout
    if (filterChangeTimeout.value) {
        clearTimeout(filterChangeTimeout.value);
        filterChangeTimeout.value = null;
    }

    // Debounce filter changes to prevent rapid reconnections
    filterChangeTimeout.value = setTimeout(() => {
        logLines.value = [];
        pauseBuffer.value = [];
        connectToLogStream();
        filterChangeTimeout.value = null;
    }, 300); // 300ms debounce
}, { deep: true });

// Methods
const validateLogLimit = () => {
    // Enforce hard caps
    if (logLimit.value < 100) {
        logLimit.value = 100;
    } else if (logLimit.value > 10000) {
        logLimit.value = 10000;
    }

    // Trim existing logs if they exceed the new limit (keep newest)
    if (logLines.value.length > logLimit.value) {
        logLines.value.splice(logLimit.value);
    }
};

const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
};

// Cleanup on unmount
onUnmounted(() => {
    console.log('Cleaning up AdminAccessLogs component...');

    // Clear filter change timeout
    if (filterChangeTimeout.value) {
        clearTimeout(filterChangeTimeout.value);
        filterChangeTimeout.value = null;
    }

    // Close SSE connection
    if (eventSource.value) {
        console.log('Closing SSE connection on unmount...');
        eventSource.value.close();
        eventSource.value = null;
    }

    // Clear all timers
    if (resumeTimeout.value) {
        clearTimeout(resumeTimeout.value);
        resumeTimeout.value = null;
    }
    if (smoothResumeInterval.value) {
        clearInterval(smoothResumeInterval.value);
        smoothResumeInterval.value = null;
    }
});

// Initialize SSE connection on mount
onMounted(() => {
    connectToLogStream();
});
</script>

<style scoped>
.admin-access-logs {
    display: flex;
    flex-direction: column;
    height: 100vh;
    color: var(--color-text-primary);
}

.logs-header {
    padding: var(--space-4);
    flex-shrink: 0;
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-4);
}

.header-title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

.header-icon {
    width: var(--space-6);
    height: var(--space-6);
    color: var(--color-indigo-500);
}

.header-title h2 {
    font-size: var(--text-xl);
    font-weight: var(--font-weight-semibold);
    margin: 0;
}

.header-controls {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
}

.control-group {
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

.control-group label {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
}

.filter-select,
.filter-input,
.log-limit-input {
    background-color: var(--color-gray-700);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-sm);
    min-width: 120px;
}

:global(.dark) .filter-select,
:global(.dark) .filter-input,
:global(.dark) .log-limit-input {
    background-color: var(--color-gray-700);
    color: var(--color-text-primary);
    border-color: var(--color-border-default);
}

.log-limit-input {
    min-width: 100px;
    text-align: center;
}

.pause-button {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background-color: var(--color-indigo-500);
    color: var(--color-text-primary);
    border: none;
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: background-color var(--duration-fast) ease-in-out;
}

.pause-button:hover {
    background-color: var(--color-indigo-600);
}

.pause-button.paused {
    background-color: var(--color-amber-400);
}

.pause-button.paused:hover {
    background-color: var(--color-amber-500);
}

.control-icon {
    width: var(--space-4);
    height: var(--space-4);
}

.spinning {
    animation: spin var(--duration-normal) linear infinite;
}

.logs-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.loading-state,
.error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: var(--space-8);
    text-align: center;
}

.loading-icon,
.error-icon {
    width: var(--space-12);
    height: var(--space-12);
    margin-bottom: var(--space-4);
}

.loading-icon {
    color: var(--color-indigo-500);
}

.error-icon {
    color: var(--color-red-500);
}

.loading-text,
.error-text {
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
}

.retry-button {
    background-color: var(--color-indigo-500);
    color: var(--color-text-primary);
    border: none;
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm);
    cursor: pointer;
}

.retry-button:hover {
    background-color: var(--color-indigo-600);
}

.logs-display {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.logs-info {
    display: flex;
    gap: var(--space-6);
    padding: var(--space-4);
    flex-shrink: 0;
    flex-wrap: wrap;
}

.info-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
}

.info-icon {
    width: var(--space-4);
    height: var(--space-4);
}

.pause-indicator {
    color: var(--color-amber-400) !important;
    font-weight: var(--font-weight-semibold);
}

.pause-icon {
    color: var(--color-amber-400);
    animation: pulse var(--duration-slow) infinite;
}

.unified-logs {
    flex: 1;
    overflow: hidden;
}

.log-content {
    width: 100%;
    height: 100%;
    background-color: var(--color-black);
    color: var(--color-gray-200);
    padding: var(--space-4);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    line-height: var(--line-height-relaxed);
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    border: none;

    /* Custom scrollbar styling */
    scrollbar-width: thin;
    scrollbar-color: var(--color-border-default) var(--color-gray-800);
}

.log-content::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

.log-content::-webkit-scrollbar-track {
    background: var(--color-gray-800);
}

.log-content::-webkit-scrollbar-thumb {
    background: var(--color-border-default);
    border-radius: var(--radius-sm);
}

.log-content::-webkit-scrollbar-thumb:hover {
    background: var(--color-gray-500);
}

/* Access log coloring styles */
.log-content :deep(.log-flag-server) {
    color: var(--color-indigo-500);
    font-weight: var(--font-weight-semibold);
}

.log-content :deep(.log-flag-client) {
    color: var(--color-green-500);
    font-weight: var(--font-weight-semibold);
}

.log-content :deep(.log-flag-bot) {
    color: var(--color-amber-400);
    font-weight: var(--font-weight-semibold);
}

.log-content :deep(.log-flag-api) {
    color: var(--color-purple-500);
    font-weight: var(--font-weight-semibold);
}

.log-content :deep(.log-timestamp) {
    color: var(--color-text-muted);
}

.log-content :deep(.log-ip) {
    color: var(--color-purple-500);
    font-weight: var(--font-weight-semibold);
}

.log-content :deep(.log-method-get) {
    color: var(--color-green-500);
}

.log-content :deep(.log-method-post) {
    color: var(--color-blue-500);
}

.log-content :deep(.log-method-put) {
    color: var(--color-amber-400);
}

.log-content :deep(.log-method-delete) {
    color: var(--color-red-500);
}

.log-content :deep(.log-method-patch) {
    color: var(--color-purple-500);
}

.log-content :deep(.log-url) {
    color: var(--color-gray-200);
}

.log-content :deep(.log-status-success) {
    color: var(--color-green-500);
    font-weight: var(--font-weight-semibold);
}

.log-content :deep(.log-status-redirect) {
    color: var(--color-blue-500);
    font-weight: var(--font-weight-semibold);
}

.log-content :deep(.log-status-client-error) {
    color: var(--color-amber-400);
    font-weight: var(--font-weight-semibold);
}

.log-content :deep(.log-status-server-error) {
    color: var(--color-red-500);
    font-weight: var(--font-weight-semibold);
}

.log-content :deep(.log-response-fast) {
    color: var(--color-green-500);
}

.log-content :deep(.log-response-medium) {
    color: var(--color-amber-400);
}

.log-content :deep(.log-response-slow) {
    color: var(--color-red-500);
}

.log-content :deep(.log-user-agent) {
    color: var(--color-text-muted);
    font-style: italic;
}

.log-content :deep(.log-flags) {
    color: var(--color-purple-500);
    font-weight: var(--font-weight-semibold);
}

.log-content :deep(.log-default) {
    color: var(--color-text-muted);
}

.log-content :deep(.log-empty) {
    color: var(--color-text-muted);
    font-style: italic;
    text-align: center;
    padding: var(--space-8);
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .admin-access-logs {
        height: 100vh;
    }

    .header-content {
        flex-direction: column;
        align-items: stretch;
    }

    .header-controls {
        justify-content: center;
    }

    .logs-info {
        flex-direction: column;
        gap: var(--space-2);
    }

    .log-content {
        font-size: var(--text-2xs);
    }
}
</style>
