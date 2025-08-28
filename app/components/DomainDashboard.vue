<template>
    <div class="min-h-screen text-white">
        <!-- Hero Section -->
        <div v-if="showHeroSection"
            class="relative overflow-hidden bg-gradient-to-br from-gray-900/30 via-gray-800/20 to-gray-900/30 border-b border-gray-800">
            <div
                class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMxZjJhNDAiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20">
            </div>

            <UContainer class="relative py-16">
                <div class="text-center max-w-4xl mx-auto">
                    <!-- Domain Title & Branding -->
                    <h1
                        class="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 bg-clip-text text-transparent mb-4">
                        {{ domainTitle }}
                    </h1>

                    <!-- Enhanced Welcome Message Section -->
                    <div class="mb-8 space-y-4">
                        <!-- Primary Welcome Message -->
                        <p class="text-xl text-zinc-300 leading-relaxed max-w-3xl mx-auto">
                            {{ customWelcomeMessage || defaultWelcomeMessage }}
                        </p>

                        <!-- Secondary Custom Text (if configured) -->
                        <div v-if="customSecondaryMessage" class="max-w-2xl mx-auto">
                            <p class="text-base text-zinc-400 leading-relaxed">
                                {{ customSecondaryMessage }}
                            </p>
                        </div>

                        <!-- Call-to-Action Buttons (if configured) -->
                        <div v-if="customCTAButtons.length > 0" class="flex flex-wrap justify-center gap-3 mt-6">
                            <a v-for="cta in customCTAButtons" :key="cta.id" :href="cta.url"
                                :target="cta.external ? '_blank' : '_self'"
                                class="inline-flex items-center px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200"
                                :class="cta.primary ?
                                    'bg-gray-700 hover:bg-gray-600 text-white shadow-lg hover:shadow-xl' :
                                    'bg-gray-800/50 hover:bg-gray-700/50 text-zinc-200 border border-gray-600 hover:border-gray-500'">
                                {{ cta.text }}
                                <svg v-if="cta.external" class="w-4 h-4 ml-2" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14">
                                    </path>
                                </svg>
                            </a>
                        </div>
                    </div>

                    <!-- Enhanced Entity Showcase -->
                    <div v-if="domainEntities.length > 0" class="mb-8">
                        <div class="flex flex-wrap justify-center gap-4">
                            <div v-for="entity in domainEntities.slice(0, 6)"
                                :key="`${entity.entity_type}-${entity.entity_id}`"
                                class="group flex items-center space-x-3 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-lg px-4 py-3 hover:bg-gray-700/40 hover:border-gray-600/50 transition-all duration-200 cursor-pointer"
                                @click="focusOnEntity(entity)">
                                <!-- Entity Avatar/Icon -->
                                <div class="relative">
                                    <img v-if="entity.entity_type === 'character'"
                                        :src="`https://images.evetech.net/characters/${entity.entity_id}/portrait?size=32`"
                                        :alt="entity.display_name" class="w-8 h-8 rounded-full border border-gray-600"
                                        loading="lazy">
                                    <img v-else-if="entity.entity_type === 'corporation'"
                                        :src="`https://images.evetech.net/corporations/${entity.entity_id}/logo?size=32`"
                                        :alt="entity.display_name" class="w-8 h-8 rounded border border-gray-600"
                                        loading="lazy">
                                    <img v-else-if="entity.entity_type === 'alliance'"
                                        :src="`https://images.evetech.net/alliances/${entity.entity_id}/logo?size=32`"
                                        :alt="entity.display_name" class="w-8 h-8 rounded border border-gray-600"
                                        loading="lazy">
                                    <div v-else
                                        class="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                        {{ entity.entity_type === 'character' ? 'C' : entity.entity_type ===
                                            'corporation' ? 'Corp' : 'A' }}
                                    </div>
                                    <!-- Activity Indicator -->
                                    <div v-if="entity.recent_activity"
                                        class="absolute -top-1 -right-1 w-3 h-3 bg-green-400 border-2 border-gray-800 rounded-full">
                                    </div>
                                </div>

                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center space-x-2">
                                        <span class="text-zinc-200 font-medium truncate">
                                            {{ entity.display_name || `${entity.entity_type} ${entity.entity_id}` }}
                                        </span>
                                        <span v-if="entity.primary"
                                            class="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full flex-shrink-0">Primary</span>
                                    </div>
                                    <!-- Entity Stats Preview -->
                                    <div v-if="entityStats[entity.entity_id]" class="text-xs text-zinc-400 mt-1">
                                        {{ entityStats[entity.entity_id].kills || 0 }} kills,
                                        {{ formatISK(entityStats[entity.entity_id].value || 0) }} ISK
                                    </div>
                                </div>

                                <!-- Focus Indicator -->
                                <div class="text-zinc-400 group-hover:text-zinc-200 transition-colors">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M9 5l7 7-7 7"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <p v-if="domainEntities.length > 6" class="text-zinc-400 text-sm mt-3 text-center">
                            +{{ domainEntities.length - 6 }} more entities tracked on this domain
                        </p>
                    </div>

                </div>
            </UContainer>
        </div>

        <UContainer class="py-8">
            <!-- Time Period Selector - Top Right -->
            <div class="flex justify-end mb-6">
                <div class="flex items-center space-x-3">
                    <span class="text-sm text-zinc-400">Time period:</span>
                    <div class="relative">
                        <select v-model="selectedTimeRange"
                            class="custom-select appearance-none rounded-lg border border-gray-600 bg-gray-800/50 backdrop-blur-sm pl-3 pr-8 py-2 text-zinc-100 text-sm font-medium shadow-sm hover:bg-gray-700/50 transition-colors">
                            <option v-for="range in timeRanges" :key="range.value" :value="range.value">
                                {{ range.label }}
                            </option>
                        </select>
                        <div
                            class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400">
                            <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Statistics Highlight Cards -->
            <div v-if="showStatsSection" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <!-- Total Kills Card -->
                <div
                    class="bg-gradient-to-br from-gray-900/40 to-gray-800/30 border border-gray-700/50 rounded-lg p-6 backdrop-blur-sm">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="text-gray-300 font-semibold">Total Kills</h3>
                        <div class="w-8 h-8 bg-gray-600/30 rounded-lg flex items-center justify-center">
                            <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <div class="text-2xl font-bold text-white mb-1">{{ numberFormat(stats?.totalKills || 0) }}</div>
                    <div class="text-gray-400 text-sm">Last {{ getTimeRangeLabel(selectedTimeRange) }}</div>
                </div>

                <!-- Total ISK Destroyed -->
                <div
                    class="bg-gradient-to-br from-gray-900/40 to-gray-800/30 border border-gray-700/50 rounded-lg p-6 backdrop-blur-sm">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="text-gray-300 font-semibold">ISK Destroyed</h3>
                        <div class="w-8 h-8 bg-gray-600/30 rounded-lg flex items-center justify-center">
                            <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                <path fill-rule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                                    clip-rule="evenodd" />
                            </svg>
                        </div>
                    </div>
                    <div class="text-2xl font-bold text-white mb-1">{{ formatIsk(stats?.totalValue || 0) }}</div>
                    <div class="text-gray-400 text-sm">Last {{ getTimeRangeLabel(selectedTimeRange) }}</div>
                </div>

                <!-- Top Ship Destroyed -->
                <div
                    class="bg-gradient-to-br from-gray-900/40 to-gray-800/30 border border-gray-700/50 rounded-lg p-6 backdrop-blur-sm">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="text-gray-300 font-semibold">Most Destroyed</h3>
                        <div class="w-8 h-8 bg-gray-600/30 rounded-lg flex items-center justify-center">
                            <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                            </svg>
                        </div>
                    </div>
                    <div class="text-lg font-bold text-white mb-1">{{ topShipDestroyed?.ship_group_name || 'Loading...'
                    }}</div>
                    <div class="text-gray-400 text-sm">{{ topShipDestroyed?.killed || 0 }} destroyed</div>
                </div>

                <!-- Active Entities -->
                <div
                    class="bg-gradient-to-br from-gray-900/40 to-gray-800/30 border border-gray-700/50 rounded-lg p-6 backdrop-blur-sm">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="text-gray-300 font-semibold">Active Entities</h3>
                        <div class="w-8 h-8 bg-gray-600/30 rounded-lg flex items-center justify-center">
                            <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                            </svg>
                        </div>
                    </div>
                    <div class="text-2xl font-bold text-white mb-1">{{ domainEntities.length }}</div>
                    <div class="text-gray-400 text-sm">Characters, Corps & Alliances</div>
                </div>
            </div>

            <!-- Entity Information Pane -->
            <div v-if="showTrackingOverview" class="mb-8">
                <div
                    class="bg-gradient-to-r from-gray-900/40 via-gray-800/30 to-gray-900/40 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm">
                    <div class="flex items-start justify-between mb-4">
                        <div>
                            <h3 class="text-lg font-bold text-white mb-2">Tracking Overview</h3>
                            <p class="text-zinc-400 text-sm">
                                This killboard monitors activity for {{ domainEntities.length }} {{
                                    domainEntities.length === 1 ? 'entity' : 'entities' }} in New Eden
                            </p>
                        </div>
                        <div class="flex items-center space-x-2">
                            <div class="w-8 h-8 bg-gray-600/30 rounded-lg flex items-center justify-center">
                                <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div v-if="domainEntities.length > 0"
                        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        <div v-for="entity in domainEntities" :key="`${entity.entity_type}-${entity.entity_id}`"
                            class="flex items-center space-x-3 bg-gray-800/40 rounded-lg p-3 hover:bg-gray-700/40 transition-colors cursor-pointer group"
                            @click="focusOnEntity(entity)">
                            <!-- Entity Avatar -->
                            <div class="relative flex-shrink-0">
                                <img v-if="entity.entity_type === 'character'"
                                    :src="`https://images.evetech.net/characters/${entity.entity_id}/portrait?size=32`"
                                    :alt="entity.display_name" class="w-8 h-8 rounded-full border border-gray-600"
                                    loading="lazy">
                                <img v-else-if="entity.entity_type === 'corporation'"
                                    :src="`https://images.evetech.net/corporations/${entity.entity_id}/logo?size=32`"
                                    :alt="entity.display_name" class="w-8 h-8 rounded border border-gray-600"
                                    loading="lazy">
                                <img v-else-if="entity.entity_type === 'alliance'"
                                    :src="`https://images.evetech.net/alliances/${entity.entity_id}/logo?size=32`"
                                    :alt="entity.display_name" class="w-8 h-8 rounded border border-gray-600"
                                    loading="lazy">
                                <div v-else
                                    class="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                                    {{ entity.entity_type === 'character' ? 'C' : entity.entity_type === 'corporation' ?
                                        'Co' : 'A' }}
                                </div>

                                <!-- Primary indicator -->
                                <div v-if="entity.primary"
                                    class="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 border-2 border-gray-800 rounded-full">
                                </div>

                                <!-- Activity indicator -->
                                <div v-else-if="entityStats[entity.entity_id]?.recent_activity"
                                    class="absolute -top-1 -right-1 w-3 h-3 bg-green-400 border-2 border-gray-800 rounded-full">
                                </div>
                            </div>

                            <!-- Entity Info -->
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center space-x-2">
                                    <span
                                        class="text-zinc-200 font-medium text-sm truncate group-hover:text-white transition-colors">
                                        {{ entity.display_name || `${entity.entity_type} ${entity.entity_id}` }}
                                    </span>
                                    <span v-if="entity.primary"
                                        class="text-xs bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                        Primary
                                    </span>
                                </div>
                                <div class="text-xs text-zinc-500 capitalize">
                                    {{ entity.entity_type }}
                                    <span v-if="entityStats[entity.entity_id]" class="ml-2 text-zinc-400">
                                        {{ entityStats[entity.entity_id].kills || 0 }} kills
                                    </span>
                                </div>
                            </div>

                            <!-- Focus indicator -->
                            <div class="text-zinc-500 group-hover:text-zinc-300 transition-colors flex-shrink-0">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M9 5l7 7-7 7"></path>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div v-else class="text-center py-6 text-zinc-500">
                        No entities configured for tracking
                    </div>
                </div>
            </div>

            <!-- Campaigns Grid -->
            <div v-if="showCampaignSection && domainCampaigns.length > 0" class="mb-12">
                <div class="mb-6">
                    <h3 class="text-2xl font-bold text-zinc-100 mb-2">Active Campaigns</h3>
                    <p class="text-zinc-400">
                        Current military operations and strategic campaigns
                    </p>
                </div>

                <!-- Direct campaigns rendering using SSR data -->
                <div
                    class="bg-gradient-to-r from-gray-900/40 via-gray-800/30 to-gray-900/40 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div v-for="campaign in domainCampaigns.slice(0, 4)" :key="campaign.campaign_id"
                            class="bg-gradient-to-br from-gray-900/40 to-gray-800/30 border border-gray-700/50 rounded-lg p-4 backdrop-blur-sm hover:bg-gray-800/40 transition-all duration-200 group">
                            <div class="flex flex-col h-full">
                                <!-- Header -->
                                <div class="campaign-header mb-3">
                                    <div class="flex justify-between items-start pb-2 border-b border-gray-700/50">
                                        <h4 class="font-semibold text-white text-sm truncate pr-2"
                                            :title="campaign.name">
                                            {{ campaign.name }}
                                        </h4>
                                        <UBadge :color="getCampaignStatusColor(campaign)" variant="subtle" size="xs">
                                            {{ getCampaignStatusLabel(campaign) }}
                                        </UBadge>
                                    </div>
                                </div>

                                <!-- Description -->
                                <div class="mb-3 flex-grow">
                                    <p v-if="campaign.description"
                                        class="text-xs text-zinc-400 line-clamp-2 leading-relaxed"
                                        :title="campaign.description">
                                        {{ campaign.description }}
                                    </p>
                                    <p v-else class="text-xs text-zinc-500 italic">No description available</p>
                                </div>

                                <!-- Stats -->
                                <div class="stats-section mb-3 p-2 bg-gray-800/40 rounded border border-gray-700/30">
                                    <div class="text-xs text-zinc-400 space-y-1">
                                        <div v-if="campaign.startTime" class="flex items-center">
                                            <svg class="w-3 h-3 mr-1 text-zinc-500" fill="currentColor"
                                                viewBox="0 0 20 20">
                                                <path fill-rule="evenodd"
                                                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                                                    clip-rule="evenodd" />
                                            </svg>
                                            <span>{{ formatCampaignDate(campaign.startTime) }}</span>
                                        </div>
                                        <div v-if="campaign.stats" class="flex justify-between items-center">
                                            <span class="flex items-center">
                                                <svg class="w-3 h-3 mr-1 text-zinc-500" fill="currentColor"
                                                    viewBox="0 0 20 20">
                                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {{ campaign.stats.total_kills || 0 }}
                                            </span>
                                            <span class="flex items-center">
                                                <svg class="w-3 h-3 mr-1 text-zinc-500" fill="currentColor"
                                                    viewBox="0 0 20 20">
                                                    <path
                                                        d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                                </svg>
                                                {{ campaign.stats.participants || 0 }}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Action Button -->
                                <div class="mt-auto">
                                    <NuxtLink :to="`/campaigns/${campaign.campaign_id}`"
                                        class="block w-full text-center px-3 py-2 text-xs font-medium text-zinc-300 bg-gray-700/40 hover:bg-gray-600/40 border border-gray-600/30 hover:border-gray-500/50 rounded transition-all duration-200 group-hover:text-white">
                                        View Campaign
                                    </NuxtLink>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Most Valuable Kills -->
            <div v-if="showMostValuableSection" class="mb-12">
                <div class="mb-6">
                    <h3 class="text-2xl font-bold text-zinc-100 mb-2">Most Valuable Kills</h3>
                    <p class="text-zinc-400">
                        Highest value killmails{{ selectedEntity ? ` for ${selectedEntity.label}` : '' }}
                        (Last {{ getTimeRangeLabel(selectedTimeRange) }})
                    </p>
                </div>
                <KillsMostValuable :items="stats?.mostValuableKills?.slice(0, 7) || []" :loading="statsLoading" />
            </div>

            <!-- Ship Statistics -->
            <div v-if="showShipAnalysisSection" class="mb-12">
                <div class="mb-6">
                    <h3 class="text-2xl font-bold text-zinc-100 mb-2">Ship Destruction Analysis</h3>
                    <p class="text-zinc-400">
                        Detailed breakdown of destroyed ship types{{ selectedEntity ? ` for ${selectedEntity.label}` :
                            '' }}
                        (Last {{ getTimeRangeLabel(selectedTimeRange) }})
                    </p>
                </div>
                <KillsShipStats :stats="stats || {}" :loading="statsLoading" />
            </div>

            <!-- Main Content: Killmails + Top Boxes -->
            <div class="grid grid-cols-1 gap-8" :class="showTopBoxesSection ? 'xl:grid-cols-5' : 'xl:grid-cols-1'">
                <!-- Left Side: Killmails List (80% - 4 columns) -->
                <div :class="showTopBoxesSection ? 'xl:col-span-4' : 'xl:col-span-1'">
                    <div class="mb-6">
                        <h3 class="text-2xl font-bold text-zinc-100 mb-2">Recent Activity</h3>
                        <p class="text-zinc-400">
                            Latest killmails and battle reports{{ selectedEntity ? ` for ${selectedEntity.label}` : ''
                            }}
                        </p>
                    </div>

                    <!-- Use the proper KillList component with domain-specific API -->
                    <KillList :killlistType="'latest'" :apiEndpoint="domainKillmailsEndpoint" :limit="100"
                        :wsDisabled="false" :wsFilter="'all'" :key="refreshKey" />
                </div>

                <!-- Right Side: Top Boxes (20% - 1 column) -->
                <div v-if="showTopBoxesSection" class="xl:col-span-1 space-y-6">
                    <!-- Top Killers by Character -->
                    <KillsTopBox title="Top Killers" :entities="stats?.topKillersByCharacter || []" countField="kills"
                        entityType="character" :loading="statsLoading" :days="getTimeRangeDays(selectedTimeRange)" />

                    <!-- Top Killers by Corporation -->
                    <KillsTopBox title="Top Corporations" :entities="stats?.topKillersByCorporation || []"
                        countField="kills" entityType="corporation" :loading="statsLoading"
                        :days="getTimeRangeDays(selectedTimeRange)" />

                    <!-- Top Killers by Alliance -->
                    <KillsTopBox title="Top Alliances" :entities="stats?.topKillersByAlliance || []" countField="kills"
                        entityType="alliance" :loading="statsLoading" :days="getTimeRangeDays(selectedTimeRange)" />
                </div>
            </div>
        </UContainer>
    </div>
