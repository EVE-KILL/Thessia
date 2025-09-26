import prisma from "../lib/prisma";
import { cliLogger } from "../server/helpers/Logger";

interface PostgreSQLProcess {
    pid: number;
    user: string;
    database: string;
    client_addr: string | null;
    application_name: string;
    state: string;
    query_start: Date | null;
    state_change: Date | null;
    query: string;
    wait_event_type: string | null;
    wait_event: string | null;
    backend_start: Date;
    duration_ms: number | null;
}

interface CompletedQuery {
    pid: number;
    user: string;
    database: string;
    query: string;
    duration_ms: number;
    completed_at: Date;
}

class PostgreSQLProcessMonitor {
    private processes: PostgreSQLProcess[] = [];
    private completedQueries: CompletedQuery[] = [];
    private previousProcesses: Map<number, PostgreSQLProcess> = new Map();
    private selectedIndex = 0;
    private showAll = false;
    private showHistory = false;
    private historySelectedIndex = 0;
    private sortBy: "duration" | "pid" | "user" | "database" = "duration";
    private sortDesc = true;
    private terminalWidth = 80;
    private terminalHeight = 24;

    updateTerminalSize() {
        this.terminalWidth = process.stdout.columns || 80;
        this.terminalHeight = process.stdout.rows || 24;
    }

    async fetchProcesses() {
        try {
            const result = await prisma.$queryRaw<any[]>`
                SELECT
                    pid,
                    usename as user,
                    datname as database,
                    client_addr,
                    application_name,
                    state,
                    query_start,
                    state_change,
                    backend_start,
                    query,
                    wait_event_type,
                    wait_event,
                    CASE
                        WHEN query_start IS NOT NULL
                        THEN EXTRACT(EPOCH FROM (NOW() - query_start)) * 1000
                        ELSE NULL
                    END as duration_ms
                FROM pg_stat_activity
                WHERE state != 'idle'
                    AND pid != pg_backend_pid()
                    AND query NOT LIKE '%pg_stat_activity%'
                ORDER BY query_start DESC NULLS LAST
            `;

            const newProcesses = result.map((row) => ({
                pid: row.pid,
                user: row.user || "",
                database: row.database || "",
                client_addr: row.client_addr || null,
                application_name: row.application_name || "",
                state: row.state || "",
                query_start: row.query_start ? new Date(row.query_start) : null,
                state_change: row.state_change
                    ? new Date(row.state_change)
                    : null,
                backend_start: new Date(row.backend_start),
                query: row.query || "",
                wait_event_type: row.wait_event_type,
                wait_event: row.wait_event,
                duration_ms: row.duration_ms
                    ? Math.round(row.duration_ms)
                    : null,
            }));

            // Check for completed queries
            this.trackCompletedQueries(newProcesses);

            this.processes = newProcesses;
            this.sortProcesses();
        } catch (error) {
            cliLogger.error(`Error fetching PostgreSQL processes: ${error}`);
        }
    }

    trackCompletedQueries(newProcesses: PostgreSQLProcess[]) {
        const currentPids = new Set(newProcesses.map((p) => p.pid));

        // Check for processes that were running but are no longer in the list
        for (const [pid, prevProcess] of this.previousProcesses.entries()) {
            if (
                !currentPids.has(pid) &&
                prevProcess.duration_ms &&
                prevProcess.duration_ms > 100
            ) {
                // Query completed, add to history
                const completedQuery: CompletedQuery = {
                    pid: prevProcess.pid,
                    user: prevProcess.user,
                    database: prevProcess.database,
                    query: prevProcess.query,
                    duration_ms: prevProcess.duration_ms,
                    completed_at: new Date(),
                };

                this.completedQueries.unshift(completedQuery);

                // Keep only last 10 completed queries
                if (this.completedQueries.length > 10) {
                    this.completedQueries = this.completedQueries.slice(0, 10);
                }
            }
        }

        // Update previous processes map
        this.previousProcesses.clear();
        for (const process of newProcesses) {
            this.previousProcesses.set(process.pid, process);
        }
    }

    sortProcesses() {
        this.processes.sort((a, b) => {
            let aVal: any, bVal: any;

            switch (this.sortBy) {
                case "duration":
                    aVal = a.duration_ms || 0;
                    bVal = b.duration_ms || 0;
                    break;
                case "pid":
                    aVal = a.pid;
                    bVal = b.pid;
                    break;
                case "user":
                    aVal = a.user;
                    bVal = b.user;
                    break;
                case "database":
                    aVal = a.database;
                    bVal = b.database;
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return this.sortDesc ? 1 : -1;
            if (aVal > bVal) return this.sortDesc ? -1 : 1;
            return 0;
        });
    }

    formatDuration(ms: number | null): string {
        if (!ms) return "     -";

        if (ms < 1000) return `${ms.toString().padStart(4)}ms`;

        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds.toString().padStart(4)}s `;

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        if (minutes < 60)
            return `${minutes}:${remainingSeconds
                .toString()
                .padStart(2, "0")}m`;

        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}:${remainingMinutes.toString().padStart(2, "0")}h`;
    }

