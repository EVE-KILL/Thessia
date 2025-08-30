<template>
    <div class="admin-domains">
        <div class="domains-header">
            <div class="header-info">
                <h3 class="domains-title">{{ t('admin.domains.title') }}</h3>
                <p class="domains-description">{{ t('admin.domains.description') }}</p>
            </div>
            <div class="header-actions">
                <button @click="() => refreshData()" class="action-btn refresh-btn" :disabled="pending">
                    <Icon name="heroicons:arrow-path" class="action-icon" :class="{ 'animate-spin': pending }" />
                    {{ t('admin.domains.refresh') }}
                </button>
            </div>
        </div>

        <!-- Filters and Search -->
        <div class="filters-section">
            <div class="search-container">
                <Icon name="heroicons:magnifying-glass" class="search-icon" />
                <input v-model="searchQuery" type="text" :placeholder="t('admin.domains.search')"
                    class="search-input" />
                <button v-if="searchQuery" @click="clearSearch" class="search-clear-btn"
                    :title="t('admin.domains.clearSearch')">
                    <Icon name="heroicons:x-mark" class="clear-icon" />
                </button>
            </div>

            <div class="filters-row">
                <div class="filter-group">
                    <select v-model="statusFilter" class="filter-select">
                        <option value="all">{{ t('admin.domains.allStatuses') }}</option>
                        <option value="pending">{{ t('admin.domains.pending') }}</option>
                        <option value="verified">{{ t('admin.domains.verified') }}</option>
                        <option value="suspended">{{ t('admin.domains.suspended') }}</option>
                    </select>
                </div>
                <div class="filter-group">
                    <select v-model="entityTypeFilter" class="filter-select">
                        <option value="all">{{ t('admin.domains.allEntityTypes') }}</option>
                        <option value="character">{{ t('admin.domains.character') }}</option>
                        <option value="corporation">{{ t('admin.domains.corporation') }}</option>
                        <option value="alliance">{{ t('admin.domains.alliance') }}</option>
                    </select>
                </div>
                <select v-model="pageSize" class="page-size-select" :aria-label="'Items per page'"
                    @change="handlePageSizeChange">
                    <option value="10">10 {{ t('admin.domains.perPage') }}</option>
                    <option value="25">25 {{ t('admin.domains.perPage') }}</option>
                    <option value="50">50 {{ t('admin.domains.perPage') }}</option>
                    <option value="100">100 {{ t('admin.domains.perPage') }}</option>
                </select>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="pending" class="loading-container">
            <div class="loading-content">
                <Icon name="heroicons:arrow-path" class="loading-icon animate-spin" />
                <p class="loading-text">{{ t('admin.domains.loading') }}</p>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-container">
            <div class="error-content">
                <Icon name="heroicons:exclamation-triangle" class="error-icon" />
                <p class="error-text">{{ t('admin.domains.error') }}</p>
                <button @click="() => refreshData()" class="error-retry">
                    {{ t('admin.domains.retry') }}
                </button>
            </div>
        </div>

        <!-- Content -->
        <div v-else-if="data?.domains && data.domains.length > 0" class="domains-content">
            <!-- Statistics Cards -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon-container verified">
                        <Icon name="heroicons:check-circle" class="stat-icon" />
                    </div>
                    <div class="stat-info">
                        <div class="stat-label">{{ t('admin.domains.verifiedDomains') }}</div>
                        <div class="stat-value">{{ data.stats.verified }}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon-container pending">
                        <Icon name="heroicons:clock" class="stat-icon" />
                    </div>
                    <div class="stat-info">
                        <div class="stat-label">{{ t('admin.domains.pendingDomains') }}</div>
                        <div class="stat-value">{{ data.stats.pending }}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon-container failed">
                        <Icon name="heroicons:exclamation-triangle" class="stat-icon" />
                    </div>
                    <div class="stat-info">
                        <div class="stat-label">{{ t('admin.domains.suspendedDomains') }}</div>
                        <div class="stat-value">{{ data.stats.suspended || 0 }}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon-container total">
                        <Icon name="heroicons:globe-alt" class="stat-icon" />
                    </div>
                    <div class="stat-info">
                        <div class="stat-label">{{ t('admin.domains.totalDomains') }}</div>
                        <div class="stat-value">{{ data.stats.total }}</div>
                    </div>
                </div>
            </div>

            <!-- Domains List -->
            <div class="domains-list">
                <div v-for="domain in data.domains" :key="domain._id" class="domain-card">
                    <!-- Domain Title -->
                    <div class="domain-title-section">
                        <div class="domain-name-header">
                            <Icon name="heroicons:globe-alt" class="domain-icon" />
                            <h4 class="domain-title"><a target="_blank" :href="'https://' + domain.domain">{{
                                    domain.domain }}</a></h4>
                        </div>
                        <StatusBadge :status="mapDomainStatus(domain.status)" class="domain-status" />
                    </div>

                    <!-- Action Buttons -->
                    <div class="domain-actions-row">
                        <button @click="viewDomainDetails(domain)" class="action-btn-slim view-btn">
                            <Icon name="heroicons:eye" class="action-btn-icon" />
                            View
                        </button>
                        <button @click="toggleDomainStatus(domain)" class="action-btn-slim status-btn"
                            :class="{ 'active': domain.status === 'verified' }">
                            <Icon :name="domain.status === 'verified' ? 'heroicons:pause' : 'heroicons:play'"
                                class="action-btn-icon" />
                            {{ domain.status === 'verified' ? 'Suspend' : 'Activate' }}
                        </button>
                        <button @click="activateAndVerifyDomain(domain)" class="action-btn-slim verify-btn"
                            :disabled="domain.status === 'verified'"
                            :title="domain.status === 'verified' ? 'Already verified' : 'Activate and verify domain'">
                            <Icon name="heroicons:shield-check" class="action-btn-icon" />
                            Verify
                        </button>
                        <button @click="deleteDomain(domain)" class="action-btn-slim delete-btn">
                            <Icon name="heroicons:trash" class="action-btn-icon" />
                            Delete
                        </button>
                    </div>

                    <!-- Domain Info -->
                    <div class="domain-info-section">
                        <div class="domain-info-row">
                            <div class="domain-info-item">
                                <Icon name="heroicons:user" class="info-icon" />
                                <span class="info-label">Owner:</span>
                                <NuxtLink :to="`/character/${domain.owner_character_id}`" class="info-link">
                                    {{ domain.owner_character_name }}
                                </NuxtLink>
                            </div>
                            <div class="domain-info-item">
                                <Icon name="heroicons:calendar" class="info-icon" />
                                <span class="info-label">Created:</span>
                                <span class="info-value">{{ formatDateRelative(domain.created_at) }}</span>
                            </div>
                        </div>

                        <!-- Entities List -->
                        <div v-if="domain.entities?.length" class="domain-entities-section">
                            <div class="entities-header">
                                <Icon name="heroicons:building-office-2" class="info-icon" />
                                <span class="info-label">Entities ({{ domain.entities.length }}):</span>
                            </div>
                            <div class="entities-compact-list">
                                <NuxtLink v-for="entity in domain.entities.slice(0, 3)"
                                    :key="`${entity.entity_type}-${entity.entity_id}`" :to="getEntityLink(entity)"
                                    class="entity-compact-link">
                                    <span class="entity-type-badge">{{ getEntityTypeAbbr(entity.entity_type) }}</span>
                                    <span class="entity-compact-name">
                                        {{ entity.entity_name || `${formatEntityType(entity.entity_type)}
                                        ${entity.entity_id}` }}
                                    </span>
                                </NuxtLink>
                                <span v-if="domain.entities.length > 3" class="entities-more">
                                    +{{ domain.entities.length - 3 }} more
                                </span>
                            </div>
                        </div>
                        <div v-else class="no-entities">
                            <Icon name="heroicons:exclamation-triangle" class="info-icon warning" />
                            <span class="no-entities-text">No entities configured</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-container">
            <div class="empty-content">
                <Icon name="heroicons:globe-alt" class="empty-icon" />
                <h4 class="empty-title">{{ t('admin.domains.empty') }}</h4>
                <p class="empty-description">{{ t('admin.domains.noDomainsFound') }}</p>
            </div>
        </div>

        <!-- Pagination -->
        <div v-if="data?.pagination && data.pagination.totalPages > 1" class="pagination-container">
            <button @click="changePage(1)" :disabled="!data.pagination.hasPrevPage" class="pagination-btn">
                {{ t('admin.domains.pagination.first') }}
            </button>
            <button @click="changePage(data.pagination.currentPage - 1)" :disabled="!data.pagination.hasPrevPage"
                class="pagination-btn">
                {{ t('admin.domains.pagination.previous') }}
            </button>

            <span class="pagination-info">
                {{ t('admin.domains.pagination.page', {
                    current: data.pagination.currentPage,
                    total: data.pagination.totalPages
                }) }}
            </span>

            <button @click="changePage(data.pagination.currentPage + 1)" :disabled="!data.pagination.hasNextPage"
                class="pagination-btn">
                {{ t('admin.domains.pagination.next') }}
            </button>
            <button @click="changePage(data.pagination.totalPages)" :disabled="!data.pagination.hasNextPage"
                class="pagination-btn">
                {{ t('admin.domains.pagination.last') }}
            </button>
        </div>

        <!-- Domain Details Modal - Enhanced Version -->
        <Modal v-if="selectedDomain" :is-open="showDetailsModal" @close="closeDetailsModal"
            :title="`${t('admin.domains.details.title')} - ${selectedDomain.domain}`" size="xl">
            <div class="domain-details-modal">
                <!-- Quick Stats Header -->
                <div class="modal-stats-header">
                    <div class="modal-stat-item">
                        <Icon name="heroicons:globe-alt" class="modal-stat-icon" />
                        <div class="modal-stat-content">
                            <span class="modal-stat-label">Domain</span>
                            <span class="modal-stat-value">{{ selectedDomain.domain }}</span>
                        </div>
                    </div>
                    <div class="modal-stat-item">
                        <StatusBadge :status="mapDomainStatus(selectedDomain.status)" />
                    </div>
                    <div class="modal-stat-item">
                        <Icon name="heroicons:calendar-days" class="modal-stat-icon" />
                        <div class="modal-stat-content">
                            <span class="modal-stat-label">Created</span>
                            <span class="modal-stat-value">{{ formatDateRelative(selectedDomain.created_at) }}</span>
                        </div>
                    </div>
                    <div v-if="selectedDomain.last_accessed" class="modal-stat-item">
                        <Icon name="heroicons:eye" class="modal-stat-icon" />
                        <div class="modal-stat-content">
                            <span class="modal-stat-label">Last Visit</span>
                            <span class="modal-stat-value">{{ formatDateRelative(selectedDomain.last_accessed) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Tabs Navigation -->
                <div class="modal-tabs">
                    <button @click="activeTab = 'overview'"
                        :class="['tab-button', { active: activeTab === 'overview' }]">
                        <Icon name="heroicons:information-circle" class="tab-icon" />
                        Overview
                    </button>
                    <button @click="activeTab = 'entities'"
                        :class="['tab-button', { active: activeTab === 'entities' }]">
                        <Icon name="heroicons:building-office-2" class="tab-icon" />
                        Entities ({{ selectedDomain.entities?.length || 0 }})
                    </button>
                    <button @click="activeTab = 'branding'"
                        :class="['tab-button', { active: activeTab === 'branding' }]">
                        <Icon name="heroicons:swatch" class="tab-icon" />
                        Branding
                    </button>
                    <button @click="activeTab = 'navigation'"
                        :class="['tab-button', { active: activeTab === 'navigation' }]">
                        <Icon name="heroicons:bars-3" class="tab-icon" />
                        Navigation
                    </button>
                    <button @click="activeTab = 'features'"
                        :class="['tab-button', { active: activeTab === 'features' }]">
                        <Icon name="heroicons:cog-6-tooth" class="tab-icon" />
                        Features
                    </button>
                    <button @click="activeTab = 'security'"
                        :class="['tab-button', { active: activeTab === 'security' }]">
                        <Icon name="heroicons:shield-check" class="tab-icon" />
                        Security
                    </button>
                </div>

                <!-- Tab Content -->
                <div class="tab-content">
                    <!-- Overview Tab -->
                    <div v-if="activeTab === 'overview'" class="tab-panel">
                        <div class="overview-grid">
                            <div class="overview-card">
                                <h4 class="overview-card-title">
                                    <Icon name="heroicons:user-circle" class="overview-card-icon" />
                                    Owner Information
                                </h4>
                                <div class="overview-card-content">
                                    <div class="info-row">
                                        <span class="info-label">Character:</span>
                                        <NuxtLink :to="`/character/${selectedDomain.owner_character_id}`"
                                            class="info-link">
                                            {{ selectedDomain.owner_character_name }}
                                        </NuxtLink>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Character ID:</span>
                                        <span class="info-value">{{ selectedDomain.owner_character_id }}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="overview-card">
                                <h4 class="overview-card-title">
                                    <Icon name="heroicons:clock" class="overview-card-icon" />
                                    Timeline
                                </h4>
                                <div class="overview-card-content">
                                    <div class="info-row">
                                        <span class="info-label">Created:</span>
                                        <span class="info-value">{{ formatDate(selectedDomain.created_at) }}</span>
                                    </div>
                                    <div v-if="selectedDomain.verified_at" class="info-row">
                                        <span class="info-label">Verified:</span>
                                        <span class="info-value">{{ formatDate(selectedDomain.verified_at) }}</span>
                                    </div>
                                    <div v-if="selectedDomain.last_accessed" class="info-row">
                                        <span class="info-label">Last Access:</span>
                                        <span class="info-value">{{ formatDate(selectedDomain.last_accessed) }}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="overview-card">
                                <h4 class="overview-card-title">
                                    <Icon name="heroicons:chart-bar" class="overview-card-icon" />
                                    Quick Stats
                                </h4>
                                <div class="overview-card-content">
                                    <div class="info-row">
                                        <span class="info-label">Entities:</span>
                                        <span class="info-value">{{ selectedDomain.entities?.length || 0 }}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">SSL Enabled:</span>
                                        <span class="info-badge" :class="{ active: selectedDomain.ssl_enabled }">
                                            {{ selectedDomain.ssl_enabled ? 'Yes' : 'No' }}
                                        </span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Public Campaigns:</span>
                                        <span class="info-badge" :class="{ active: selectedDomain.public_campaigns }">
                                            {{ selectedDomain.public_campaigns ? 'Enabled' : 'Disabled' }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div class="overview-card">
                                <h4 class="overview-card-title">
                                    <Icon name="heroicons:puzzle-piece" class="overview-card-icon" />
                                    Features Summary
                                </h4>
                                <div class="overview-card-content">
                                    <div class="feature-summary-grid">
                                        <div class="feature-summary-item"
                                            :class="{ active: hasBrandingFeatures(selectedDomain) }">
                                            <Icon name="heroicons:swatch" class="feature-summary-icon" />
                                            <span>Custom Branding</span>
                                        </div>
                                        <div class="feature-summary-item"
                                            :class="{ active: hasNavigationFeatures(selectedDomain) }">
                                            <Icon name="heroicons:bars-3" class="feature-summary-icon" />
                                            <span>Custom Navigation</span>
                                        </div>
                                        <div class="feature-summary-item"
                                            :class="{ active: hasPageConfigFeatures(selectedDomain) }">
                                            <Icon name="heroicons:cog-6-tooth" class="feature-summary-icon" />
                                            <span>Page Configuration</span>
                                        </div>
                                        <div class="feature-summary-item"
                                            :class="{ active: selectedDomain.ssl_enabled }">
                                            <Icon name="heroicons:lock-closed" class="feature-summary-icon" />
                                            <span>SSL/TLS</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Entities Tab -->
                    <div v-if="activeTab === 'entities'" class="tab-panel">
                        <div v-if="selectedDomain.entities?.length" class="entities-section">
                            <div class="entities-stats">
                                <div class="entity-type-stats">
                                    <div class="entity-type-stat">
                                        <Icon name="heroicons:user" class="entity-type-icon character" />
                                        <span class="entity-type-count">{{ getEntityCountByType('character') }}</span>
                                        <span class="entity-type-label">Characters</span>
                                    </div>
                                    <div class="entity-type-stat">
                                        <Icon name="heroicons:building-office" class="entity-type-icon corporation" />
                                        <span class="entity-type-count">{{ getEntityCountByType('corporation') }}</span>
                                        <span class="entity-type-label">Corporations</span>
                                    </div>
                                    <div class="entity-type-stat">
                                        <Icon name="heroicons:building-office-2" class="entity-type-icon alliance" />
                                        <span class="entity-type-count">{{ getEntityCountByType('alliance') }}</span>
                                        <span class="entity-type-label">Alliances</span>
                                    </div>
                                </div>
                            </div>

                            <div class="entities-grid">
                                <div v-for="entity in selectedDomain.entities"
                                    :key="`${entity.entity_type}-${entity.entity_id}`" class="entity-detail-card">
                                    <div class="entity-card-header">
                                        <div class="entity-card-icon-container" :class="entity.entity_type">
                                            <Icon :name="getEntityIcon(entity.entity_type)" class="entity-card-icon" />
                                        </div>
                                        <div class="entity-card-info">
                                            <h5 class="entity-card-name">
                                                {{ entity.entity_name || `${formatEntityType(entity.entity_type)}
                                                ${entity.entity_id}` }}
                                            </h5>
                                            <span class="entity-card-type">{{ formatEntityType(entity.entity_type)
                                            }}</span>
                                            <span class="entity-card-id">ID: {{ entity.entity_id }}</span>
                                        </div>
                                    </div>

                                    <div class="entity-card-features">
                                        <div class="entity-feature" :class="{ active: entity.primary }">
                                            <Icon name="heroicons:star" class="entity-feature-icon" />
                                            <span>Primary Entity</span>
                                        </div>
                                        <div class="entity-feature" :class="{ active: entity.show_in_nav }">
                                            <Icon name="heroicons:bars-3" class="entity-feature-icon" />
                                            <span>Show in Navigation</span>
                                        </div>
                                        <div class="entity-feature" :class="{ active: entity.show_in_stats }">
                                            <Icon name="heroicons:chart-bar" class="entity-feature-icon" />
                                            <span>Include in Statistics</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-else class="empty-state">
                            <Icon name="heroicons:building-office-2" class="empty-icon" />
                            <h4 class="empty-title">No Entities</h4>
                            <p class="empty-description">This domain has no associated entities configured.</p>
                        </div>
                    </div>

                    <!-- Branding Tab -->
                    <div v-if="activeTab === 'branding'" class="tab-panel">
                        <div v-if="selectedDomain.branding && hasBrandingFeatures(selectedDomain)"
                            class="branding-section">
                            <!-- Color Scheme -->
                            <div v-if="selectedDomain.branding.primary_color || selectedDomain.branding.secondary_color || selectedDomain.branding.accent_color"
                                class="branding-card">
                                <h4 class="branding-card-title">
                                    <Icon name="heroicons:color-swatch" class="branding-card-icon" />
                                    Color Scheme
                                </h4>
                                <div class="color-scheme-grid">
                                    <div v-if="selectedDomain.branding.primary_color" class="color-scheme-item">
                                        <div class="color-scheme-swatch"
                                            :style="{ backgroundColor: selectedDomain.branding.primary_color }"></div>
                                        <div class="color-scheme-info">
                                            <span class="color-scheme-label">Primary</span>
                                            <code
                                                class="color-scheme-value">{{ selectedDomain.branding.primary_color }}</code>
                                        </div>
                                    </div>
                                    <div v-if="selectedDomain.branding.secondary_color" class="color-scheme-item">
                                        <div class="color-scheme-swatch"
                                            :style="{ backgroundColor: selectedDomain.branding.secondary_color }"></div>
                                        <div class="color-scheme-info">
                                            <span class="color-scheme-label">Secondary</span>
                                            <code
                                                class="color-scheme-value">{{ selectedDomain.branding.secondary_color }}</code>
                                        </div>
                                    </div>
                                    <div v-if="selectedDomain.branding.accent_color" class="color-scheme-item">
                                        <div class="color-scheme-swatch"
                                            :style="{ backgroundColor: selectedDomain.branding.accent_color }"></div>
                                        <div class="color-scheme-info">
                                            <span class="color-scheme-label">Accent</span>
                                            <code
                                                class="color-scheme-value">{{ selectedDomain.branding.accent_color }}</code>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Visual Assets -->
                            <div v-if="selectedDomain.branding.logo_url || selectedDomain.branding.banner_image_url || selectedDomain.branding.background_image_url"
                                class="branding-card">
                                <h4 class="branding-card-title">
                                    <Icon name="heroicons:photo" class="branding-card-icon" />
                                    Visual Assets
                                </h4>
                                <div class="visual-assets-grid">
                                    <div v-if="selectedDomain.branding.logo_url" class="visual-asset-item">
                                        <div class="visual-asset-preview logo">
                                            <img :src="selectedDomain.branding.logo_url" alt="Logo" />
                                        </div>
                                        <div class="visual-asset-info">
                                            <span class="visual-asset-label">Logo</span>
                                            <span class="visual-asset-url">{{
                                                getTruncatedUrl(selectedDomain.branding.logo_url) }}</span>
                                        </div>
                                    </div>
                                    <div v-if="selectedDomain.branding.banner_image_url" class="visual-asset-item">
                                        <div class="visual-asset-preview banner">
                                            <img :src="selectedDomain.branding.banner_image_url" alt="Banner" />
                                        </div>
                                        <div class="visual-asset-info">
                                            <span class="visual-asset-label">Banner</span>
                                            <span class="visual-asset-url">{{
                                                getTruncatedUrl(selectedDomain.branding.banner_image_url) }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Typography & Theme -->
                            <div v-if="selectedDomain.branding.font_family || selectedDomain.branding.theme_mode"
                                class="branding-card">
                                <h4 class="branding-card-title">
                                    <Icon name="heroicons:document-text" class="branding-card-icon" />
                                    Typography & Theme
                                </h4>
                                <div class="typography-grid">
                                    <div v-if="selectedDomain.branding.font_family" class="typography-item">
                                        <span class="typography-label">Font Family:</span>
                                        <span class="typography-value font-family"
                                            :style="{ fontFamily: selectedDomain.branding.font_family }">
                                            {{ selectedDomain.branding.font_family }}
                                        </span>
                                    </div>
                                    <div v-if="selectedDomain.branding.font_size_base" class="typography-item">
                                        <span class="typography-label">Base Font Size:</span>
                                        <span class="typography-value">{{ selectedDomain.branding.font_size_base
                                        }}px</span>
                                    </div>
                                    <div v-if="selectedDomain.branding.theme_mode" class="typography-item">
                                        <span class="typography-label">Theme Mode:</span>
                                        <span class="theme-mode-badge" :class="selectedDomain.branding.theme_mode">
                                            <Icon :name="getThemeIcon(selectedDomain.branding.theme_mode)"
                                                class="theme-mode-icon" />
                                            {{ selectedDomain.branding.theme_mode }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Custom CSS -->
                            <div v-if="selectedDomain.branding.custom_css" class="branding-card">
                                <h4 class="branding-card-title">
                                    <Icon name="heroicons:code-bracket" class="branding-card-icon" />
                                    Custom CSS
                                </h4>
                                <div class="css-preview-container">
                                    <pre
                                        class="css-preview-code"><code>{{ selectedDomain.branding.custom_css }}</code></pre>
                                    <div class="css-stats">
                                        <span class="css-stat">{{ selectedDomain.branding.custom_css.split('\n').length
                                        }} lines</span>
                                        <span class="css-stat">{{ selectedDomain.branding.custom_css.length }}
                                            characters</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-else class="empty-state">
                            <Icon name="heroicons:swatch" class="empty-icon" />
                            <h4 class="empty-title">No Custom Branding</h4>
                            <p class="empty-description">This domain is using the default branding settings.</p>
                        </div>
                    </div>

                    <!-- Navigation Tab -->
                    <div v-if="activeTab === 'navigation'" class="tab-panel">
                        <div v-if="selectedDomain.navigation && hasNavigationFeatures(selectedDomain)"
                            class="navigation-section">
                            <div class="navigation-overview-grid">
                                <div class="navigation-card">
                                    <h4 class="navigation-card-title">
                                        <Icon name="heroicons:cog-6-tooth" class="navigation-card-icon" />
                                        Navigation Settings
                                    </h4>
                                    <div class="navigation-settings">
                                        <div class="navigation-setting">
                                            <span class="setting-label">Style:</span>
                                            <span class="setting-badge nav-style">{{ selectedDomain.navigation.nav_style
                                                || 'Default' }}</span>
                                        </div>
                                        <div class="navigation-setting">
                                            <span class="setting-label">Position:</span>
                                            <span class="setting-value">{{ selectedDomain.navigation.nav_position ||
                                                'Default' }}</span>
                                        </div>
                                        <div class="navigation-setting">
                                            <span class="setting-label">Show Search:</span>
                                            <span class="setting-toggle"
                                                :class="{ active: selectedDomain.navigation.show_search }">
                                                {{ selectedDomain.navigation.show_search ? 'Enabled' : 'Disabled' }}
                                            </span>
                                        </div>
                                        <div class="navigation-setting">
                                            <span class="setting-label">Sticky Navigation:</span>
                                            <span class="setting-toggle"
                                                :class="{ active: selectedDomain.navigation.sticky }">
                                                {{ selectedDomain.navigation.sticky ? 'Enabled' : 'Disabled' }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Custom Links -->
                            <div v-if="selectedDomain.navigation.custom_links?.length" class="navigation-card">
                                <h4 class="navigation-card-title">
                                    <Icon name="heroicons:link" class="navigation-card-icon" />
                                    Custom Links ({{ selectedDomain.navigation.custom_links.length }})
                                </h4>
                                <div class="custom-links-container">
                                    <div v-for="link in selectedDomain.navigation.custom_links" :key="link.position"
                                        class="custom-link-card">
                                        <div class="custom-link-header">
                                            <div class="custom-link-icon-container">
                                                <Icon :name="link.icon || 'heroicons:link'" class="custom-link-icon" />
                                            </div>
                                            <div class="custom-link-content">
                                                <div class="custom-link-title">
                                                    {{ link.label }}
                                                    <Icon v-if="link.external"
                                                        name="heroicons:arrow-top-right-on-square"
                                                        class="external-link-icon" />
                                                </div>
                                                <div class="custom-link-url">{{ link.url }}</div>
                                            </div>
                                            <div class="custom-link-badges">
                                                <span class="access-level-badge" :class="link.access_level">
                                                    {{ link.access_level }}
                                                </span>
                                                <span class="position-badge">{{ link.position }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-else class="empty-state">
                            <Icon name="heroicons:bars-3" class="empty-icon" />
                            <h4 class="empty-title">Default Navigation</h4>
                            <p class="empty-description">This domain is using the default navigation configuration.</p>
                        </div>
                    </div>

                    <!-- Features Tab -->
                    <div v-if="activeTab === 'features'" class="tab-panel">
                        <div class="features-grid">
                            <div class="feature-card" :class="{ enabled: selectedDomain.ssl_enabled }">
                                <div class="feature-icon-container">
                                    <Icon name="heroicons:lock-closed" class="feature-icon" />
                                </div>
                                <div class="feature-content">
                                    <h4 class="feature-title">SSL/TLS Encryption</h4>
                                    <p class="feature-description">Secure HTTPS connections for enhanced security</p>
                                    <div class="feature-status">
                                        <span class="feature-status-badge"
                                            :class="{ enabled: selectedDomain.ssl_enabled }">
                                            {{ selectedDomain.ssl_enabled ? 'Enabled' : 'Disabled' }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div class="feature-card" :class="{ enabled: selectedDomain.public_campaigns }">
                                <div class="feature-icon-container">
                                    <Icon name="heroicons:flag" class="feature-icon" />
                                </div>
                                <div class="feature-content">
                                    <h4 class="feature-title">Public Campaigns</h4>
                                    <p class="feature-description">Allow public access to campaign information</p>
                                    <div class="feature-status">
                                        <span class="feature-status-badge"
                                            :class="{ enabled: selectedDomain.public_campaigns }">
                                            {{ selectedDomain.public_campaigns ? 'Enabled' : 'Disabled' }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div class="feature-card" :class="{ enabled: hasBrandingFeatures(selectedDomain) }">
                                <div class="feature-icon-container">
                                    <Icon name="heroicons:swatch" class="feature-icon" />
                                </div>
                                <div class="feature-content">
                                    <h4 class="feature-title">Custom Branding</h4>
                                    <p class="feature-description">Personalized colors, fonts, and visual assets</p>
                                    <div class="feature-status">
                                        <span class="feature-status-badge"
                                            :class="{ enabled: hasBrandingFeatures(selectedDomain) }">
                                            {{ hasBrandingFeatures(selectedDomain) ? 'Configured' : 'Default' }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div class="feature-card" :class="{ enabled: hasNavigationFeatures(selectedDomain) }">
                                <div class="feature-icon-container">
                                    <Icon name="heroicons:bars-3" class="feature-icon" />
                                </div>
                                <div class="feature-content">
                                    <h4 class="feature-title">Custom Navigation</h4>
                                    <p class="feature-description">Personalized navigation structure and links</p>
                                    <div class="feature-status">
                                        <span class="feature-status-badge"
                                            :class="{ enabled: hasNavigationFeatures(selectedDomain) }">
                                            {{ hasNavigationFeatures(selectedDomain) ? 'Configured' : 'Default' }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div class="feature-card" :class="{ enabled: hasPageConfigFeatures(selectedDomain) }">
                                <div class="feature-icon-container">
                                    <Icon name="heroicons:cog-6-tooth" class="feature-icon" />
                                </div>
                                <div class="feature-content">
                                    <h4 class="feature-title">Page Configuration</h4>
                                    <p class="feature-description">Custom page layouts and component settings</p>
                                    <div class="feature-status">
                                        <span class="feature-status-badge"
                                            :class="{ enabled: hasPageConfigFeatures(selectedDomain) }">
                                            {{ hasPageConfigFeatures(selectedDomain) ? 'Configured' : 'Default' }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div class="feature-card" :class="{ enabled: selectedDomain.dns_verified_at }">
                                <div class="feature-icon-container">
                                    <Icon name="heroicons:check-badge" class="feature-icon" />
                                </div>
                                <div class="feature-content">
                                    <h4 class="feature-title">DNS Verification</h4>
                                    <p class="feature-description">Domain ownership verification via DNS records</p>
                                    <div class="feature-status">
                                        <span class="feature-status-badge"
                                            :class="{ enabled: selectedDomain.dns_verified_at }">
                                            {{ selectedDomain.dns_verified_at ? 'Verified' : 'Pending' }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Security Tab -->
                    <div v-if="activeTab === 'security'" class="tab-panel">
                        <div class="security-section">
                            <div class="security-overview">
                                <div class="security-score">
                                    <div class="security-score-circle" :class="getSecurityScoreClass()">
                                        <span class="security-score-value">{{ calculateSecurityScore() }}/5</span>
                                    </div>
                                    <h4 class="security-score-title">Security Score</h4>
                                    <p class="security-score-description">Based on configured security features</p>
                                </div>
                            </div>

                            <div class="security-checklist">
                                <h4 class="security-section-title">Security Checklist</h4>
                                <div class="security-items">
                                    <div class="security-item"
                                        :class="{ passed: selectedDomain.status === 'verified' }">
                                        <Icon
                                            :name="selectedDomain.status === 'verified' ? 'heroicons:check-circle' : 'heroicons:x-circle'"
                                            class="security-item-icon" />
                                        <div class="security-item-content">
                                            <span class="security-item-title">Domain Verification</span>
                                            <span class="security-item-description">Domain ownership has been
                                                verified</span>
                                        </div>
                                    </div>

                                    <div class="security-item" :class="{ passed: selectedDomain.ssl_enabled }">
                                        <Icon
                                            :name="selectedDomain.ssl_enabled ? 'heroicons:check-circle' : 'heroicons:x-circle'"
                                            class="security-item-icon" />
                                        <div class="security-item-content">
                                            <span class="security-item-title">SSL/TLS Encryption</span>
                                            <span class="security-item-description">HTTPS connections are
                                                enforced</span>
                                        </div>
                                    </div>

                                    <div class="security-item" :class="{ passed: selectedDomain.dns_verified_at }">
                                        <Icon
                                            :name="selectedDomain.dns_verified_at ? 'heroicons:check-circle' : 'heroicons:x-circle'"
                                            class="security-item-icon" />
                                        <div class="security-item-content">
                                            <span class="security-item-title">DNS Verification</span>
                                            <span class="security-item-description">DNS records have been
                                                validated</span>
                                        </div>
                                    </div>

                                    <div class="security-item" :class="{ passed: !selectedDomain.suspended }">
                                        <Icon
                                            :name="!selectedDomain.suspended ? 'heroicons:check-circle' : 'heroicons:x-circle'"
                                            class="security-item-icon" />
                                        <div class="security-item-content">
                                            <span class="security-item-title">Account Status</span>
                                            <span class="security-item-description">Domain is active and not
                                                suspended</span>
                                        </div>
                                    </div>

                                    <div class="security-item" :class="{ passed: isRecentlyAccessed() }">
                                        <Icon
                                            :name="isRecentlyAccessed() ? 'heroicons:check-circle' : 'heroicons:x-circle'"
                                            class="security-item-icon" />
                                        <div class="security-item-content">
                                            <span class="security-item-title">Recent Activity</span>
                                            <span class="security-item-description">Domain has been accessed
                                                recently</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="security-details">
                                <h4 class="security-section-title">Verification Details</h4>
                                <div class="verification-info-grid">
                                    <div class="verification-item">
                                        <span class="verification-label">Verification Method:</span>
                                        <span class="verification-value">{{ selectedDomain.verification_method || 'None'
                                        }}</span>
                                    </div>
                                    <div class="verification-item">
                                        <span class="verification-label">Verification Token:</span>
                                        <code
                                            class="verification-token-display">{{ selectedDomain.verification_token }}</code>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <div class="modal-footer-actions">
                    <button @click="toggleDomainStatus(selectedDomain)" class="btn"
                        :class="selectedDomain.status === 'verified' ? 'btn-warning' : 'btn-success'">
                        <Icon :name="selectedDomain.status === 'verified' ? 'heroicons:pause' : 'heroicons:play'"
                            class="btn-icon" />
                        {{ selectedDomain.status === 'verified' ? 'Suspend Domain' : 'Activate Domain' }}
                    </button>
                    <button @click="deleteDomain(selectedDomain)" class="btn btn-danger">
                        <Icon name="heroicons:trash" class="btn-icon" />
                        Delete Domain
                    </button>
                    <button @click="closeDetailsModal" class="btn btn-secondary">
                        Close
                    </button>
                </div>
            </template>
        </Modal>

        <!-- Delete Confirmation Modal -->
        <Modal :is-open="showDeleteModal" @close="showDeleteModal = false"
            :title="t('admin.domains.moderation.deleteDomain')" size="sm">
            <div class="delete-confirmation">
                <Icon name="heroicons:exclamation-triangle" class="warning-icon" />
                <p>{{ t('admin.domains.moderation.deleteDomainConfirm') }}</p>
                <div class="confirm-details">
                    <p><strong>{{ t('admin.domains.columns.domain') }}:</strong> {{ domainToDelete?.domain }}</p>
                    <p><strong>{{ t('admin.domains.columns.entity') }}:</strong> {{ domainToDelete?.entity_name }}</p>
                    <p><strong>{{ t('admin.domains.columns.owner') }}:</strong> {{ domainToDelete?.owner_character_name
                        }}</p>
                </div>
            </div>

            <template #footer>
                <button @click="showDeleteModal = false" class="btn btn-secondary">
                    {{ t('admin.domains.moderation.cancel') }}
                </button>
                <button @click="confirmDeleteDomain" class="btn btn-danger" :disabled="deleting">
                    <Icon v-if="deleting" name="heroicons:arrow-path" class="btn-icon animate-spin" />
                    {{ t('admin.domains.actions.delete') }}
                </button>
            </template>
        </Modal>
    </div>
</template>

<script setup lang="ts">

interface Domain {
    _id: string;
    domain_id: string;
    domain: string;
    entities: Array<{
        entity_type: 'character' | 'corporation' | 'alliance';
        entity_id: number;
        entity_name?: string;
        show_in_nav: boolean;
        show_in_stats: boolean;
        primary: boolean;
    }>;
    owner_character_id: number;
    owner_character_name: string;
    status: 'pending' | 'verified' | 'failed' | 'expired' | 'suspended';
    verification_method?: string;
    verification_token: string;
    created_at: string;
    verified_at?: string;
    updated_at: string;
    last_accessed?: string;
    branding?: {
        primary_color?: string;
        secondary_color?: string;
        accent_color?: string;
        background_color?: string;
        text_color?: string;
        logo_url?: string;
        favicon_url?: string;
        banner_image_url?: string;
        background_image_url?: string;
        header_title?: string;
        font_family?: string;
        font_size_base?: number;
        custom_css?: string;
        css_variables?: Record<string, string>;
        show_eve_kill_branding?: boolean;
        theme_mode?: 'light' | 'dark' | 'auto';
        border_radius?: string;
        shadow_intensity?: 'none' | 'light' | 'medium' | 'heavy';
    };
    navigation?: {
        show_default_nav?: boolean;
        nav_style?: 'horizontal' | 'sidebar' | 'dropdown';
        nav_position?: 'top' | 'side' | 'bottom';
        show_search?: boolean;
        show_user_menu?: boolean;
        sticky?: boolean;
        custom_links?: Array<{
            label: string;
            url: string;
            external: boolean;
            icon?: string;
            position: number;
            access_level: 'public' | 'members' | 'admin';
        }>;
    };
    page_config?: {
        layout?: 'default' | 'compact' | 'detailed';
        components?: {
            recent_kills?: boolean;
            top_pilots?: boolean;
            campaigns?: boolean;
            battles?: boolean;
            stats_overview?: boolean;
            search_widget?: boolean;
            news_feed?: boolean;
            social_links?: boolean;
        };
        component_settings?: {
            recent_kills_count?: 5 | 10 | 20 | 50;
            top_pilots_count?: 5 | 10 | 15;
            time_range?: '24h' | '7d' | '30d' | 'all';
            show_losses?: boolean;
            show_involved_kills?: boolean;
        };
    };
    public_campaigns?: boolean;
    ssl_enabled?: boolean;
    active?: boolean;
    suspended?: boolean;
    dns_verified_at?: string | null;
}

interface DomainsResponse {
    domains: Domain[];
    stats: {
        total: number;
        verified: number;
        pending: number;
        failed: number;
    };
    pagination: {
        currentPage: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
        total: number;
    };
}

const { t } = useI18n();

// Reactive state
const currentPage = ref(1);
const pageSize = ref(25);
const searchQuery = ref('');
const statusFilter = ref('all');
const entityTypeFilter = ref('all');
const showDetailsModal = ref(false);
const showDeleteModal = ref(false);
const selectedDomain = ref<Domain | null>(null);
const domainToDelete = ref<Domain | null>(null);
const deleting = ref(false);
const activeTab = ref('overview');

// Computed API endpoint
const apiEndpoint = computed(() => {
    const params = new URLSearchParams();

    if (currentPage.value > 1) params.set('page', currentPage.value.toString());
    if (pageSize.value !== 25) params.set('limit', pageSize.value.toString());
    if (searchQuery.value.trim()) params.set('search', searchQuery.value.trim());
    if (statusFilter.value !== 'all') params.set('status', statusFilter.value);
    if (entityTypeFilter.value !== 'all') params.set('entityType', entityTypeFilter.value);

    return `/api/admin/domains?${params.toString()}`;
});

// Fetch data
const { data, pending, error, refresh: refreshData } = useAsyncData<DomainsResponse>(
    'admin-domains',
    () => $fetch(apiEndpoint.value),
    {
        server: false,
        watch: [currentPage, pageSize, searchQuery, statusFilter, entityTypeFilter],
    }
);

// Methods
const clearSearch = () => {
    searchQuery.value = '';
};

const handlePageSizeChange = () => {
    currentPage.value = 1;
};

const changePage = (page: number) => {
    currentPage.value = page;
};

const formatEntityType = (type: string) => {
    switch (type) {
        case 'character':
            return t('admin.domains.character');
        case 'corporation':
            return t('admin.domains.corporation');
        case 'alliance':
            return t('admin.domains.alliance');
        default:
            return type; // Return as-is if unknown
    }
};

// Map domain status to StatusBadge expected values
const mapDomainStatus = (status: string): 'active' | 'inactive' | 'unverified' | 'suspended' => {
    switch (status) {
        case 'verified':
            return 'active';
        case 'pending':
            return 'unverified';
        case 'suspended':
            return 'suspended';
        case 'failed':
        default:
            return 'inactive';
    }
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
};

// Format date in short format (for compact display)
const formatDateShort = (dateString: string): string => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: '2-digit'
    }).format(date);
};

// Get entity link based on type
const getEntityLink = (entity: any): string => {
    switch (entity.entity_type) {
        case 'character':
            return `/character/${entity.entity_id}`;
        case 'corporation':
            return `/corporation/${entity.entity_id}`;
        case 'alliance':
            return `/alliance/${entity.entity_id}`;
        case 'faction':
            return `/faction/${entity.entity_id}`;
        default:
            return '#';
    }
};

// Activate and verify domain in one action
const activateAndVerifyDomain = async (domain: Domain) => {
    if (domain.status === 'verified') {
        return;
    }

    try {
        // First activate the domain
        await $fetch(`/api/admin/domains/${domain._id}/status`, {
            method: 'PATCH',
            body: { status: 'verified' }
        });

        // Update local data
        domain.status = 'verified' as any;
        await refreshData();

    } catch (error) {
        console.error('Failed to activate and verify domain:', error);
    }
};

const viewDomainDetails = (domain: Domain) => {
    selectedDomain.value = domain;
    showDetailsModal.value = true;
};

const closeDetailsModal = () => {
    showDetailsModal.value = false;
    selectedDomain.value = null;
};

const toggleDomainStatus = async (domain: Domain) => {
    try {
        const newStatus = domain.status === 'verified' ? 'suspended' : 'verified';
        await $fetch(`/api/admin/domains/${domain._id}/status`, {
            method: 'PATCH',
            body: { status: newStatus }
        });

        // Update local data
        domain.status = newStatus as any;
        await refreshData();
    } catch (error) {
        console.error('Failed to toggle domain status:', error);
    }
};

const deleteDomain = (domain: Domain) => {
    domainToDelete.value = domain;
    showDeleteModal.value = true;
};

const confirmDeleteDomain = async () => {
    if (!domainToDelete.value) return;

    deleting.value = true;
    try {
        await $fetch(`/api/admin/domains/${domainToDelete.value._id}`, {
            method: 'DELETE'
        });

        showDeleteModal.value = false;
        domainToDelete.value = null;
        await refreshData();
    } catch (error) {
        console.error('Failed to delete domain:', error);
    } finally {
        deleting.value = false;
    }
};

// Watch for search input changes with debouncing
let searchTimeout: NodeJS.Timeout;
watch(searchQuery, () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentPage.value = 1;
    }, 300);
});

// Watch filters
watch([statusFilter, entityTypeFilter], () => {
    currentPage.value = 1;
});

// Helper methods for Phase 2 features
const getEntityIcon = (entityType: string) => {
    switch (entityType) {
        case 'character':
            return 'heroicons:user';
        case 'corporation':
            return 'heroicons:building-office';
        case 'alliance':
            return 'heroicons:building-office-2';
        default:
            return 'heroicons:question-mark-circle';
    }
};

// Get entity type abbreviation
const getEntityTypeAbbr = (entityType: string) => {
    switch (entityType) {
        case 'character':
            return 'CA';
        case 'corporation':
            return 'CO';
        case 'alliance':
            return 'AA';
        default:
            return '??';
    }
};

const hasBrandingFeatures = (domain: Domain) => {
    if (!domain.branding) return false;

    return !!(
        domain.branding.primary_color ||
        domain.branding.secondary_color ||
        domain.branding.accent_color ||
        domain.branding.logo_url ||
        domain.branding.banner_image_url ||
        domain.branding.background_image_url ||
        domain.branding.custom_css ||
        domain.branding.font_family ||
        domain.branding.theme_mode ||
        (domain.branding.css_variables && Object.keys(domain.branding.css_variables).length > 0)
    );
};

const hasNavigationFeatures = (domain: Domain) => {
    if (!domain.navigation) return false;

    return !!(
        domain.navigation.nav_style ||
        domain.navigation.nav_position ||
        domain.navigation.show_search !== undefined ||
        domain.navigation.sticky !== undefined ||
        (domain.navigation.custom_links && domain.navigation.custom_links.length > 0)
    );
};

const hasPageConfigFeatures = (domain: Domain) => {
    if (!domain.page_config) return false;

    return !!(
        domain.page_config.layout ||
        domain.page_config.components ||
        (domain.page_config.component_settings && Object.keys(domain.page_config.component_settings).length > 0)
    );
};

const formatComponentName = (componentName: string) => {
    return componentName
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
};

const formatSettingName = (settingName: string) => {
    return settingName
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
};

// New helper methods for enhanced modal
const formatDateRelative = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
};

const getEntityCountByType = (type: 'character' | 'corporation' | 'alliance') => {
    return selectedDomain.value?.entities?.filter(entity => entity.entity_type === type).length || 0;
};

const getTruncatedUrl = (url: string) => {
    if (url.length <= 50) return url;
    return `${url.substring(0, 25)}...${url.substring(url.length - 20)}`;
};

const getThemeIcon = (theme: string) => {
    switch (theme) {
        case 'light':
            return 'heroicons:sun';
        case 'dark':
            return 'heroicons:moon';
        case 'auto':
            return 'heroicons:computer-desktop';
        default:
            return 'heroicons:swatch';
    }
};

const calculateSecurityScore = () => {
    let score = 0;
    if (selectedDomain.value?.status === 'verified') score++;
    if (selectedDomain.value?.ssl_enabled) score++;
    if (selectedDomain.value?.dns_verified_at) score++;
    if (!selectedDomain.value?.suspended) score++;
    if (isRecentlyAccessed()) score++;
    return score;
};

const getSecurityScoreClass = () => {
    const score = calculateSecurityScore();
    if (score >= 4) return 'excellent';
    if (score >= 3) return 'good';
    if (score >= 2) return 'fair';
    return 'poor';
};

const isRecentlyAccessed = () => {
    if (!selectedDomain.value?.last_accessed) return false;
    const lastAccess = new Date(selectedDomain.value.last_accessed);
    const now = new Date();
    const diffDays = Math.floor(Math.abs(now.getTime() - lastAccess.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
};
</script>

<style scoped>
.admin-domains {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 2rem;
    height: 100%;
    overflow-y: auto;
}

/* Header */
.domains-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.header-info {
    flex: 1;
}

.domains-title {
    font-size: 1.875rem;
    font-weight: 700;
    color: white;
    margin-bottom: 0.75rem;
    background: linear-gradient(135deg, #ffffff 0%, #e5e7eb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.domains-description {
    color: rgb(156, 163, 175);
    line-height: 1.6;
    font-size: 0.95rem;
}

.header-actions {
    display: flex;
    gap: 0.75rem;
}

.action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: linear-gradient(135deg, rgb(55, 65, 81) 0%, rgb(45, 55, 72) 100%);
    color: white;
    border: 1px solid rgb(75, 85, 99);
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
}

.action-btn:hover {
    background: linear-gradient(135deg, rgb(75, 85, 99) 0%, rgb(55, 65, 81) 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
}

.action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

.action-icon {
    width: 1rem;
    height: 1rem;
}

/* Filters */
.filters-section {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border-radius: 0.75rem;
    border: 1px solid rgb(63, 63, 70);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    margin-bottom: 1.5rem;
}

.search-container {
    position: relative;
    display: flex;
    align-items: center;
    max-width: 500px;
}

.search-icon {
    position: absolute;
    left: 1rem;
    width: 1.125rem;
    height: 1.125rem;
    color: rgb(156, 163, 175);
    z-index: 10;
}

.search-input {
    flex: 1;
    padding: 0.75rem 1rem 0.75rem 2.75rem;
    background: linear-gradient(135deg, rgb(55, 65, 81) 0%, rgb(45, 55, 72) 100%);
    border: 1px solid rgb(75, 85, 99);
    border-radius: 0.5rem;
    color: white;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.search-input:focus {
    outline: none;
    border-color: rgb(59, 130, 246);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-clear-btn {
    position: absolute;
    right: 0.75rem;
    padding: 0.25rem;
    color: rgb(156, 163, 175);
    cursor: pointer;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
}

.search-clear-btn:hover {
    color: white;
    background-color: rgba(75, 85, 99, 0.5);
}

.clear-icon {
    width: 1rem;
    height: 1rem;
}

.filters-row {
    display: flex;
    gap: 1.25rem;
    align-items: center;
    flex-wrap: wrap;
}

.filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.filter-select,
.page-size-select {
    padding: 0.75rem 1rem;
    background: linear-gradient(135deg, rgb(55, 65, 81) 0%, rgb(45, 55, 72) 100%);
    border: 1px solid rgb(75, 85, 99);
    border-radius: 0.5rem;
    color: white;
    font-size: 0.9rem;
    min-width: 160px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-select:focus,
.page-size-select:focus {
    outline: none;
    border-color: rgb(59, 130, 246);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Loading/Error States */
.loading-container,
.error-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 3rem;
}

.loading-content,
.error-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
}

.loading-icon,
.error-icon {
    width: 2rem;
    height: 2rem;
    color: rgb(156, 163, 175);
}

.loading-text,
.error-text {
    color: rgb(156, 163, 175);
    font-size: 1rem;
}

.error-retry {
    padding: 0.5rem 1rem;
    background-color: rgb(239, 68, 68);
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: background-color 0.2s;
}

.error-retry:hover {
    background-color: rgb(220, 38, 38);
}

/* Stats Grid */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.25rem;
    margin-bottom: 2rem;
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
}

.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.08);
}

.stat-icon-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 0.75rem;
    position: relative;
}

.stat-icon-container.verified {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%);
    border: 1px solid rgba(34, 197, 94, 0.2);
}

.stat-icon-container.pending {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 100%);
    border: 1px solid rgba(251, 191, 36, 0.2);
}

.stat-icon-container.failed {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%);
    border: 1px solid rgba(239, 68, 68, 0.2);
}

.stat-icon-container.total {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%);
    border: 1px solid rgba(59, 130, 246, 0.2);
}

.stat-icon {
    width: 1.5rem;
    height: 1.5rem;
}

.stat-icon-container.verified .stat-icon {
    color: rgb(34, 197, 94);
    filter: drop-shadow(0 0 6px rgba(34, 197, 94, 0.3));
}

.stat-icon-container.pending .stat-icon {
    color: rgb(251, 191, 36);
    filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.3));
}

.stat-icon-container.failed .stat-icon {
    color: rgb(239, 68, 68);
    filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.3));
}