</template>

<script setup lang="ts">
import { useDomainSettingsStore } from '~/stores/domainSettings';

const { t } = useI18n();
const {
    customDomain,
    domainContext,
    showHeroSection: contextShowHeroSection,
    showStatsSection: contextShowStatsSection,
    showTrackingOverview: contextShowTrackingOverview,
    showCampaignSection: contextShowCampaignSection,
    showMostValuableSection: contextShowMostValuableSection,
    showTopBoxesSection: contextShowTopBoxesSection,
    showShipAnalysisSection: contextShowShipAnalysisSection,
} = useDomainContext();

// Use the domain settings store
const domainStore = useDomainSettingsStore()

// Props for domain specification
interface Props {
    domain?: string;
    initialStats?: any;
    initialEntities?: any;
    initialCampaigns?: any;
}

const props = withDefaults(defineProps<Props>(), {
    domain: '',
    initialStats: null,
    initialEntities: [],
    initialCampaigns: []
});

// Reactive state
const selectedEntity = ref<any>(null);
const selectedTimeRange = ref('7d');

// Computed domain for API calls
const currentDomain = computed(() => props.domain || customDomain.value);

// Query parameters for stats API
const statsQueryParams = computed(() => ({
    timeRange: selectedTimeRange.value,
    ...(selectedEntity.value ? {
        entityType: selectedEntity.value.type,
        entityId: selectedEntity.value.id.toString()
    } : {})
}));

