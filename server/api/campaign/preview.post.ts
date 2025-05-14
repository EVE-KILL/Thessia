import { createError, defineEventHandler, parseCookies, readBody } from 'h3';
import { nanoid } from 'nanoid';
import { generateCampaignStats } from '~/server/helpers/CampaignsHelper';
import type { ICampaign } from '~/server/interfaces/ICampaign';

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

        // Get campaign data from the request body
        const campaignData = await readBody<{
            name: string;
            description?: string;
            startTime: string | Date;
            endTime?: string | Date;
            query: Record<string, any>;
        }>(event);

        // Validate required fields
        if (!campaignData.name) {
            throw createError({ statusCode: 400, statusMessage: 'Campaign name is required' });
        }

        if (!campaignData.startTime) {
            throw createError({ statusCode: 400, statusMessage: 'Start time is required' });
        }

        if (!campaignData.query || typeof campaignData.query !== 'object') {
            throw createError({ statusCode: 400, statusMessage: 'Valid query object is required' });
        }

        // Ensure there's at least one non-time filter
        const queryKeys = Object.keys(campaignData.query);
        const nonTimeKeys = queryKeys.filter(key => key !== 'kill_time');

        if (nonTimeKeys.length === 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'At least one filter beyond time range is required'
            });
        }

        // Convert dates from strings to Date objects if needed
        const startTimeDate = campaignData.startTime instanceof Date
            ? campaignData.startTime
            : new Date(campaignData.startTime);

        const endTimeDate = campaignData.endTime
            ? (campaignData.endTime instanceof Date ? campaignData.endTime : new Date(campaignData.endTime))
            : undefined;

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

        // Create a temporary campaign object for preview
        // Using nanoid to generate a unique ID for the preview
        const previewCampaign: ICampaign = {
            campaign_id: `preview-${nanoid(10)}`,
            name: campaignData.name.trim(),
            description: campaignData.description?.trim(),
            startTime: startTimeDate,
            endTime: endTimeDate,
            query: campaignData.query,
            creator_id: user.characterId, // Use authenticated user's character ID
            public: true
        };

        // Generate stats without saving to database
        const stats = await generateCampaignStats(previewCampaign);

        return stats;
    } catch (error: any) {
        console.error('Preview campaign error:', error);

        // Forward HTTP errors
        if (error.statusCode) {
            throw error;
        }

        // Otherwise, create a generic error
        throw createError({
            statusCode: 500,
            statusMessage: 'Error generating campaign preview',
            message: error.message || 'Error generating campaign preview',
        });
    }
});