.stat-icon-container.total .stat-icon {
    color: rgb(59, 130, 246);
    filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.3));
}

.stat-info {
    flex: 1;
}

.stat-label {
    display: block;
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
    font-weight: 500;
}

.stat-value {
    display: block;
    color: white;
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1;
}

/* Domains List */
.domains-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.domain-card {
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid rgb(63, 63, 70);
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    position: relative;
    overflow: hidden;
}

.domain-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.4), transparent);
}

:global(.light) .domain-card {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-color: #e2e8f0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

:global(.light) .domain-card::before {
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent);
}

.domain-card:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.08);
}

/* Domain Title Section */
.domain-title-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgb(63, 63, 70);
}

:global(.light) .domain-title-section {
    border-bottom-color: #e2e8f0;
}

.domain-name-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
}

.domain-icon {
    width: 1.25rem;
    height: 1.25rem;
    color: rgb(156, 163, 175);
    flex-shrink: 0;
}

.domain-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: white;
    margin: 0;
    word-break: break-all;
    background: linear-gradient(135deg, #ffffff 0%, #e5e7eb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

:global(.light) .domain-title {
    color: #1e293b;
    background: none;
    -webkit-text-fill-color: initial;
}

.domain-status {
    flex-shrink: 0;
}

/* Action Buttons Row */
.domain-actions-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.action-btn-slim {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0.5rem;
    font-size: 0.8rem;
    font-weight: 500;
    border-radius: 6px;
    border: 1px solid rgb(63, 63, 70);
    background: rgb(39, 39, 42);
    color: rgb(209, 213, 219);
    transition: all 0.2s ease;
    cursor: pointer;
    min-height: 2rem;
}

:global(.light) .action-btn-slim {
    background: #ffffff;
    border-color: #d1d5db;
    color: #374151;
}

.action-btn-slim:hover:not(:disabled) {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-btn-slim:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.action-btn-icon {
    width: 0.875rem;
    height: 0.875rem;
    flex-shrink: 0;
}

.view-btn {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
}

.view-btn:hover {
    background: #2563eb;
    border-color: #2563eb;
}

.status-btn {
    background: #059669;
    color: white;
    border-color: #059669;
}

.status-btn:hover {
    background: #047857;
    border-color: #047857;
}

.status-btn.active {
    background: #dc2626;
    color: white;
    border-color: #dc2626;
}

.status-btn.active:hover {
    background: #b91c1c;
    border-color: #b91c1c;
}

.verify-btn {
    background: #7c3aed;
    color: white;
    border-color: #7c3aed;
}

.verify-btn:hover:not(:disabled) {
    background: #6d28d9;
    border-color: #6d28d9;
}

.verify-btn:disabled {
    background: rgb(39, 39, 42);
    color: rgb(156, 163, 175);
    border-color: rgb(63, 63, 70);
}

.delete-btn {
    background: #ef4444;
    color: white;
    border-color: #ef4444;
}

.delete-btn:hover {
    background: #dc2626;
    border-color: #dc2626;
}

/* Domain Info Section */
.domain-info-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.domain-info-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
}

.domain-info-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
}