// Fetch key for stats (similar to KillList approach)
const statsFetchKey = computed(() => {
    return `domain-stats-${currentDomain.value}-${selectedTimeRange.value}-${selectedEntity.value?.type || 'all'}-${selectedEntity.value?.id || 'all'}`;
});

// Fetch domain stats using useFetch (like KillList)
const shouldFetchStats = computed(() => !!currentDomain.value);
const {
    data: stats,
    pending: statsLoading,
    error: statsError,
    refresh: refreshStats
} = await useFetch(
    () => shouldFetchStats.value ? `/api/domain/${currentDomain.value}/stats` : null,
    {
        key: statsFetchKey,
        query: statsQueryParams,
        server: false,
        lazy: true,
        default: () => ({})
    }
);

// Fetch domain entities using useFetch
const {
    data: domainEntitiesResponse,
    pending: entitiesLoading,
    error: entitiesError
} = await useFetch(
    () => currentDomain.value ? `/api/domain/${currentDomain.value}/entities` : null,
    {
        key: `domain-entities-${currentDomain.value}`,
        server: false,
        lazy: true,
        default: () => ({ success: false, entities: [] })
    }
);

// Computed domain entities
const domainEntitiesWithNames = computed(() => {
    if (domainEntitiesResponse.value?.success && domainEntitiesResponse.value?.entities) {
        return domainEntitiesResponse.value.entities;
    }
    return [];
});

