import { cliLogger } from '~/server/helpers/Logger'
import { MeilisearchUpdater } from '~/server/helpers/MeilisearchUpdater'
// Models are needed if getEstimatedCountsFn is defined here, otherwise not strictly necessary
// For simplicity, if cron doesn't need detailed counts, we can omit getEstimatedCountsFn
// import { Alliances } from '~/server/models/Alliances';
// import { Characters } from '~/server/models/Characters';
// import { Corporations } from '~/server/models/Corporations';
// import { Factions } from '~/server/models/Factions';
// import { InvTypes } from '~/server/models/InvTypes';
// import { Regions } from '~/server/models/Regions';
// import { SolarSystems } from '~/server/models/SolarSystems';

// Progress bar utility - can be removed if cron doesn't use visual progress bars
// function formatProgressBar(current: number, total: number, entityType: EntityType, barLength = 20): string {
//     const percentage = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 100;
//     const filledLength = total > 0 ? Math.round((barLength * current) / total) : barLength;
//     const bar = "█".repeat(filledLength) + "░".repeat(Math.max(0, barLength - filledLength));
//     return `  ${entityType}: ${bar} ${percentage}% (${current.toLocaleString()}/${total.toLocaleString()})`;
// }

/**
 * Cron job that updates all entities in Meilisearch for search functionality
 * Runs daily to ensure search data is current
 */
export default {
    name: 'updateMeilisearchCron',
    description: 'Update entities in Meilisearch (Cron Job)',
    schedule: '0 0 * * *', // Runs daily at midnight
    run: async () => {
        cliLogger.info('Starting Meilisearch update cron job via MeilisearchUpdater...')
        const startTime = Date.now()

        const updater = new MeilisearchUpdater({
            // No progressReporter for cron, simple logging is handled by cliLogger inside the helper
            // No getEstimatedCountsFn for cron to keep it simpler, detailed counts not typically logged in cron
            // If estimated counts are desired for logging, the function can be added similar to the console script
        })

        try {
            const resultCount = await updater.runUpdate()
            const duration = (Date.now() - startTime) / 1000
            const totalProcessed = Object.values(resultCount).reduce((sum, count) => sum + count, 0)

            cliLogger.info( // Changed from cliLogger.success to cliLogger.info
                `Meilisearch update cron job completed. Processed ${totalProcessed.toLocaleString()} entities in ${duration.toFixed(2)} seconds.`
            )
            cliLogger.info('Entities processed by type:')
            for (const [type, count] of Object.entries(resultCount)) {
                cliLogger.info(`  - ${type}: ${count.toLocaleString()}`)
            }

            return {
                status: 'success',
                totalProcessed,
                durationSeconds: duration,
                processedCounts: resultCount
            }
        } catch (error: any) {
            cliLogger.error('Meilisearch update cron job failed:')
            cliLogger.error(error.message || error)
            if (error.stack) {
                cliLogger.error(error.stack)
            }
            return {
                status: 'error',
                error: error.message
            }
        }
    }
}