.info-icon {
    width: 1rem;
    height: 1rem;
    color: rgb(156, 163, 175);
    flex-shrink: 0;
}

.info-icon.warning {
    color: rgb(251, 191, 36);
}

.info-label {
    font-weight: 500;
    color: rgb(156, 163, 175);
}

:global(.light) .info-label {
    color: #6b7280;
}

.info-value {
    color: rgb(209, 213, 219);
}

:global(.light) .info-value {
    color: #374151;
}

.info-link {
    color: rgb(59, 130, 246);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;
}

.info-link:hover {
    color: rgb(37, 99, 235);
}

:global(.light) .info-link {
    color: #3b82f6;
}

:global(.light) .info-link:hover {
    color: #1d4ed8;
}

/* Entities Section */
.domain-entities-section {
    grid-column: 1 / -1;
}

.entities-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
}

.entities-compact-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
}

.entity-compact-link {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.5rem;
    background: rgb(39, 39, 42);
    border-radius: 6px;
    text-decoration: none;
    font-size: 0.75rem;
    color: rgb(209, 213, 219);
    transition: all 0.2s ease;
    border: 1px solid rgb(63, 63, 70);
}

:global(.light) .entity-compact-link {
    background: #f3f4f6;
    color: #374151;
    border-color: #e5e7eb;
}

