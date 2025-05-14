import { createError, defineEventHandler, parseCookies, readBody } from 'h3';
import { Campaigns } from '~/server/models/Campaigns';

// Define constants for entity limits
const LOCATION_MAX_ENTITIES = 5;
const ENTITY_MAX_ENTITIES = 15;

export default defineEventHandler(async (event) => {
    try {
        // Get authentication cookie directly from the request
        const cookies = parseCookies(event);
        const token = cookies.evelogin;

        if (!token) {
            throw createError({ statusCode: 401, statusMessage: 'Authentication required' });
        }

        // Get user data from the session
        const session = await $fetch("/api/auth/me", {
            headers: {
                cookie: `evelogin=${token}`,
            },
        }).catch(() => null);

        if (!session || !session.authenticated) {
            throw createError({
                statusCode: 401,
                statusMessage: "Authentication failed"
            });
        }

        const user = session.user;

        // Validate required fields
        const { name, description, startTime, endTime, query, campaign_id } = await readBody(event);
        const isUpdate = !!campaign_id;

        if (!name || typeof name !== 'string' || !name.trim()) {
            throw createError({ statusCode: 400, statusMessage: 'Campaign name is required' });
        }

        if (!startTime) {
            throw createError({ statusCode: 400, statusMessage: 'Start time is required' });
        }

        if (!query || typeof query !== 'object') {
            throw createError({ statusCode: 400, statusMessage: 'Valid query object is required' });
        }

        // Ensure there's at least one non-time filter
        const queryKeys = Object.keys(query);
        const nonTimeKeys = queryKeys.filter(key => key !== 'kill_time');

        if (nonTimeKeys.length === 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'At least one filter beyond time range is required'
            });
        }

        // Create dates from string timestamps
        const startTimeDate = new Date(startTime);
        const endTimeDate = endTime ? new Date(endTime) : undefined;

        // Validate dates
        if (isNaN(startTimeDate.getTime())) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid start time format' });
        }

        if (endTimeDate && isNaN(endTimeDate.getTime())) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid end time format' });
        }

        if (endTimeDate && endTimeDate < startTimeDate) {
            throw createError({ statusCode: 400, statusMessage: 'End time cannot be before start time' });
        }

        // Validate entity limits in query
        validateEntityLimits(query);

        // Create campaign document with creator ID from authenticated user
        const campaignData = {
            name: name.trim(),
            description: description?.trim(),
            startTime: startTimeDate,
            endTime: endTimeDate,
            query,
            creator_id: user.characterId, // Add creator ID from authenticated user
            public: true // Default to public for now
        };

        // If we're updating an existing campaign
        if (isUpdate) {
            // Check if the campaign exists and the user is the creator
            const existingCampaign = await Campaigns.findOne({ campaign_id });

            if (!existingCampaign) {
                throw createError({
                    statusCode: 404,
                    statusMessage: 'Campaign not found'
                });
            }

            if (existingCampaign.creator_id !== user.characterId) {
                throw createError({
                    statusCode: 403,
                    statusMessage: 'You are not authorized to update this campaign'
                });
            }

            // Update the campaign
            await Campaigns.updateOne(
                { campaign_id },
                {
                    $set: campaignData
                }
            );

            return {
                success: true,
                message: 'Campaign updated successfully',
                campaign: {
                    id: campaign_id,
                    name: name.trim()
                }
            };
        }
        // Creating a new campaign
        else {
            // Save to database
            const campaign = new Campaigns(campaignData);
            await campaign.save();

            // Return campaign data with ID
            return {
                success: true,
                message: 'Campaign created successfully',
                campaign: {
                    id: campaign.campaign_id,
                    name: campaign.name
                }
            };
        }
    } catch (error: any) {
        // Log the error server-side with more details
        console.error('Save campaign error:', error,
            error.stack ? error.stack : 'No stack trace');

        // Return appropriate error to client
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || 'Error saving campaign'
        });
    }
});

/**
 * Validates entity limits in the campaign query to prevent bypassing frontend restrictions
 * @param query - The campaign query object
 * @throws {Error} If entity limits are exceeded
 */
function validateEntityLimits(query: Record<string, any>): void {
    // Check for location field limits
    validateFieldLimit(query, 'region_id', LOCATION_MAX_ENTITIES);
    validateFieldLimit(query, 'system_id', LOCATION_MAX_ENTITIES);
    validateFieldLimit(query, 'constellation_id', LOCATION_MAX_ENTITIES);

    // Check for attacker field limits
    validateFieldLimit(query, 'attackers.character_id', ENTITY_MAX_ENTITIES);
    validateFieldLimit(query, 'attackers.corporation_id', ENTITY_MAX_ENTITIES);
    validateFieldLimit(query, 'attackers.alliance_id', ENTITY_MAX_ENTITIES);
    validateFieldLimit(query, 'attackers.faction_id', ENTITY_MAX_ENTITIES);

    // Check for victim field limits
    validateFieldLimit(query, 'victim.character_id', ENTITY_MAX_ENTITIES);
    validateFieldLimit(query, 'victim.corporation_id', ENTITY_MAX_ENTITIES);
    validateFieldLimit(query, 'victim.alliance_id', ENTITY_MAX_ENTITIES);
    validateFieldLimit(query, 'victim.faction_id', ENTITY_MAX_ENTITIES);
}

/**
 * Validates the number of entities in a specific field of the query
 * @param query - The campaign query object
 * @param fieldName - The field name to check
 * @param maxEntities - The maximum number of entities allowed
 * @throws {Error} If entity limit is exceeded
 */
function validateFieldLimit(query: Record<string, any>, fieldName: string, maxEntities: number): void {
    if (!query[fieldName]) return;

    // Check if the field exists and is using $in operator
    if (typeof query[fieldName] === 'object' && query[fieldName].$in) {
        // Count entities in the $in array
        const count = query[fieldName].$in.length;
        if (count > maxEntities) {
            throw createError({
                statusCode: 400,
                statusMessage: `Too many entities for ${fieldName}. Maximum allowed is ${maxEntities}.`
            });
        }
    }
}