// Fetch domain campaigns using useFetch
const {
    data: campaignsResponse,
    pending: campaignsLoading,
    error: campaignsError
} = await useFetch(
    () => currentDomain.value ? `/api/domain/${currentDomain.value}/campaigns` : null,
    {
        key: `domain-campaigns-${currentDomain.value}`,
        query: { limit: 10 },
        server: false,
        lazy: true,
        default: () => ({ campaigns: [] })
    }
);

// Computed domain campaigns
const domainCampaigns = computed(() => {
    if (campaignsResponse.value?.campaigns) {
        return campaignsResponse.value.campaigns;
    }
    return [];
});

// Time range options (matching kills page)
const timeRanges = [
    { label: '1d', value: '1d' },
    { label: '7d', value: '7d' },
    { label: '14d', value: '14d' },
    { label: '30d', value: '30d' }
];

// Key to force KillList refresh when filters change
const refreshKey = ref(0);

// Entity options from domain store
const entityOptions = computed(() => {
    const options = [{ label: 'All Entities', value: null }];

    for (const entityConfig of domainStore.entities) {
        if (entityConfig.show_in_nav) {
            options.push({
                label: entityConfig.display_name || `${entityConfig.entity_type} ${entityConfig.entity_id}`,
                value: {
                    type: entityConfig.entity_type,
                    id: entityConfig.entity_id
                }
            });
        }
    }

    return options;
});