.entity-compact-link:hover {
    background: rgb(63, 63, 70);
}

:global(.light) .entity-compact-link:hover {
    background: #e5e7eb;
}

.entity-type-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    background: rgb(59, 130, 246);
    color: white;
    font-size: 0.625rem;
    font-weight: 600;
    border-radius: 4px;
    flex-shrink: 0;
    letter-spacing: 0.025em;
}

.entity-compact-name {
    max-width: 8rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.entity-compact-badges {
    display: flex;
    gap: 0.25rem;
}

.badge-mini {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    font-size: 0.6rem;
    font-weight: 600;
    color: white;
}

.badge-mini.primary {
    background: #3b82f6;
}

.badge-mini.nav {
    background: #10b981;
}

.badge-mini.stats {
    background: #f59e0b;
}

.entities-more {
    font-size: 0.75rem;
    color: rgb(156, 163, 175);
    padding: 0.375rem 0.5rem;
    background: rgb(39, 39, 42);
    border-radius: 6px;
}

:global(.light) .entities-more {
    color: #6b7280;
    background: #f9fafb;
}

.no-entities {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: rgb(251, 191, 36);
    grid-column: 1 / -1;
    padding: 0.75rem;
    background: rgba(251, 191, 36, 0.1);
    border-radius: 6px;
    border: 1px solid rgba(251, 191, 36, 0.2);
}

:global(.light) .no-entities {
    background: #fef3c7;
    border-color: #fbbf24;
    color: #6b7280;
}

.no-entities-text {
    font-weight: 500;
}

.detail-link {
    color: rgb(59, 130, 246);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;
}

.detail-link:hover {
    color: rgb(37, 99, 235);
    text-decoration: underline;
}

/* Empty State */
.empty-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 4rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
    border-style: dashed;
}

.empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1.25rem;
}

.empty-icon {
    width: 4rem;
    height: 4rem;
    color: rgb(156, 163, 175);
    filter: drop-shadow(0 0 8px rgba(156, 163, 175, 0.2));
}

.empty-title {
    color: white;
    font-size: 1.25rem;
    font-weight: 600;
}

.empty-description {
    color: rgb(156, 163, 175);
    line-height: 1.6;
    max-width: 400px;
    font-size: 0.95rem;
}

/* Pagination */
.pagination-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.75rem;
    margin-top: 2rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.pagination-btn {
    padding: 0.75rem 1.25rem;
    background: linear-gradient(135deg, rgb(55, 65, 81) 0%, rgb(45, 55, 72) 100%);
    color: white;
    border: 1px solid rgb(75, 85, 99);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
}

.pagination-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgb(75, 85, 99) 0%, rgb(55, 65, 81) 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
}

.pagination-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
}

.pagination-info {
    color: rgb(209, 213, 219);
    font-size: 0.9rem;
    font-weight: 500;
    margin: 0 1.25rem;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: 1px solid rgba(59, 130, 246, 0.2);
}

/* Modal Styles */
.domain-details-modal {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.details-section {
    padding: 1rem;
    background-color: rgb(31, 31, 31);
    border-radius: 0.5rem;
    border: 1px solid rgb(55, 55, 55);
}

.section-title {
    color: white;
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgb(55, 55, 55);
}

.detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
}