    formatUptime(seconds: number): string {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    }

    formatBytes(mb: number): string {
        if (mb >= 1024) {
            return `${(mb / 1024).toFixed(1)}GB`;
        }
        return `${mb.toFixed(0)}MB`;
    }

    formatQuery(query: string, maxLength: number = 80): string {
        if (!query) return "";

        // Clean up the query
        const cleaned = query.replace(/\s+/g, " ").trim();

        if (cleaned.length <= maxLength) {
            return cleaned;
        }

        return cleaned.substring(0, maxLength - 3) + "...";
    }

    wrapText(text: string, width: number): string[] {
        if (!text) return [""];

        const words = text.split(" ");
        const lines: string[] = [];
        let currentLine = "";

        for (const word of words) {
            if ((currentLine + word).length <= width) {
                currentLine += (currentLine ? " " : "") + word;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    // Word is longer than width, split it
                    lines.push(word.substring(0, width));
                    currentLine = word.substring(width);
                }
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines.length ? lines : [""];
    }

    getStateColor(state: string): string {
        switch (state) {
            case "active":
                return "\x1b[32m"; // Green
            case "idle in transaction":
                return "\x1b[33m"; // Yellow
            case "idle in transaction (aborted)":
                return "\x1b[31m"; // Red
            case "fastpath function call":
                return "\x1b[36m"; // Cyan
            case "disabled":
                return "\x1b[90m"; // Gray
            default:
                return "\x1b[37m"; // White
        }
    }

    async killProcess(pid: number) {
        try {
            await prisma.$executeRawUnsafe(
                `SELECT pg_terminate_backend($1)`,
                pid
            );
            cliLogger.info(`Successfully terminated process ${pid}`);
            return true;
        } catch (error) {
            cliLogger.error(`Failed to terminate process ${pid}: ${error}`);
            return false;
        }
    }

    displayHeader() {
        const reset = "\x1b[0m";
        const bold = "\x1b[1m";
        const blue = "\x1b[34m";
        const separator = "═".repeat(this.terminalWidth);
        const subseparator = "─".repeat(this.terminalWidth);

        console.clear();

        let title = "PostgreSQL Process Monitor";
        if (this.showHistory) title += " (History Mode)";
        else title += " (Live Mode)";

        console.log(`${bold}${blue}${title}${reset}`);
        console.log(`${blue}${separator}${reset}`);

        if (this.showHistory) {
            console.log(
                `Completed Queries: ${
                    this.completedQueries.length
                } | Selected: ${this.historySelectedIndex + 1}/${
                    this.completedQueries.length
                }`
            );
        } else {
            console.log(
                `Active Processes: ${this.processes.length} | Sort: ${
                    this.sortBy
                } ${this.sortDesc ? "↓" : "↑"} | Selected: ${
                    this.selectedIndex + 1
                }/${this.processes.length} | History: ${
                    this.completedQueries.length
                }`
            );
        }

        console.log(`${blue}${subseparator}${reset}`);

        if (this.terminalWidth >= 120) {
            // Wide layout - show everything
            if (this.showHistory) {
                console.log(
                    `${bold}PID      USER          DATABASE      DURATION  COMPLETED         QUERY${reset}`
                );
            } else {
                console.log(
                    `${bold}PID      USER          DATABASE      STATE           DURATION  CLIENT           APPLICATION      QUERY${reset}`
                );
            }
        } else {
            // Narrow layout - essential columns only
            if (this.showHistory) {
                console.log(
                    `${bold}PID      USER          DURATION  QUERY${reset}`
                );
            } else {
                console.log(
                    `${bold}PID      USER          DATABASE      STATE           DURATION  QUERY${reset}`
                );
            }
        }
        console.log(`${blue}${subseparator}${reset}`);
    }

    displayProcesses() {
        const reset = "\x1b[0m";
        const bold = "\x1b[1m";
        const highlight = "\x1b[7m"; // Reverse video for selection
        const maxRows = Math.max(1, this.terminalHeight - 15); // Leave more space for header and controls

        if (this.showHistory) {
            this.displayCompletedQueries(maxRows);
        } else {
            this.displayActiveProcesses(maxRows);
        }
    }

    displayActiveProcesses(maxRows: number) {
        const reset = "\x1b[0m";
        const highlight = "\x1b[7m";

        this.processes.slice(0, maxRows).forEach((process, index) => {
            const isSelected = index === this.selectedIndex;
            const stateColor = this.getStateColor(process.state);
            const prefix = isSelected ? highlight : "";
            const suffix = reset;

            const pid = process.pid.toString().padEnd(8);
            const user = process.user.substring(0, 12).padEnd(13);
            const database = process.database.substring(0, 12).padEnd(13);
            const duration = this.formatDuration(process.duration_ms).padEnd(9);

            if (this.terminalWidth >= 120) {
                // Wide layout
                const state = process.state.substring(0, 14).padEnd(15);
                const clientAddr = (process.client_addr || "local")
                    .substring(0, 15)
                    .padEnd(16);
                const appName = process.application_name
                    .substring(0, 15)
                    .padEnd(16);
                const queryLength = Math.max(30, this.terminalWidth - 100);
                const query = this.formatQuery(process.query, queryLength);

                console.log(
                    `${prefix}${pid} ${user} ${database} ${stateColor}${state}${reset}${prefix} ${duration} ${clientAddr} ${appName} ${query}${suffix}`
                );
            } else {
                // Narrow layout
                const state = process.state.substring(0, 14).padEnd(15);
                const queryLength = Math.max(20, this.terminalWidth - 70);
                const query = this.formatQuery(process.query, queryLength);

                console.log(
                    `${prefix}${pid} ${user} ${database} ${stateColor}${state}${reset}${prefix} ${duration} ${query}${suffix}`
                );
            }
        });
    }

    displayCompletedQueries(maxRows: number) {
        const reset = "\x1b[0m";
        const highlight = "\x1b[7m";
        const gray = "\x1b[90m";

        this.completedQueries.slice(0, maxRows).forEach((query, index) => {
            const isSelected = index === this.historySelectedIndex;
            const prefix = isSelected ? highlight : "";
            const suffix = reset;

            const pid = query.pid.toString().padEnd(8);
            const user = query.user.substring(0, 12).padEnd(13);
            const duration = this.formatDuration(query.duration_ms).padEnd(9);
            const completedTime = query.completed_at
                .toLocaleTimeString()
                .padEnd(17);

            if (this.terminalWidth >= 120) {
                // Wide layout
                const database = query.database.substring(0, 12).padEnd(13);
                const queryLength = Math.max(30, this.terminalWidth - 80);
                const queryText = this.formatQuery(query.query, queryLength);

                console.log(
                    `${prefix}${gray}${pid} ${user} ${database} ${duration} ${completedTime} ${queryText}${suffix}`
                );
            } else {
                // Narrow layout
                const queryLength = Math.max(20, this.terminalWidth - 50);
                const queryText = this.formatQuery(query.query, queryLength);

                console.log(
                    `${prefix}${gray}${pid} ${user} ${duration} ${queryText}${suffix}`
                );
            }
        });
    }

    displayControls() {
        const reset = "\x1b[0m";
        const gray = "\x1b[90m";
        const bold = "\x1b[1m";
        const separator = "─".repeat(this.terminalWidth);

        console.log(`${gray}${separator}${reset}`);

        if (this.showHistory) {
            console.log(
                `${bold}Controls:${reset} ${gray}↑/↓ Select | h History Toggle | r Refresh | q Quit${reset}`
            );
        } else {
            console.log(
                `${bold}Controls:${reset} ${gray}↑/↓ Select | k Kill | d Duration | p PID | u User | b Database | h History | r Refresh | q Quit${reset}`
            );
        }

        this.displaySelectedDetails();
    }

    displaySelectedDetails() {
        const reset = "\x1b[0m";
        const gray = "\x1b[90m";
        const bold = "\x1b[1m";
        const separator = "─".repeat(this.terminalWidth);

        if (
            this.showHistory &&
            this.completedQueries.length > 0 &&
            this.historySelectedIndex < this.completedQueries.length
        ) {
            const selected = this.completedQueries[this.historySelectedIndex];
            console.log(`${gray}${separator}${reset}`);
            console.log(`${bold}Selected Completed Query:${reset}`);
            console.log(
                `${gray}PID:${reset} ${selected.pid} | ${gray}User:${reset} ${selected.user} | ${gray}Database:${reset} ${selected.database}`
            );
            console.log(
                `${gray}Duration:${reset} ${this.formatDuration(
                    selected.duration_ms
                )} | ${gray}Completed:${reset} ${selected.completed_at.toLocaleString()}`
            );

            // Word wrap the query for full display
            const queryLines = this.wrapText(
                selected.query,
                this.terminalWidth - 8
            );
            console.log(`${gray}Query:${reset}`);
            queryLines.forEach((line) => {
                console.log(`  ${line}`);
            });
        } else if (
            !this.showHistory &&
            this.processes.length > 0 &&
            this.selectedIndex < this.processes.length
        ) {
            const selected = this.processes[this.selectedIndex];
            console.log(`${gray}${separator}${reset}`);
            console.log(`${bold}Selected Active Query:${reset}`);
            console.log(
                `${gray}PID:${reset} ${selected.pid} | ${gray}User:${reset} ${selected.user} | ${gray}Database:${reset} ${selected.database}`
            );
            console.log(
                `${gray}State:${reset} ${this.getStateColor(selected.state)}${
                    selected.state
                }${reset} | ${gray}Duration:${reset} ${this.formatDuration(
                    selected.duration_ms
                )}`
            );
            console.log(
                `${gray}Client:${reset} ${
                    selected.client_addr || "local"
                } | ${gray}Application:${reset} ${
                    selected.application_name || "N/A"
                }`
            );

            // Word wrap the query for full display
            const queryLines = this.wrapText(
                selected.query,
                this.terminalWidth - 8
            );
            console.log(`${gray}Query:${reset}`);
            queryLines.forEach((line) => {
                console.log(`  ${line}`);
            });
        }
    }

    async handleInput() {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");

        return new Promise<boolean>((resolve) => {
            process.stdin.on("data", async (key) => {
                const char = key.toString();

                switch (char) {
                    case "q":
                    case "\u0003": // Ctrl+C
                        resolve(true);
                        break;

                    case "\u001b[A": // Up arrow
                        if (this.showHistory) {
                            if (this.historySelectedIndex > 0) {
                                this.historySelectedIndex--;
                            }
                        } else {
                            if (this.selectedIndex > 0) {
                                this.selectedIndex--;
                            }
                        }
                        break;

                    case "\u001b[B": // Down arrow
                        if (this.showHistory) {
                            if (
                                this.historySelectedIndex <
                                this.completedQueries.length - 1
                            ) {
                                this.historySelectedIndex++;
                            }
                        } else {
                            if (
                                this.selectedIndex <
                                this.processes.length - 1
                            ) {
                                this.selectedIndex++;
                            }
                        }
                        break;

                    case "k":
                        if (
                            !this.showHistory &&
                            this.processes[this.selectedIndex]
                        ) {
                            const process = this.processes[this.selectedIndex];
                            console.log(`\nKilling process ${process.pid}...`);
                            await this.killProcess(process.pid);
                            setTimeout(async () => {
                                await this.fetchProcesses();
                                this.display();
                            }, 1000);
                        }
                        break;

                    case "h":
                        this.showHistory = !this.showHistory;
                        // Reset selection when switching modes
                        this.selectedIndex = 0;
                        this.historySelectedIndex = 0;
                        break;

                    case "d":
                        if (!this.showHistory) {
                            this.sortBy = "duration";
                            this.sortDesc = !this.sortDesc;
                            this.sortProcesses();
                        }
                        break;

                    case "p":
                        if (!this.showHistory) {
                            this.sortBy = "pid";
                            this.sortDesc = !this.sortDesc;
                            this.sortProcesses();
                        }
                        break;

                    case "u":
                        if (!this.showHistory) {
                            this.sortBy = "user";
                            this.sortDesc = !this.sortDesc;
                            this.sortProcesses();
                        }
                        break;

                    case "b":
                        if (!this.showHistory) {
                            this.sortBy = "database";
                            this.sortDesc = !this.sortDesc;
                            this.sortProcesses();
                        }
                        break;

                    case "r":
                        await this.fetchProcesses();
                        break;
                }

                this.display();
            });
        });
    }

    display() {
        this.updateTerminalSize();
        this.displayHeader();
        this.displayProcesses();
        this.displayControls();
    }

    async start() {
        console.log("Starting PostgreSQL Process Monitor...");

        this.updateTerminalSize();
        await this.fetchProcesses();
        this.display();

        // Auto-refresh every 2 seconds
        const refreshInterval = setInterval(async () => {
            await this.fetchProcesses();
            this.display();
        }, 2000);

        // Handle terminal resize
        process.stdout.on("resize", () => {
            this.updateTerminalSize();
            this.display();
        });

        const shouldExit = await this.handleInput();

        clearInterval(refreshInterval);

        if (shouldExit) {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            console.clear();
            console.log("PostgreSQL Process Monitor stopped.");
        }
    }
}

export default {
    name: "pg-processes",
    description: "Monitor PostgreSQL running processes with a terminal UI",
    longRunning: true,
    options: [],
    run: async () => {
        const monitor = new PostgreSQLProcessMonitor();
        await monitor.start();
    },
};