// Domain branding and info from store
const domainTitle = computed(() => domainStore.domainTitle);

const domainDescription = computed(() => {
    const entityCount = domainStore.entities.length || 0;
    return `Multi-entity killboard tracking ${entityCount} entities`;
});

// Domain entities (use fetched data with names, fallback to store)
const domainEntities = computed(() => {
    if (domainEntitiesWithNames.value.length > 0) {
        return domainEntitiesWithNames.value;
    }
    return domainStore.entities || [];
});

// Welcome messages and custom content from store
const customWelcomeMessage = computed(() => domainStore.customWelcomeMessage);
const customSecondaryMessage = computed(() => domainStore.customSecondaryMessage);
const customCTAButtons = computed(() => domainStore.customCTAButtons);

const defaultWelcomeMessage = computed(() => {
    const entityCount = domainEntities.value.length;
    const entityTypes = [...new Set(domainEntities.value.map((e: any) => e.entity_type))];

    if (entityCount === 0) {
        return "Welcome to this EVE Online killboard. Track combat activity, analyze statistics, and monitor space battles.";
    }

    if (entityCount === 1) {
        const entity = domainEntities.value[0];
        return `Welcome to the official killboard for ${entity.display_name || `${entity.entity_type} ${entity.entity_id}`}. Monitor our combat operations and strategic achievements in New Eden.`;
    }

    return `Unified killboard tracking ${entityCount} ${entityTypes.join(', ')} entities. Monitor multi-entity operations, alliance coordination, and strategic combat statistics across New Eden.`;
});