.detail-grid .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.detail-grid .detail-item label {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
    font-weight: 500;
}

.detail-grid .detail-item span {
    color: white;
}

.verification-token {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    background-color: rgb(55, 55, 55);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    word-break: break-all;
}

.branding-preview {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.branding-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.branding-item label {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
    font-weight: 500;
}

.color-preview {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.color-swatch {
    width: 2rem;
    height: 2rem;
    border-radius: 0.25rem;
    border: 1px solid rgb(75, 75, 75);
}

.logo-preview {
    max-width: 100px;
    max-height: 50px;
    object-fit: contain;
    border-radius: 0.25rem;
}

.delete-confirmation {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
}

.warning-icon {
    width: 3rem;
    height: 3rem;
    color: rgb(251, 191, 36);
}

.delete-confirmation p {
    color: rgb(209, 213, 219);
    line-height: 1.5;
}

.confirm-details {
    padding: 1rem;
    background-color: rgb(31, 31, 31);
    border-radius: 0.375rem;
    border: 1px solid rgb(55, 55, 55);
    text-align: left;
}

.confirm-details p {
    margin: 0.25rem 0;
    font-size: 0.875rem;
}

.btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-secondary {
    background-color: rgb(75, 75, 75);
    color: white;
}

.btn-secondary:hover {
    background-color: rgb(100, 100, 100);
}

.btn-danger {
    background-color: rgb(239, 68, 68);
    color: white;
}

.btn-danger:hover {
    background-color: rgb(220, 38, 38);
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-icon {
    width: 1rem;
    height: 1rem;
}

/* Phase 2 Enhanced UI Styles */

/* Entities Detail Section */
.entities-detail-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.entity-detail-card {
    padding: 0.75rem;
    background-color: rgb(55, 55, 55);
    border-radius: 0.375rem;
    border: 1px solid rgb(75, 75, 75);
}

.entity-detail-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.entity-detail-icon {
    width: 1.25rem;
    height: 1.25rem;
    color: rgb(156, 163, 175);
}

.entity-detail-info {
    flex: 1;
}

.entity-detail-name {
    color: white;
    font-weight: 500;
    font-size: 0.875rem;
}

.entity-detail-type {
    color: rgb(156, 163, 175);
    font-size: 0.75rem;
}

.entity-detail-badges {
    display: flex;
    gap: 0.5rem;
}

.badge {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    transition: all 0.2s ease;
    border: 1px solid transparent;
}

.primary-badge {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%);
    color: rgb(34, 197, 94);
    border-color: rgba(34, 197, 94, 0.3);
}

.nav-badge {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%);
    color: rgb(59, 130, 246);
    border-color: rgba(59, 130, 246, 0.3);
}

.stats-badge {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 100%);
    color: rgb(251, 191, 36);
    border-color: rgba(251, 191, 36, 0.3);
}

/* Enhanced Branding Styles */
.branding-subsection {
    padding: 1rem;
    background-color: rgb(55, 55, 55);
    border-radius: 0.375rem;
    margin-bottom: 1rem;
}

.branding-subtitle,
.nav-subtitle,
.config-subtitle {
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgb(75, 75, 75);
}

.color-grid,
.image-grid,
.typography-grid,
.variables-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
}

.color-item,
.image-item,
.typography-item,
.variable-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.color-item label,
.image-item label,
.typography-item label,
.variable-item label {
    color: rgb(156, 163, 175);
    font-size: 0.75rem;
    font-weight: 500;
}

.image-preview {
    max-width: 100%;
    max-height: 80px;
    object-fit: contain;
    border-radius: 0.25rem;
    border: 1px solid rgb(75, 75, 75);
}

.banner-preview {
    max-height: 60px;
}

.bg-preview {
    max-height: 40px;
}

.theme-badge {
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
}

.theme-light {
    background-color: rgba(251, 191, 36, 0.1);
    color: rgb(251, 191, 36);
}

.theme-dark {
    background-color: rgba(107, 114, 128, 0.1);
    color: rgb(107, 114, 128);
}

.theme-auto {
    background-color: rgba(59, 130, 246, 0.1);
    color: rgb(59, 130, 246);
}

.css-preview {
    max-height: 200px;
    overflow-y: auto;
}

.css-code {
    background-color: rgb(31, 31, 31);
    padding: 0.75rem;
    border-radius: 0.25rem;
    font-family: 'Courier New', monospace;
    font-size: 0.75rem;
    color: rgb(209, 213, 219);
    white-space: pre-wrap;
    word-wrap: break-word;
}

/* Navigation Configuration Styles */
.nav-settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.nav-setting-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.nav-setting-item label {
    color: rgb(156, 163, 175);
    font-size: 0.75rem;
    font-weight: 500;
}

.nav-style-badge {
    padding: 0.125rem 0.5rem;
    background-color: rgba(59, 130, 246, 0.1);
    color: rgb(59, 130, 246);
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    width: fit-content;
}

.boolean-badge {
    padding: 0.125rem 0.5rem;
    background-color: rgba(239, 68, 68, 0.1);
    color: rgb(239, 68, 68);
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    width: fit-content;
}

.boolean-badge.active {
    background-color: rgba(34, 197, 94, 0.1);
    color: rgb(34, 197, 94);
}

.nav-links-section {
    padding: 1rem;
    background-color: rgb(55, 55, 55);
    border-radius: 0.375rem;
}

.custom-links-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.custom-link-item {
    padding: 0.75rem;
    background-color: rgb(31, 31, 31);
    border-radius: 0.375rem;
    border: 1px solid rgb(75, 75, 75);
}

.link-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.link-icon,
.external-icon {
    width: 1rem;
    height: 1rem;
    color: rgb(156, 163, 175);
}

.link-label {
    color: white;
    font-weight: 500;
    font-size: 0.875rem;
}

.link-details {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}

.link-url {
    color: rgb(59, 130, 246);
    font-size: 0.75rem;
    font-family: 'Courier New', monospace;
}

.link-access {
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
}

.access-public {
    background-color: rgba(34, 197, 94, 0.1);
    color: rgb(34, 197, 94);
}

.access-members {
    background-color: rgba(251, 191, 36, 0.1);
    color: rgb(251, 191, 36);
}

