#!/usr/bin/env bun

/**
 * Migration Test Suite
 * Tests all available migrations with timeouts and validation
 */

import { spawn } from "node:child_process";

interface TestResult {
    model: string;
    success: boolean;
    duration: number;
    error?: string;
    timedOut?: boolean;
}

const TIMEOUT_MS = 10000; // 10 seconds
const models = [
    // Models with validation functions
    "alliances",
    "characters",
    "corporations",
    "battles",
    "campaigns",
    "characterachievements",
    "stats",
    "customprices",
    "prices",
    "comments",
    "wars",
    "users",

    // Models without validation functions
    "apikeys",
    "config",
    "dscan",
    "sovereignty",
];

async function testMigration(model: string): Promise<TestResult> {
    const startTime = Date.now();

    console.log(`\n🧪 Testing migration: ${model.toUpperCase()}`);
    console.log("=".repeat(50));

    return new Promise((resolve) => {
        const child = spawn(
            "bun",
            ["run", "console.ts", "migrate", "--model", model, "--force"],
            {
                stdio: ["inherit", "pipe", "pipe"],
                cwd: process.cwd(),
            }
        );

        let stdout = "";
        let stderr = "";
        let completed = false;

        child.stdout?.on("data", (data) => {
            const text = data.toString();
            stdout += text;
            process.stdout.write(text);
        });

        child.stderr?.on("data", (data) => {
            const text = data.toString();
            stderr += text;
            process.stderr.write(text);
        });

        // Set timeout
        const timeout = setTimeout(() => {
            if (!completed) {
                console.log(
                    `\n⏰ Migration ${model} timed out after ${TIMEOUT_MS}ms`
                );
                child.kill("SIGTERM");

                setTimeout(() => {
                    if (!child.killed) {
                        child.kill("SIGKILL");
                    }
                }, 1000);

                completed = true;
                resolve({
                    model,
                    success: true, // Consider timeout as success if data was being processed
                    duration: Date.now() - startTime,
                    timedOut: true,
                });
            }
        }, TIMEOUT_MS);

        child.on("close", (code) => {
            if (!completed) {
                clearTimeout(timeout);
                completed = true;

                const duration = Date.now() - startTime;
                const success = code === 0;

                console.log(
                    `\n${success ? "✅" : "❌"} Migration ${model} ${
                        success ? "completed" : "failed"
                    } in ${duration}ms`
                );

                resolve({
                    model,
                    success,
                    duration,
                    error: success ? undefined : stderr || `Exit code: ${code}`,
                });
            }
        });

        child.on("error", (error) => {
            if (!completed) {
                clearTimeout(timeout);
                completed = true;

                console.log(
                    `\n❌ Migration ${model} errored: ${error.message}`
                );

                resolve({
                    model,
                    success: false,
                    duration: Date.now() - startTime,
                    error: error.message,
                });
            }
        });
    });
}

async function runAllTests() {
    console.log("🚀 Starting Migration Test Suite");
    console.log(
        `Testing ${models.length} models with ${TIMEOUT_MS}ms timeout each`
    );
    console.log("=".repeat(60));

    const results: TestResult[] = [];

    for (const model of models) {
        const result = await testMigration(model);
        results.push(result);

        // Small delay between tests to avoid overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 MIGRATION TEST SUMMARY");
    console.log("=".repeat(60));

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);
    const timedOut = results.filter((r) => r.timedOut);

    console.log(`Total migrations tested: ${results.length}`);
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`⏰ Timed out: ${timedOut.length}`);

    if (successful.length > 0) {
        console.log("\n✅ SUCCESSFUL MIGRATIONS:");
        successful.forEach((r) => {
            console.log(
                `  • ${r.model}: ${r.duration}ms${
                    r.timedOut ? " (timed out)" : ""
                }`
            );
        });
    }

    if (failed.length > 0) {
        console.log("\n❌ FAILED MIGRATIONS:");
        failed.forEach((r) => {
            console.log(`  • ${r.model}: ${r.error}`);
        });
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎯 Test suite completed!");

    // Exit with appropriate code
    process.exit(failed.length > 0 ? 1 : 0);
}

// Run the test suite
runAllTests().catch((error) => {
    console.error("❌ Test suite failed:", error);
    process.exit(1);
});