// Entity stats for showcase
const entityStats = computed(() => {
    const statsMap: Record<string, any> = {};

    if (stats.value?.entityBreakdown) {
        for (const entityStat of stats.value.entityBreakdown) {
            statsMap[entityStat.entity_id] = {
                kills: entityStat.kills,
                value: entityStat.total_value,
                recent_activity: entityStat.last_activity &&
                    new Date(entityStat.last_activity) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24h
            };
        }
    }

    return statsMap;
});

// Feature toggles - prioritize store data (for editing) or fallback to context (for display)
const showHeroSection = computed(() => {
    // If store has data (user is editing or store is loaded), use store
    if (domainStore.currentDomain) {
        return domainStore.showHeroSection;
    }
    // Otherwise use context from SSR middleware
    return contextShowHeroSection.value;
});

const showStatsSection = computed(() => {
    if (domainStore.currentDomain) {
        return domainStore.showStatsSection;
    }
    return contextShowStatsSection.value;
});

const showTrackingOverview = computed(() => {
    if (domainStore.currentDomain) {
        return domainStore.showTrackingOverview;
    }
    return contextShowTrackingOverview.value;
});

const showCampaignSection = computed(() => {
    if (domainStore.currentDomain) {
        return domainStore.showCampaignSection;
    }
    return contextShowCampaignSection.value;
});