.access-admin {
    background-color: rgba(239, 68, 68, 0.1);
    color: rgb(239, 68, 68);
}

/* Page Configuration Styles */
.page-config-preview {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.config-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.config-item label {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
    font-weight: 500;
}

.layout-badge {
    padding: 0.25rem 0.75rem;
    background-color: rgba(59, 130, 246, 0.1);
    color: rgb(59, 130, 246);
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
}

.components-section,
.component-settings-section {
    padding: 1rem;
    background-color: rgb(55, 55, 55);
    border-radius: 0.375rem;
}

.components-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
}

.component-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background-color: rgb(31, 31, 31);
    border-radius: 0.375rem;
    border: 1px solid rgb(75, 75, 75);
    color: rgb(156, 163, 175);
}

.component-item.enabled {
    color: white;
    border-color: rgba(34, 197, 94, 0.3);
}

.component-icon {
    width: 1rem;
    height: 1rem;
    color: rgb(239, 68, 68);
}

.component-icon.enabled {
    color: rgb(34, 197, 94);
}

.settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
}

.setting-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.setting-item label {
    color: rgb(156, 163, 175);
    font-size: 0.75rem;
    font-weight: 500;
}

.setting-item span {
    color: white;
    font-size: 0.875rem;
}

/* Entity list styles in main cards */
.entities-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
}

.entities-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    margin-left: 1.75rem;
}

.entity-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: linear-gradient(135deg, rgb(55, 65, 81) 0%, rgb(45, 55, 72) 100%);
    border-radius: 0.5rem;
    border: 1px solid rgb(75, 85, 99);
    transition: all 0.2s ease;
}

.entity-item:hover {
    background: linear-gradient(135deg, rgb(75, 85, 99) 0%, rgb(55, 65, 81) 100%);
    transform: translateX(4px);
}

.entity-icon {
    width: 1.125rem;
    height: 1.125rem;
    color: rgb(156, 163, 175);
}

.entity-name {
    flex: 1;
    color: white;
    font-size: 0.9rem;
    font-weight: 500;
}

.entity-badges {
    display: flex;
    gap: 0.375rem;
}

.entity-badges .badge {
    font-size: 0.625rem;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
}

/* Feature indicators */
.feature-indicators {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
}

.feature-indicator {
    padding: 0.25rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    transition: all 0.2s ease;
    border: 1px solid transparent;
}

.feature-indicator.active {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%);
    color: rgb(34, 197, 94);
    border-color: rgba(34, 197, 94, 0.3);
}

.feature-indicator.inactive {
    background: linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(156, 163, 175, 0.05) 100%);
    color: rgb(156, 163, 175);
    border-color: rgba(156, 163, 175, 0.2);
}

@media (max-width: 768px) {
    .admin-domains {
        padding: 1rem;
        gap: 1.5rem;
    }

    .domains-header {
        flex-direction: column;
        align-items: stretch;
        padding: 1.25rem;
    }

    .filters-row {
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
    }

    .filter-select,
    .page-size-select {
        min-width: 100%;
    }

    .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1rem;
    }

    .stat-card {
        padding: 1.25rem;
    }

    .domain-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
        padding-bottom: 1rem;
    }

    .domain-actions {
        justify-content: stretch;
        gap: 0.5rem;
    }

    .domain-actions .action-btn {
        flex: 1;
        justify-content: center;
        padding: 0.625rem 0.75rem;
    }

    .detail-row {
        flex-direction: column;
        gap: 0.75rem;
    }

    .detail-item {
        min-width: 100%;
    }

    .color-grid,
    .image-grid,
    .typography-grid,
    .variables-grid {
        grid-template-columns: 1fr;
    }

    .nav-settings-grid,
    .components-grid,
    .settings-grid {
        grid-template-columns: 1fr;
    }

    .entities-list {
        margin-left: 0;
    }

    .link-details {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }

    .pagination-container {
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 1rem;
    }

    .pagination-info {
        order: -1;
        margin: 0;
        width: 100%;
        text-align: center;
    }

    .search-container {
        max-width: 100%;
    }

    /* Mobile adjustments for domains grid */
    .domains-list {
        grid-template-columns: 1fr;
    }

    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    /* Modal responsive adjustments */
    .modal-tabs {
        flex-wrap: wrap;
        gap: 0.25rem;
    }

    .tab-button {
        flex: 1;
        min-width: 120px;
        justify-content: center;
    }

    .modal-stats-header {
        flex-direction: column;
        gap: 1rem;
    }

    .modal-stat-item {
        min-width: 100%;
    }

    .overview-grid {
        grid-template-columns: 1fr;
    }

    .entities-grid {
        grid-template-columns: 1fr;
    }

    .entity-type-stats {
        flex-direction: column;
        gap: 1rem;
    }

    .color-scheme-grid,
    .visual-assets-grid,
    .typography-grid {
        grid-template-columns: 1fr;
    }

    .navigation-settings {
        grid-template-columns: 1fr;
    }

    .features-grid {
        grid-template-columns: 1fr;
    }

    .verification-info-grid {
        grid-template-columns: 1fr;
    }

    .modal-footer-actions {
        flex-direction: column;
    }

    .modal-footer-actions .btn {
        justify-content: center;
    }
}

/* Enhanced Modal Styles */
.modal-stats-header {
    display: flex;
    gap: 1rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgb(55, 65, 81) 0%, rgb(45, 55, 72) 100%);
    border-radius: 0.75rem;
    margin-bottom: 1.5rem;
    border: 1px solid rgb(75, 85, 99);
    flex-wrap: wrap;
}

.modal-stat-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 150px;
}

.modal-stat-icon {
    width: 1.5rem;
    height: 1.5rem;
    color: rgb(59, 130, 246);
}

.modal-stat-content {
    display: flex;
    flex-direction: column;
}

.modal-stat-label {
    font-size: 0.75rem;
    color: rgb(156, 163, 175);
    font-weight: 500;
}

.modal-stat-value {
    font-size: 0.875rem;
    color: white;
    font-weight: 600;
}

/* Modal Tabs */
.modal-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding: 0.5rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border-radius: 0.5rem;
    border: 1px solid rgb(63, 63, 70);
    overflow-x: auto;
}

.tab-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: transparent;
    color: rgb(156, 163, 175);
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    font-size: 0.875rem;
    font-weight: 500;
}

.tab-button:hover {
    background: rgba(55, 65, 81, 0.5);
    color: white;
}

.tab-button.active {
    background: linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(37, 99, 235) 100%);
    color: white;
}

.tab-icon {
    width: 1rem;
    height: 1rem;
}

/* Tab Content */
.tab-content {
    min-height: 400px;
}

.tab-panel {
    animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Overview Tab */
.overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
}

.overview-card {
    padding: 1.5rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.overview-card-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgb(63, 63, 70);
}

.overview-card-icon {
    width: 1.25rem;
    height: 1.25rem;
    color: rgb(59, 130, 246);
}

.overview-card-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.info-label {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
    font-weight: 500;
}

.info-value {
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
}

.info-link {
    color: rgb(59, 130, 246);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;
}

.info-link:hover {
    color: rgb(37, 99, 235);
    text-decoration: underline;
}

.info-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    background: rgba(239, 68, 68, 0.1);
    color: rgb(239, 68, 68);
}

.info-badge.active {
    background: rgba(34, 197, 94, 0.1);
    color: rgb(34, 197, 94);
}

.feature-summary-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
}

.feature-summary-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: 0.375rem;
    background: rgba(156, 163, 175, 0.05);
    color: rgb(156, 163, 175);
    font-size: 0.75rem;
    font-weight: 500;
}

.feature-summary-item.active {
    background: rgba(34, 197, 94, 0.1);
    color: rgb(34, 197, 94);
}

.feature-summary-icon {
    width: 1rem;
    height: 1rem;
}

/* Entities Tab */
.entities-stats {
    margin-bottom: 1.5rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
}

.entity-type-stats {
    display: flex;
    justify-content: space-around;
    gap: 1rem;
}

.entity-type-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
}

.entity-type-icon {
    width: 2rem;
    height: 2rem;
}

.entity-type-icon.character {
    color: rgb(59, 130, 246);
}

.entity-type-icon.corporation {
    color: rgb(34, 197, 94);
}

.entity-type-icon.alliance {
    color: rgb(251, 191, 36);
}

.entity-type-count {
    font-size: 1.5rem;
    font-weight: 700;
    color: white;
}

.entity-type-label {
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
}

.entities-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
}

.entity-detail-card {
    padding: 1.25rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.5rem;
    transition: all 0.2s ease;
}

.entity-detail-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.1);
}

.entity-card-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
}

.entity-card-icon-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.5rem;
    border: 1px solid;
}

.entity-card-icon-container.character {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.3);
}

.entity-card-icon-container.corporation {
    background: rgba(34, 197, 94, 0.1);
    border-color: rgba(34, 197, 94, 0.3);
}

.entity-card-icon-container.alliance {
    background: rgba(251, 191, 36, 0.1);
    border-color: rgba(251, 191, 36, 0.3);
}

.entity-card-icon {
    width: 1.25rem;
    height: 1.25rem;
    color: inherit;
}

.entity-card-icon-container.character .entity-card-icon {
    color: rgb(59, 130, 246);
}

.entity-card-icon-container.corporation .entity-card-icon {
    color: rgb(34, 197, 94);
}

.entity-card-icon-container.alliance .entity-card-icon {
    color: rgb(251, 191, 36);
}

.entity-card-info {
    flex: 1;
}

.entity-card-name {
    color: white;
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
}

.entity-card-type {
    color: rgb(156, 163, 175);
    font-size: 0.75rem;
    display: block;
    margin-bottom: 0.125rem;
}

.entity-card-id {
    color: rgb(156, 163, 175);
    font-size: 0.75rem;
    font-family: monospace;
}

.entity-card-features {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.entity-feature {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    border-radius: 0.25rem;
    background: rgba(156, 163, 175, 0.1);
    color: rgb(156, 163, 175);
    font-size: 0.75rem;
    font-weight: 500;
}

.entity-feature.active {
    background: rgba(34, 197, 94, 0.1);
    color: rgb(34, 197, 94);
}

.entity-feature-icon {
    width: 0.875rem;
    height: 0.875rem;
}

/* Branding Tab */
.branding-section {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.branding-card {
    padding: 1.5rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
}

.branding-card-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgb(63, 63, 70);
}

.branding-card-icon {
    width: 1.25rem;
    height: 1.25rem;
    color: rgb(59, 130, 246);
}

.color-scheme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.color-scheme-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(55, 65, 81, 0.5);
    border-radius: 0.5rem;
    border: 1px solid rgb(75, 85, 99);
}

.color-scheme-swatch {
    width: 3rem;
    height: 3rem;
    border-radius: 0.5rem;
    border: 2px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.color-scheme-info {
    flex: 1;
}

.color-scheme-label {
    display: block;
    color: rgb(156, 163, 175);
    font-size: 0.75rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
}

.color-scheme-value {
    display: block;
    color: white;
    font-family: monospace;
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 0.25rem;
}

.visual-assets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
}

