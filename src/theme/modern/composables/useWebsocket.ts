import { ref, onMounted, onBeforeUnmount, onActivated, onDeactivated } from 'vue';

// Global map to store shared WebSocket instances
const globalInstances = new Map<string, { socket: WebSocket | null, count: number }>();

/**
 * WebSocket composable for reactive WebSocket connections with
 * bfcache compatibility, reconnection handling, and shared instance support
 */
export function useWebSocket(options: {
  url: string;
  initialMessage?: string;
  autoConnect?: boolean;
  maxReconnectAttempts?: number;
  handleBfCache?: boolean;
  autoReconnect?: boolean;
  useGlobalInstance?: boolean;
  globalRefKey?: string;
  onMessage?: (data: any) => void;
  onConnected?: () => void;
  onDisconnected?: (event: { code: number, reason: string }) => void;
  onError?: (error: any) => void;
  onReconnecting?: (info: { attempt: number, maxAttempts: number, delay: number }) => void;
}) {
  // Apply default options
  const {
    url,
    initialMessage = '',
    autoConnect = true,
    maxReconnectAttempts = 5,
    handleBfCache = true,
    autoReconnect = true,
    useGlobalInstance = false,
    globalRefKey = 'default',
    onMessage = () => {},
    onConnected = () => {},
    onDisconnected = () => {},
    onError = () => {},
    onReconnecting = () => {}
  } = options;

  // State variables
  const isConnected = ref(false);
  const socket = ref<WebSocket | null>(null);
  const connectionAttempts = ref(0);
  const errorMessage = ref<string | null>(null);
  const isPaused = ref(false);
  const componentActive = ref(true); // Track if component is active/mounted

  // Store pending cleanup functions for reliable execution
  const pendingCleanupFunctions: (() => void)[] = [];
  let reconnectTimer: NodeJS.Timeout | null = null;

  /**
   * Connect to WebSocket with proper error handling
   */
  const connect = () => {
    // Don't connect if:
    // 1. Not in client environment
    // 2. Component is inactive
    // 3. Connection is paused
    if (!import.meta.client || !componentActive.value || isPaused.value) {
      return;
    }

    try {
      // Close any existing connection first
      if (socket.value) {
        close();
      }

      errorMessage.value = null;
      console.log(`🔌 WebSocket(${globalRefKey}): Opening connection to ${url}...`);

      // Check if we should use a global shared instance
      if (useGlobalInstance) {
        const existingInstance = getGlobalInstance(globalRefKey);

        if (existingInstance?.socket &&
            (existingInstance.socket.readyState === WebSocket.OPEN ||
             existingInstance.socket.readyState === WebSocket.CONNECTING)) {

          // Use existing global connection
          socket.value = existingInstance.socket;
          existingInstance.count++;

          console.log(`🔄 WebSocket(${globalRefKey}): Using existing global connection, count:`, existingInstance.count);

          // If already open, emit connected event
          if (existingInstance.socket.readyState === WebSocket.OPEN) {
            isConnected.value = true;
            onConnected();

            // Send initial message if specified
            if (initialMessage && initialMessage.trim() !== '') {
              sendMessage(initialMessage);
            }
          }

          return;
        }
      }

      try {
        // Create new WebSocket connection
        const newSocket = new WebSocket(url);
        socket.value = newSocket;

        // If using global instance, store it
        if (useGlobalInstance) {
          setGlobalInstance(globalRefKey, newSocket);
        }

        console.log(`🔗 WebSocket(${globalRefKey}): Object created`);
      } catch (wsErr) {
        console.error(`❌ WebSocket(${globalRefKey}): Failed to create connection:`, wsErr);
        errorMessage.value = 'Failed to create WebSocket connection';
        isConnected.value = false;
        onError({ message: 'Failed to create WebSocket connection', error: wsErr });
        return;
      }

      socket.value.onopen = () => {
        if (!componentActive.value) {
          console.log(`🛑 WebSocket(${globalRefKey}): Component inactive, closing new connection`);
          close();
          return;
        }

        console.log(`✅ WebSocket(${globalRefKey}): Connection established`);
        isConnected.value = true;
        connectionAttempts.value = 0;
        errorMessage.value = null;
        onConnected();

        // Send initial message if specified
        if (initialMessage && initialMessage.trim() !== '') {
          sendMessage(initialMessage);
        }
      };

      socket.value.onmessage = (event) => {
        // If component is no longer active, ignore messages
        if (!componentActive.value) return;

        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (err) {
          // If not JSON, emit the raw data
          onMessage(event.data);
        }
      };

      socket.value.onerror = (error) => {
        console.error(`❌ WebSocket(${globalRefKey}): Error:`, error);
        errorMessage.value = 'Connection error';
        onError({ error });
      };

      socket.value.onclose = (event) => {
        isConnected.value = false;
        console.log(`🔒 WebSocket(${globalRefKey}): Closed with code: ${event.code}`);
        onDisconnected({ code: event.code, reason: event.reason });

        // Only attempt reconnect if:
        // 1. It wasn't a clean close
        // 2. AutoReconnect is enabled
        // 3. Haven't reached max attempts
        // 4. Component is still active
        // 5. Not in paused state
        if (!event.wasClean &&
            autoReconnect &&
            connectionAttempts.value < maxReconnectAttempts &&
            componentActive.value &&
            !isPaused.value) {
          scheduleReconnect();
        }
      };
    } catch (err) {
      console.error(`❌ WebSocket(${globalRefKey}): Error establishing connection:`, err);
      isConnected.value = false;
      errorMessage.value = 'Failed to establish connection';
      onError({ message: 'Failed to establish connection', error: err });
    }
  };

  /**
   * Schedule reconnection with exponential backoff
   */
  const scheduleReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (!componentActive.value || isPaused.value) {
      console.log(`🛑 WebSocket(${globalRefKey}): Component inactive or paused, not scheduling reconnection`);
      return;
    }

    connectionAttempts.value++;
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped at 30s)
    const backoffTime = Math.min(1000 * Math.pow(2, connectionAttempts.value - 1), 30000);

    console.log(`🔄 WebSocket(${globalRefKey}): Scheduling reconnection attempt ${connectionAttempts.value} in ${backoffTime/1000}s`);
    onReconnecting({ attempt: connectionAttempts.value, maxAttempts: maxReconnectAttempts, delay: backoffTime });

    reconnectTimer = setTimeout(() => {
      if (!componentActive.value || isPaused.value) {
        console.log(`🛑 WebSocket(${globalRefKey}): Component inactive or paused, canceling scheduled reconnection`);
        return;
      }

      console.log(`🔄 WebSocket(${globalRefKey}): Attempting reconnection (${connectionAttempts.value}/${maxReconnectAttempts})`);
      connect();
    }, backoffTime);

    // Store cleanup function
    pendingCleanupFunctions.push(() => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
        console.log(`🧹 WebSocket(${globalRefKey}): Cleared reconnect timer during cleanup`);
      }
    });
  };

  /**
   * Close WebSocket connection - critical for allowing bfcache to work
   */
  const close = () => {
    // Cancel any pending reconnect
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
      console.log(`🧹 WebSocket(${globalRefKey}): Cleared reconnect timer`);
    }

    // Handle global instance reference counting
    if (useGlobalInstance && socket.value) {
      const instance = getGlobalInstance(globalRefKey);

      if (instance && instance.socket === socket.value) {
        // Decrement reference count
        if (instance.count > 0) {
          instance.count--;
        }

        console.log(`📊 WebSocket(${globalRefKey}): Reference count after decrement: ${instance.count}`);

        // Only close if no more references
        if (instance.count > 0) {
          socket.value = null;
          isConnected.value = false;
          console.log(`📴 WebSocket(${globalRefKey}): Released reference but connection still active with ${instance.count} users`);
          return;
        }
      }
    }

    // Close socket if it exists
    if (socket.value) {
      console.log(`📴 WebSocket(${globalRefKey}): Closing connection`);

      try {
        // Remove event handlers before closing to prevent unwanted callbacks
        socket.value.onopen = null;
        socket.value.onclose = null;
        socket.value.onerror = null;
        socket.value.onmessage = null;

        // Only attempt to close if the socket is open or connecting
        if (socket.value.readyState === WebSocket.OPEN || socket.value.readyState === WebSocket.CONNECTING) {
          socket.value.close();
          console.log(`✅ WebSocket(${globalRefKey}): Closed successfully`);
        }
      } catch (err) {
        console.error(`❌ WebSocket(${globalRefKey}): Error closing:`, err);
      }

      // If using global instance, clear it
      if (useGlobalInstance) {
        clearGlobalInstance(globalRefKey);
      }

      socket.value = null;
      isConnected.value = false;
    }
  };

  /**
   * Pause WebSocket processing
   */
  const pause = () => {
    isPaused.value = true;
    console.log(`⏸️ WebSocket(${globalRefKey}): Paused`);

    // Don't close the connection if it's a global instance being used by others
    if (useGlobalInstance) {
      const instance = getGlobalInstance(globalRefKey);
      if (instance && instance.count > 1) {
        console.log(`📊 WebSocket(${globalRefKey}): Keeping global connection alive for ${instance.count} users`);
        socket.value = null;
        isConnected.value = false;
        return;
      }
    }

    // Close the actual connection
    close();
  };

  /**
   * Resume WebSocket processing
   */
  const resume = () => {
    isPaused.value = false;
    console.log(`▶️ WebSocket(${globalRefKey}): Resumed`);

    // Reconnect if not connected
    if (!isConnected.value && autoConnect && componentActive.value) {
      connect();
    }
  };

  /**
   * Send a message through the WebSocket
   */
  const sendMessage = (message: string | object) => {
    if (!socket.value || socket.value.readyState !== WebSocket.OPEN) {
      console.warn(`⚠️ WebSocket(${globalRefKey}): Cannot send message, connection not open`);
      return false;
    }

    try {
      const messageToSend = typeof message === 'object' ? JSON.stringify(message) : message;
      socket.value.send(messageToSend);
      return true;
    } catch (err) {
      console.error(`❌ WebSocket(${globalRefKey}): Error sending message:`, err);
      onError({ message: 'Failed to send message', error: err });
      return false;
    }
  };

  /**
   * Properly close WebSocket for bfcache - called on page hide
   */
  const handlePageHide = (event: PageTransitionEvent) => {
    console.log(`🔌 WebSocket(${globalRefKey}): Page hide event (persisted: ${event.persisted})`);

    // This is critical - close WebSocket connections when page hides
    // so the page can be stored in bfcache
    pause();
  };

  /**
   * Handle returning from bfcache - called on page show
   */
  const handlePageShow = (event: PageTransitionEvent) => {
    console.log(`🔙 WebSocket(${globalRefKey}): Page show event (persisted: ${event.persisted})`);

    // Only reconnect if we were previously using WebSocket and not paused
    if (event.persisted && autoConnect && componentActive.value && !isPaused.value) {
      console.log(`♻️ WebSocket(${globalRefKey}): Restoring from bfcache, reinitializing WebSocket`);
      // Short delay to ensure component is ready
      setTimeout(() => {
        if (componentActive.value && !isPaused.value) {
          connect();
        }
      }, 100);
    }
  };

  /**
   * Handle visibility change - pause when hidden, resume when visible
   */
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      console.log(`👁️ WebSocket(${globalRefKey}): Page hidden, pausing connection`);
      pause();
    } else if (document.visibilityState === 'visible' && !isPaused.value) {
      console.log(`👁️ WebSocket(${globalRefKey}): Page visible, resuming connection`);
      resume();
    }
  };

  /**
   * Handle network status changes
   */
  const handleOnline = () => {
    console.log(`🌐 WebSocket(${globalRefKey}): Network online, attempting reconnect`);
    if (!isPaused.value && autoConnect && componentActive.value && !isConnected.value) {
      // Reset connection attempts on network recovery to give a fresh start
      connectionAttempts.value = 0;
      connect();
    }
  };

  const handleOffline = () => {
    console.log(`🌐 WebSocket(${globalRefKey}): Network offline, closing connection`);
    close();
  };

  /**
   * Run all pending cleanup functions
   */
  const runCleanupFunctions = () => {
    console.log(`🧹 WebSocket(${globalRefKey}): Running pending cleanup functions`);
    while (pendingCleanupFunctions.length > 0) {
      const cleanupFn = pendingCleanupFunctions.pop();
      try {
        cleanupFn?.();
      } catch (err) {
        console.error(`❌ WebSocket(${globalRefKey}): Error in cleanup function:`, err);
      }
    }
  };

  /**
   * Complete cleanup for component unmount
   */
  const completeCleanup = () => {
    console.log(`🧹 WebSocket(${globalRefKey}): Running complete cleanup`);

    // Set component as inactive
    componentActive.value = false;

    // Close WebSocket
    close();

    // Run all pending cleanup functions
    runCleanupFunctions();

    // Remove event listeners
    if (import.meta.client) {
      if (handleBfCache) {
        window.removeEventListener('pagehide', handlePageHide);
        window.removeEventListener('pageshow', handlePageShow);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  };

  /**
   * Helper methods for global instance management
   */
  function getGlobalInstance(key: string): { socket: WebSocket | null; count: number } | undefined {
    return globalInstances.get(key);
  }

  function setGlobalInstance(key: string, wsSocket: WebSocket) {
    const existingInstance = globalInstances.get(key);

    if (existingInstance) {
      existingInstance.socket = wsSocket;
      existingInstance.count++;
    } else {
      globalInstances.set(key, { socket: wsSocket, count: 1 });
    }

    console.log(`📊 WebSocket(${key}): Global instance set, count: ${globalInstances.get(key)?.count}`);
  }

  function clearGlobalInstance(key: string) {
    const instance = globalInstances.get(key);

    if (instance && instance.count <= 0) {
      globalInstances.delete(key);
      console.log(`🗑️ WebSocket(${key}): Global instance removed`);
    }
  }

  // Initialize WebSocket connection and event listeners
  onMounted(() => {
    console.log(`🏗️ WebSocket(${globalRefKey}): Mounted`);

    // Reset component active state
    componentActive.value = true;

    // Connect to WebSocket if autoConnect is true
    if (import.meta.client && autoConnect && !isPaused.value) {
      if (handleBfCache) {
        // Add bfcache event handlers
        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('pageshow', handlePageShow);
      }

      // Add visibility change handler
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Add network status handlers
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Connect with a slight delay to ensure component is fully mounted
      setTimeout(() => {
        if (componentActive.value && !isPaused.value) {
          connect();
        }
      }, 100);
    }
  });

  // Handle component deactivation (keep-alive)
  onDeactivated(() => {
    console.log(`⏸️ WebSocket(${globalRefKey}): Component deactivated`);
    pause();
  });

  // Handle component activation (keep-alive)
  onActivated(() => {
    console.log(`▶️ WebSocket(${globalRefKey}): Component activated`);
    if (!isPaused.value && autoConnect) {
      resume();
    }
  });

  // Cleanup when component is unmounted
  onBeforeUnmount(completeCleanup);

  // Return public API
  return {
    // State
    isConnected,
    socket,
    connectionAttempts,
    errorMessage,
    isPaused,

    // Methods
    connect,
    close,
    pause,
    resume,
    sendMessage
  };
}