const showMostValuableSection = computed(() => {
    if (domainStore.currentDomain) {
        return domainStore.showMostValuableSection;
    }
    return contextShowMostValuableSection.value;
});

const showTopBoxesSection = computed(() => {
    if (domainStore.currentDomain) {
        return domainStore.showTopBoxesSection;
    }
    return contextShowTopBoxesSection.value;
});

const showShipAnalysisSection = computed(() => {
    if (domainStore.currentDomain) {
        return domainStore.showShipAnalysisSection;
    }
    return contextShowShipAnalysisSection.value;
});

const featuredCampaign = computed(() => {
    const featuredId = domainStore.features.featured_campaign_id;
    if (featuredId && domainCampaigns.value.length > 0) {
        return domainCampaigns.value.find(campaign => campaign.campaign_id === featuredId);
    }

    // Fallback to first active campaign if no featured campaign is set
    if (domainCampaigns.value.length > 0) {
        return domainCampaigns.value.find(campaign => campaign.status === 'active') || domainCampaigns.value[0];
    }

    return null;
});

// Statistics helpers
const topShipDestroyed = computed(() => {
    return stats.value?.shipGroupStats?.[0] || null;
});

// Format helpers
const numberFormat = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

const formatIsk = (value: number): string => {
    if (value >= 1e12) return (value / 1e12).toFixed(1) + 'T';
    if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
    return value.toFixed(0);
};