.visual-asset-item {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: rgba(55, 65, 81, 0.5);
    border-radius: 0.5rem;
    border: 1px solid rgb(75, 85, 99);
}

.visual-asset-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 0.375rem;
    border: 1px solid rgb(75, 85, 99);
}

.visual-asset-preview img {
    max-width: 100%;
    max-height: 100px;
    object-fit: contain;
}

.visual-asset-preview.logo {
    min-height: 60px;
}

.visual-asset-preview.banner {
    min-height: 40px;
}

.visual-asset-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.visual-asset-label {
    color: rgb(156, 163, 175);
    font-size: 0.75rem;
    font-weight: 500;
}

.visual-asset-url {
    color: white;
    font-size: 0.75rem;
    font-family: monospace;
    word-break: break-all;
}

.typography-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.typography-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(55, 65, 81, 0.5);
    border-radius: 0.5rem;
    border: 1px solid rgb(75, 85, 99);
}

.typography-label {
    color: rgb(156, 163, 175);
    font-size: 0.75rem;
    font-weight: 500;
}

.typography-value {
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
}

.typography-value.font-family {
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 0.25rem;
    border: 1px solid rgb(75, 85, 99);
}

.theme-mode-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    width: fit-content;
}

.theme-mode-badge.light {
    background: rgba(251, 191, 36, 0.15);
    color: rgb(251, 191, 36);
    border: 1px solid rgba(251, 191, 36, 0.3);
}

.theme-mode-badge.dark {
    background: rgba(107, 114, 128, 0.15);
    color: rgb(107, 114, 128);
    border: 1px solid rgba(107, 114, 128, 0.3);
}

.theme-mode-badge.auto {
    background: rgba(59, 130, 246, 0.15);
    color: rgb(59, 130, 246);
    border: 1px solid rgba(59, 130, 246, 0.3);
}

.theme-mode-icon {
    width: 1rem;
    height: 1rem;
}

.css-preview-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.css-preview-code {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgb(75, 85, 99);
    border-radius: 0.5rem;
    padding: 1rem;
    font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
    font-size: 0.875rem;
    color: rgb(209, 213, 219);
    white-space: pre-wrap;
    word-wrap: break-word;
    max-height: 300px;
    overflow-y: auto;
    line-height: 1.5;
}

.css-stats {
    display: flex;
    gap: 1rem;
}

.css-stat {
    padding: 0.25rem 0.5rem;
    background: rgba(59, 130, 246, 0.15);
    color: rgb(59, 130, 246);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
}

/* Navigation Tab */
.navigation-section {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.navigation-overview-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
}

.navigation-card {
    padding: 1.5rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
}

.navigation-card-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgb(63, 63, 70);
}

.navigation-card-icon {
    width: 1.25rem;
    height: 1.25rem;
    color: rgb(59, 130, 246);
}

.navigation-settings {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.navigation-setting {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: rgba(55, 65, 81, 0.5);
    border-radius: 0.375rem;
    border: 1px solid rgb(75, 85, 99);
}

.setting-label {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
    font-weight: 500;
}

.setting-value {
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
}

.setting-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    background: rgba(59, 130, 246, 0.15);
    color: rgb(59, 130, 246);
    border: 1px solid rgba(59, 130, 246, 0.3);
}

.setting-toggle {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    background: rgba(239, 68, 68, 0.15);
    color: rgb(239, 68, 68);
    border: 1px solid rgba(239, 68, 68, 0.3);
}

.setting-toggle.active {
    background: rgba(34, 197, 94, 0.15);
    color: rgb(34, 197, 94);
    border-color: rgba(34, 197, 94, 0.3);
}

.custom-links-container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.custom-link-card {
    padding: 1rem;
    background: rgba(55, 65, 81, 0.5);
    border-radius: 0.5rem;
    border: 1px solid rgb(75, 85, 99);
    transition: all 0.2s ease;
}

.custom-link-card:hover {
    background: rgba(55, 65, 81, 0.7);
}

.custom-link-header {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.custom-link-icon-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: rgba(59, 130, 246, 0.15);
    color: rgb(59, 130, 246);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 0.375rem;
}

.custom-link-icon {
    width: 1rem;
    height: 1rem;
}

.custom-link-content {
    flex: 1;
}

.custom-link-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
}

.external-link-icon {
    width: 0.875rem;
    height: 0.875rem;
    color: rgb(156, 163, 175);
}

.custom-link-url {
    color: rgb(156, 163, 175);
    font-size: 0.75rem;
    font-family: monospace;
}

.custom-link-badges {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.access-level-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
}

.access-level-badge.public {
    background: rgba(34, 197, 94, 0.15);
    color: rgb(34, 197, 94);
}

.access-level-badge.members {
    background: rgba(251, 191, 36, 0.15);
    color: rgb(251, 191, 36);
}

.access-level-badge.admin {
    background: rgba(239, 68, 68, 0.15);
    color: rgb(239, 68, 68);
}

.position-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    background: rgba(75, 85, 99, 0.5);
    color: rgb(209, 213, 219);
}

/* Features Tab */
.features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
}

.feature-card {
    padding: 1.5rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
    transition: all 0.2s ease;
    opacity: 0.6;
}

.feature-card.enabled {
    opacity: 1;
    border-color: rgba(34, 197, 94, 0.5);
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.1);
}

.feature-icon-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    background: rgba(156, 163, 175, 0.1);
    border: 1px solid rgba(156, 163, 175, 0.3);
    border-radius: 0.75rem;
    margin-bottom: 1rem;
}

.feature-card.enabled .feature-icon-container {
    background: rgba(34, 197, 94, 0.15);
    border-color: rgba(34, 197, 94, 0.3);
}

.feature-icon {
    width: 1.5rem;
    height: 1.5rem;
    color: rgb(156, 163, 175);
}

.feature-card.enabled .feature-icon {
    color: rgb(34, 197, 94);
}

.feature-content {
    flex: 1;
}

.feature-title {
    color: white;
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
}

.feature-description {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
    line-height: 1.5;
    margin-bottom: 1rem;
}

.feature-status {
    display: flex;
    justify-content: flex-end;
}

.feature-status-badge {
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    background: rgba(156, 163, 175, 0.15);
    color: rgb(156, 163, 175);
    border: 1px solid rgba(156, 163, 175, 0.3);
}

.feature-status-badge.enabled {
    background: rgba(34, 197, 94, 0.15);
    color: rgb(34, 197, 94);
    border-color: rgba(34, 197, 94, 0.3);
}

/* Security Tab */
.security-section {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.security-overview {
    display: flex;
    justify-content: center;
    padding: 2rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
}

.security-score {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
}

.security-score-circle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 6rem;
    height: 6rem;
    border-radius: 50%;
    border: 4px solid;
    position: relative;
}

.security-score-circle.excellent {
    border-color: rgb(34, 197, 94);
    background: rgba(34, 197, 94, 0.1);
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
}

.security-score-circle.good {
    border-color: rgb(34, 197, 94);
    background: rgba(34, 197, 94, 0.1);
}

.security-score-circle.fair {
    border-color: rgb(251, 191, 36);
    background: rgba(251, 191, 36, 0.1);
}

.security-score-circle.poor {
    border-color: rgb(239, 68, 68);
    background: rgba(239, 68, 68, 0.1);
}

.security-score-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: white;
}

.security-score-title {
    color: white;
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
}

.security-score-description {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
    text-align: center;
    margin: 0;
}

.security-checklist {
    padding: 1.5rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
}

.security-section-title {
    color: white;
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgb(63, 63, 70);
}

.security-items {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.security-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(55, 65, 81, 0.5);
    border-radius: 0.5rem;
    border: 1px solid rgb(75, 85, 99);
    transition: all 0.2s ease;
}

.security-item.passed {
    border-color: rgba(34, 197, 94, 0.5);
    background: rgba(34, 197, 94, 0.05);
}

.security-item-icon {
    width: 1.25rem;
    height: 1.25rem;
    color: rgb(239, 68, 68);
}

.security-item.passed .security-item-icon {
    color: rgb(34, 197, 94);
}

.security-item-content {
    flex: 1;
}

.security-item-title {
    display: block;
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
}

.security-item-description {
    display: block;
    color: rgb(156, 163, 175);
    font-size: 0.75rem;
}

.security-details {
    padding: 1.5rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
}

.verification-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
}

.verification-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(55, 65, 81, 0.5);
    border-radius: 0.375rem;
    border: 1px solid rgb(75, 85, 99);
}

.verification-label {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
    font-weight: 500;
}

.verification-value {
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
}

.verification-token-display {
    color: rgb(209, 213, 219);
    font-family: monospace;
    font-size: 0.75rem;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 0.25rem;
    border: 1px solid rgb(75, 85, 99);
    word-break: break-all;
}

/* Empty State */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    text-align: center;
}

.empty-icon {
    width: 4rem;
    height: 4rem;
    color: rgb(156, 163, 175);
    margin-bottom: 1rem;
    filter: drop-shadow(0 0 8px rgba(156, 163, 175, 0.2));
}

.empty-title {
    color: white;
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
}

.empty-description {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
    line-height: 1.5;
}

/* Modal Footer */
.modal-footer-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
}

.btn-secondary {
    background: linear-gradient(135deg, rgb(75, 85, 99) 0%, rgb(55, 65, 81) 100%);
    color: white;
    border: 1px solid rgb(75, 85, 99);
}

.btn-secondary:hover {
    background: linear-gradient(135deg, rgb(55, 65, 81) 0%, rgb(45, 55, 72) 100%);
    transform: translateY(-1px);
}

.btn-success {
    background: linear-gradient(135deg, rgb(34, 197, 94) 0%, rgb(22, 163, 74) 100%);
    color: white;
    border: 1px solid rgb(34, 197, 94);
}

.btn-success:hover {
    background: linear-gradient(135deg, rgb(22, 163, 74) 0%, rgb(21, 128, 61) 100%);
    transform: translateY(-1px);
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
}

.btn-warning {
    background: linear-gradient(135deg, rgb(251, 191, 36) 0%, rgb(245, 158, 11) 100%);
    color: rgb(92, 62, 0);
    border: 1px solid rgb(251, 191, 36);
}

.btn-warning:hover {
    background: linear-gradient(135deg, rgb(245, 158, 11) 0%, rgb(217, 119, 6) 100%);
    transform: translateY(-1px);
}

.btn-danger {
    background: linear-gradient(135deg, rgb(239, 68, 68) 0%, rgb(220, 38, 38) 100%);
    color: white;
    border: 1px solid rgb(239, 68, 68);
}

.btn-danger:hover {
    background: linear-gradient(135deg, rgb(220, 38, 38) 0%, rgb(185, 28, 28) 100%);
    transform: translateY(-1px);
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
}

.btn-icon {
    width: 1rem;
    height: 1rem;
}
</style>