const formatISK = formatIsk; // Alias for consistency with template usage

// Welcome box content
const domainWelcome = computed(() => {
    const entities = domainContext.value?.config?.entities || [];
    if (entities.length === 0) return null;

    return {
        title: `Welcome to ${domainTitle.value}`,
        message: `This killboard tracks activity for ${entities.length} entities in EVE Online.`,
        entities: entities.slice(0, 5).map((entity: any) => ({
            type: entity.entity_type,
            id: entity.entity_id,
            name: entity.display_name || `${entity.entity_type} ${entity.entity_id}`
        }))
    };
});

// Domain killmails endpoint for KillList component
const domainKillmailsEndpoint = computed(() => {
    const domain = props.domain || customDomain.value;
    if (!domain) return '/api/killlist';

    const params = new URLSearchParams({
        timeRange: selectedTimeRange.value
    });

    if (selectedEntity.value) {
        params.append('entityType', selectedEntity.value.type);
        params.append('entityId', selectedEntity.value.id.toString());
    }

    return `/api/domain/${domain}/killmails?${params.toString()}`;
});

// Helper functions
const getTimeRangeLabel = (range: string) => {
    const option = timeRanges.find(t => t.value === range);
    return option?.label || range;
};

const getTimeRangeDays = (range: string) => {
    switch (range) {
        case '1d': return 1;
        case '7d': return 7;
        case '14d': return 14;
        case '30d': return 30;
        default: return 7;
    }
};

// Handle entity switching
const handleEntityChange = (newEntity: any) => {
    selectedEntity.value = newEntity;
    refreshData();
};

// Focus on specific entity (from entity showcase)
const focusOnEntity = (entity: any) => {
    const entityOption = {
        label: entity.display_name || `${entity.entity_type} ${entity.entity_id}`,
        value: {
            type: entity.entity_type,
            id: entity.entity_id
        }
    };
    handleEntityChange(entityOption.value);
};

// Campaign helpers
const campaignDuration = (campaign: any) => {
    if (!campaign.startTime) return 'TBD';

    const start = new Date(campaign.startTime);
    const end = campaign.endTime ? new Date(campaign.endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return 'Less than 1 day';
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
};

const formatCampaignDate = (date: string | Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const getCampaignStatusColor = (campaign: any): 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral' => {
    const status = getCampaignStatus(campaign);
    switch (status) {
        case 'active': return 'success';
        case 'upcoming': return 'info';
        case 'completed': return 'neutral';
        default: return 'neutral';
    }
};

const getCampaignStatusLabel = (campaign: any): string => {
    const status = getCampaignStatus(campaign);
    switch (status) {
        case 'active': return 'Active';
        case 'upcoming': return 'Upcoming';
        case 'completed': return 'Completed';
        default: return 'Inactive';
    }
};

const getCampaignStatus = (campaign: any): string => {
    // Use the status from the API if available
    if (campaign.status) return campaign.status;

    // Calculate status from dates
    const now = new Date();
    const start = new Date(campaign.startTime);
    const end = campaign.endTime ? new Date(campaign.endTime) : null;

    if (start > now) return 'upcoming';
    if (end && end < now) return 'completed';
    return 'active';
};

// Refresh all data using useFetch refresh methods
const refreshData = async () => {
    // Refresh stats using useFetch's built-in refresh
    await refreshStats();
    // Force KillList refresh by updating key
    refreshKey.value++;
};

// Watch for time range changes
watch(selectedTimeRange, () => {
    refreshData();
});

// SEO
useSeoMeta({
    title: domainTitle,
    description: domainDescription,
});

</script>

<style scoped>
.custom-select {
    background-image: none;
}

.custom-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}
</style>
