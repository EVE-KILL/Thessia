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
                    <div class="domain-header">
                        <div class="domain-name">
                            <Icon name="heroicons:globe-alt" class="domain-icon" />
                            <h4 class="domain-title">{{ domain.domain }}</h4>
                            <StatusBadge :status="mapDomainStatus(domain.status)" class="domain-status" />
                        </div>
                        <div class="domain-actions">
                            <button @click="viewDomainDetails(domain)" class="action-btn view-btn">
                                <Icon name="heroicons:eye" class="action-btn-icon" />
                                {{ t('admin.domains.actions.view') }}
                            </button>
                            <button @click="toggleDomainStatus(domain)" class="action-btn status-btn"
                                :class="{ 'active': domain.status === 'verified' }">
                                <Icon :name="domain.status === 'verified' ? 'heroicons:pause' : 'heroicons:play'"
                                    class="action-btn-icon" />
                                {{ domain.status === 'verified' ? t('admin.domains.actions.suspend') :
                                    t('admin.domains.actions.activate')
                                }}
                            </button>
                            <button @click="deleteDomain(domain)" class="action-btn delete-btn">
                                <Icon name="heroicons:trash" class="action-btn-icon" />
                                {{ t('admin.domains.actions.delete') }}
                            </button>
                        </div>
                    </div>

                    <div class="domain-details">
                        <!-- Entities Section -->
                        <div class="detail-row">
                            <div class="detail-item entities-section">
                                <Icon name="heroicons:building-office-2" class="detail-icon" />
                                <span class="detail-label">{{ t('admin.domains.columns.entities') }} ({{
                                    domain.entities?.length || 0 }}):</span>
                                <div class="entities-list">
                                    <div v-for="entity in domain.entities"
                                        :key="`${entity.entity_type}-${entity.entity_id}`" class="entity-item">
                                        <Icon :name="getEntityIcon(entity.entity_type)" class="entity-icon" />
                                        <span class="entity-name">{{ entity.entity_name ||
                                            `${formatEntityType(entity.entity_type)} ${entity.entity_id}` }}</span>
                                        <div class="entity-badges">
                                            <span v-if="entity.primary" class="badge primary-badge">Primary</span>
                                            <span v-if="entity.show_in_nav" class="badge nav-badge">Nav</span>
                                            <span v-if="entity.show_in_stats" class="badge stats-badge">Stats</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="detail-item">
                                <Icon name="heroicons:user" class="detail-icon" />
                                <span class="detail-label">{{ t('admin.domains.columns.owner') }}:</span>
                                <NuxtLink :to="`/character/${domain.owner_character_id}`" class="detail-link">
                                    {{ domain.owner_character_name }}
                                </NuxtLink>
                            </div>
                        </div>

                        <!-- Features Summary -->
                        <div class="detail-row">
                            <div class="detail-item">
                                <Icon name="heroicons:swatch" class="detail-icon" />
                                <span class="detail-label">{{ t('admin.domains.features.branding') }}:</span>
                                <div class="feature-indicators">
                                    <span v-if="domain.branding?.primary_color"
                                        class="feature-indicator active">Colors</span>
                                    <span v-if="domain.branding?.logo_url" class="feature-indicator active">Logo</span>
                                    <span v-if="domain.branding?.banner_image_url"
                                        class="feature-indicator active">Banner</span>
                                    <span v-if="domain.branding?.custom_css" class="feature-indicator active">CSS</span>
                                    <span v-if="!hasBrandingFeatures(domain)"
                                        class="feature-indicator inactive">Default</span>
                                </div>
                            </div>
                            <div class="detail-item">
                                <Icon name="heroicons:bars-3" class="detail-icon" />
                                <span class="detail-label">{{ t('admin.domains.features.navigation') }}:</span>
                                <div class="feature-indicators">
                                    <span v-if="domain.navigation?.nav_style" class="feature-indicator active">
                                        {{ domain.navigation.nav_style }}
                                    </span>
                                    <span v-if="domain.navigation?.custom_links?.length"
                                        class="feature-indicator active">
                                        {{ domain.navigation.custom_links.length }} Links
                                    </span>
                                    <span v-if="!hasNavigationFeatures(domain)"
                                        class="feature-indicator inactive">Default</span>
                                </div>
                            </div>
                        </div>

                        <div class="detail-row">
                            <div class="detail-item">
                                <Icon name="heroicons:calendar" class="detail-icon" />
                                <span class="detail-label">{{ t('admin.domains.columns.created') }}:</span>
                                <span class="detail-value">{{ formatDate(domain.created_at) }}</span>
                            </div>
                            <div v-if="domain.verified_at" class="detail-item">
                                <Icon name="heroicons:check-circle" class="detail-icon" />
                                <span class="detail-label">{{ t('admin.domains.columns.verified') }}:</span>
                                <span class="detail-value">{{ formatDate(domain.verified_at) }}</span>
                            </div>
                            <div v-if="domain.last_accessed" class="detail-item">
                                <Icon name="heroicons:clock" class="detail-icon" />
                                <span class="detail-label">{{ t('admin.domains.columns.lastAccessed') }}:</span>
                                <span class="detail-value">{{ formatDate(domain.last_accessed) }}</span>
                            </div>
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

        <!-- Domain Details Modal -->
        <Modal v-if="selectedDomain" :is-open="showDetailsModal" @close="closeDetailsModal"
            :title="`${t('admin.domains.details.title')} - ${selectedDomain.domain}`" size="lg">
            <div class="domain-details-modal">
                <div class="details-section">
                    <h4 class="section-title">{{ t('admin.domains.details.basicInfo') }}</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>{{ t('admin.domains.columns.domain') }}:</label>
                            <span>{{ selectedDomain.domain }}</span>
                        </div>
                        <div class="detail-item">
                            <label>{{ t('admin.domains.columns.status') }}:</label>
                            <StatusBadge :status="mapDomainStatus(selectedDomain.status)" />
                        </div>
                        <div class="detail-item">
                            <label>{{ t('admin.domains.details.ownerId') }}:</label>
                            <NuxtLink :to="`/character/${selectedDomain.owner_character_id}`" class="detail-link">
                                {{ selectedDomain.owner_character_name }}
                            </NuxtLink>
                        </div>
                        <div class="detail-item">
                            <label>{{ t('admin.domains.details.created') }}:</label>
                            <span>{{ formatDate(selectedDomain.created_at) }}</span>
                        </div>
                        <div v-if="selectedDomain.verified_at" class="detail-item">
                            <label>{{ t('admin.domains.details.lastVerified') }}:</label>
                            <span>{{ formatDate(selectedDomain.verified_at) }}</span>
                        </div>
                        <div v-if="selectedDomain.last_accessed" class="detail-item">
                            <label>{{ t('admin.domains.details.lastAccessed') }}:</label>
                            <span>{{ formatDate(selectedDomain.last_accessed) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Entities Section -->
                <div v-if="selectedDomain.entities?.length" class="details-section">
                    <h4 class="section-title">{{ t('admin.domains.details.entities') }} ({{
                        selectedDomain.entities.length }})</h4>
                    <div class="entities-detail-grid">
                        <div v-for="entity in selectedDomain.entities"
                            :key="`${entity.entity_type}-${entity.entity_id}`" class="entity-detail-card">
                            <div class="entity-detail-header">
                                <Icon :name="getEntityIcon(entity.entity_type)" class="entity-detail-icon" />
                                <div class="entity-detail-info">
                                    <div class="entity-detail-name">
                                        {{ entity.entity_name || `${formatEntityType(entity.entity_type)}
                                        ${entity.entity_id}` }}
                                    </div>
                                    <div class="entity-detail-type">{{ formatEntityType(entity.entity_type) }}</div>
                                </div>
                                <div class="entity-detail-badges">
                                    <span v-if="entity.primary" class="badge primary-badge">Primary</span>
                                    <span v-if="entity.show_in_nav" class="badge nav-badge">Navigation</span>
                                    <span v-if="entity.show_in_stats" class="badge stats-badge">Statistics</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="details-section">
                    <h4 class="section-title">{{ t('admin.domains.details.verificationInfo') }}</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>{{ t('admin.domains.details.verificationMethod') }}:</label>
                            <span>{{ selectedDomain.verification_method || 'Not verified' }}</span>
                        </div>
                        <div class="detail-item">
                            <label>{{ t('admin.domains.details.verificationToken') }}:</label>
                            <span class="verification-token">{{ selectedDomain.verification_token }}</span>
                        </div>
                        <div class="detail-item">
                            <label>{{ t('admin.domains.details.created') }}:</label>
                            <span>{{ formatDate(selectedDomain.created_at) }}</span>
                        </div>
                        <div v-if="selectedDomain.verified_at" class="detail-item">
                            <label>{{ t('admin.domains.details.lastVerified') }}:</label>
                            <span>{{ formatDate(selectedDomain.verified_at) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Enhanced Branding Section -->
                <div v-if="selectedDomain.branding && hasBrandingFeatures(selectedDomain)" class="details-section">
                    <h4 class="section-title">{{ t('admin.domains.details.customBranding') }}</h4>
                    <div class="branding-preview">
                        <!-- Colors -->
                        <div v-if="selectedDomain.branding.primary_color || selectedDomain.branding.secondary_color || selectedDomain.branding.accent_color"
                            class="branding-subsection">
                            <h5 class="branding-subtitle">Colors</h5>
                            <div class="color-grid">
                                <div v-if="selectedDomain.branding.primary_color" class="color-item">
                                    <label>Primary:</label>
                                    <div class="color-preview">
                                        <div class="color-swatch"
                                            :style="{ backgroundColor: selectedDomain.branding.primary_color }"></div>
                                        <span>{{ selectedDomain.branding.primary_color }}</span>
                                    </div>
                                </div>
                                <div v-if="selectedDomain.branding.secondary_color" class="color-item">
                                    <label>Secondary:</label>
                                    <div class="color-preview">
                                        <div class="color-swatch"
                                            :style="{ backgroundColor: selectedDomain.branding.secondary_color }"></div>
                                        <span>{{ selectedDomain.branding.secondary_color }}</span>
                                    </div>
                                </div>
                                <div v-if="selectedDomain.branding.accent_color" class="color-item">
                                    <label>Accent:</label>
                                    <div class="color-preview">
                                        <div class="color-swatch"
                                            :style="{ backgroundColor: selectedDomain.branding.accent_color }"></div>
                                        <span>{{ selectedDomain.branding.accent_color }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Images -->
                        <div v-if="selectedDomain.branding.logo_url || selectedDomain.branding.banner_image_url || selectedDomain.branding.background_image_url"
                            class="branding-subsection">
                            <h5 class="branding-subtitle">Images</h5>
                            <div class="image-grid">
                                <div v-if="selectedDomain.branding.logo_url" class="image-item">
                                    <label>Logo:</label>
                                    <img :src="selectedDomain.branding.logo_url" alt="Logo"
                                        class="image-preview logo-preview" />
                                </div>
                                <div v-if="selectedDomain.branding.banner_image_url" class="image-item">
                                    <label>Banner:</label>
                                    <img :src="selectedDomain.branding.banner_image_url" alt="Banner"
                                        class="image-preview banner-preview" />
                                </div>
                                <div v-if="selectedDomain.branding.background_image_url" class="image-item">
                                    <label>Background:</label>
                                    <img :src="selectedDomain.branding.background_image_url" alt="Background"
                                        class="image-preview bg-preview" />
                                </div>
                            </div>
                        </div>

                        <!-- Typography & Theme -->
                        <div v-if="selectedDomain.branding.font_family || selectedDomain.branding.theme_mode"
                            class="branding-subsection">
                            <h5 class="branding-subtitle">Typography & Theme</h5>
                            <div class="typography-grid">
                                <div v-if="selectedDomain.branding.font_family" class="typography-item">
                                    <label>Font Family:</label>
                                    <span>{{ selectedDomain.branding.font_family }}</span>
                                </div>
                                <div v-if="selectedDomain.branding.font_size_base" class="typography-item">
                                    <label>Base Font Size:</label>
                                    <span>{{ selectedDomain.branding.font_size_base }}px</span>
                                </div>
                                <div v-if="selectedDomain.branding.theme_mode" class="typography-item">
                                    <label>Theme Mode:</label>
                                    <span class="theme-badge" :class="`theme-${selectedDomain.branding.theme_mode}`">
                                        {{ selectedDomain.branding.theme_mode }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Custom CSS -->
                        <div v-if="selectedDomain.branding.custom_css" class="branding-subsection">
                            <h5 class="branding-subtitle">Custom CSS</h5>
                            <div class="css-preview">
                                <pre class="css-code">{{ selectedDomain.branding.custom_css }}</pre>
                            </div>
                        </div>

                        <!-- CSS Variables -->
                        <div v-if="selectedDomain.branding.css_variables && Object.keys(selectedDomain.branding.css_variables).length"
                            class="branding-subsection">
                            <h5 class="branding-subtitle">CSS Variables</h5>
                            <div class="variables-grid">
                                <div v-for="(value, key) in selectedDomain.branding.css_variables" :key="key"
                                    class="variable-item">
                                    <label>{{ key }}:</label>
                                    <span>{{ value }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Navigation Configuration -->
                <div v-if="selectedDomain.navigation && hasNavigationFeatures(selectedDomain)" class="details-section">
                    <h4 class="section-title">{{ t('admin.domains.details.navigation') }}</h4>
                    <div class="navigation-preview">
                        <div class="nav-settings-grid">
                            <div v-if="selectedDomain.navigation.nav_style" class="nav-setting-item">
                                <label>Style:</label>
                                <span class="nav-style-badge">{{ selectedDomain.navigation.nav_style }}</span>
                            </div>
                            <div v-if="selectedDomain.navigation.nav_position" class="nav-setting-item">
                                <label>Position:</label>
                                <span>{{ selectedDomain.navigation.nav_position }}</span>
                            </div>
                            <div class="nav-setting-item">
                                <label>Show Search:</label>
                                <span class="boolean-badge" :class="{ active: selectedDomain.navigation.show_search }">
                                    {{ selectedDomain.navigation.show_search ? 'Yes' : 'No' }}
                                </span>
                            </div>
                            <div class="nav-setting-item">
                                <label>Sticky:</label>
                                <span class="boolean-badge" :class="{ active: selectedDomain.navigation.sticky }">
                                    {{ selectedDomain.navigation.sticky ? 'Yes' : 'No' }}
                                </span>
                            </div>
                        </div>

                        <!-- Custom Links -->
                        <div v-if="selectedDomain.navigation.custom_links?.length" class="nav-links-section">
                            <h5 class="nav-subtitle">Custom Links ({{ selectedDomain.navigation.custom_links.length }})
                            </h5>
                            <div class="custom-links-list">
                                <div v-for="link in selectedDomain.navigation.custom_links" :key="link.position"
                                    class="custom-link-item">
                                    <div class="link-info">
                                        <Icon v-if="link.icon" :name="link.icon" class="link-icon" />
                                        <span class="link-label">{{ link.label }}</span>
                                        <Icon v-if="link.external" name="heroicons:arrow-top-right-on-square"
                                            class="external-icon" />
                                    </div>
                                    <div class="link-details">
                                        <span class="link-url">{{ link.url }}</span>
                                        <span class="link-access" :class="`access-${link.access_level}`">{{
                                            link.access_level }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Page Configuration -->
                <div v-if="selectedDomain.page_config && hasPageConfigFeatures(selectedDomain)" class="details-section">
                    <h4 class="section-title">{{ t('admin.domains.details.pageConfig') }}</h4>
                    <div class="page-config-preview">
                        <div v-if="selectedDomain.page_config.layout" class="config-item">
                            <label>Layout:</label>
                            <span class="layout-badge">{{ selectedDomain.page_config.layout }}</span>
                        </div>

                        <!-- Active Components -->
                        <div v-if="selectedDomain.page_config.components" class="components-section">
                            <h5 class="config-subtitle">Active Components</h5>
                            <div class="components-grid">
                                <div v-for="(enabled, component) in selectedDomain.page_config.components"
                                    :key="component" class="component-item" :class="{ enabled }">
                                    <Icon :name="enabled ? 'heroicons:check-circle' : 'heroicons:x-circle'"
                                        class="component-icon" :class="{ enabled }" />
                                    <span>{{ formatComponentName(component) }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Component Settings -->
                        <div v-if="selectedDomain.page_config.component_settings && Object.keys(selectedDomain.page_config.component_settings).length"
                            class="component-settings-section">
                            <h5 class="config-subtitle">Component Settings</h5>
                            <div class="settings-grid">
                                <div v-for="(value, setting) in selectedDomain.page_config.component_settings"
                                    :key="setting" class="setting-item">
                                    <label>{{ formatSettingName(setting) }}:</label>
                                    <span>{{ value }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <button @click="closeDetailsModal" class="btn btn-secondary">
                    {{ t('admin.domains.details.close') }}
                </button>
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
</script>

<style scoped>
.admin-domains {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.5rem;
    height: 100%;
    overflow-y: auto;
}

/* Header */
.domains-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
}

.header-info {
    flex: 1;
}

.domains-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.5rem;
}

.domains-description {
    color: rgb(156, 163, 175);
    line-height: 1.5;
}

.header-actions {
    display: flex;
    gap: 0.75rem;
}

.action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background-color: rgb(55, 55, 55);
    color: white;
    border: 1px solid rgb(75, 75, 75);
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.action-btn:hover {
    background-color: rgb(75, 75, 75);
}

.action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.action-icon {
    width: 1rem;
    height: 1rem;
}

/* Filters */
.filters-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background-color: rgb(31, 31, 31);
    border-radius: 0.5rem;
    border: 1px solid rgb(55, 55, 55);
}

.search-container {
    position: relative;
    display: flex;
    align-items: center;
    max-width: 400px;
}

.search-icon {
    position: absolute;
    left: 0.75rem;
    width: 1rem;
    height: 1rem;
    color: rgb(156, 163, 175);
}

.search-input {
    flex: 1;
    padding: 0.5rem 0.75rem 0.5rem 2.5rem;
    background-color: rgb(55, 55, 55);
    border: 1px solid rgb(75, 75, 75);
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
}

.search-clear-btn {
    position: absolute;
    right: 0.5rem;
    padding: 0.25rem;
    color: rgb(156, 163, 175);
    cursor: pointer;
}

.search-clear-btn:hover {
    color: white;
}

.clear-icon {
    width: 1rem;
    height: 1rem;
}

.filters-row {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.filter-select,
.page-size-select {
    padding: 0.5rem;
    background-color: rgb(55, 55, 55);
    border: 1px solid rgb(75, 75, 75);
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
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
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background-color: rgb(31, 31, 31);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
}

.stat-icon-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.5rem;
}

.stat-icon-container.verified {
    background-color: rgba(34, 197, 94, 0.1);
}

.stat-icon-container.pending {
    background-color: rgba(251, 191, 36, 0.1);
}

.stat-icon-container.failed {
    background-color: rgba(239, 68, 68, 0.1);
}

.stat-icon-container.total {
    background-color: rgba(59, 130, 246, 0.1);
}

.stat-icon {
    width: 1.25rem;
    height: 1.25rem;
}

.stat-icon-container.verified .stat-icon {
    color: rgb(34, 197, 94);
}

.stat-icon-container.pending .stat-icon {
    color: rgb(251, 191, 36);
}

.stat-icon-container.failed .stat-icon {
    color: rgb(239, 68, 68);
}

.stat-icon-container.total .stat-icon {
    color: rgb(59, 130, 246);
}

.stat-info {
    flex: 1;
}

.stat-label {
    display: block;
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
}

.stat-value {
    display: block;
    color: white;
    font-size: 1.25rem;
    font-weight: 600;
}

/* Domains List */
.domains-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.domain-card {
    background-color: rgb(31, 31, 31);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
    padding: 1.5rem;
}

.domain-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.domain-name {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.domain-icon {
    width: 1.25rem;
    height: 1.25rem;
    color: rgb(156, 163, 175);
}

.domain-title {
    color: white;
    font-size: 1.125rem;
    font-weight: 600;
}

.domain-status {
    margin-left: 0.5rem;
}

.domain-actions {
    display: flex;
    gap: 0.5rem;
}

.action-btn-icon {
    width: 1rem;
    height: 1rem;
}

.view-btn {
    background-color: rgb(59, 130, 246);
}

.view-btn:hover {
    background-color: rgb(37, 99, 235);
}

.status-btn {
    background-color: rgb(251, 191, 36);
    color: rgb(92, 62, 0);
}

.status-btn:hover {
    background-color: rgb(245, 158, 11);
}

.status-btn.active {
    background-color: rgb(34, 197, 94);
    color: white;
}

.status-btn.active:hover {
    background-color: rgb(22, 163, 74);
}

.delete-btn {
    background-color: rgb(239, 68, 68);
}

.delete-btn:hover {
    background-color: rgb(220, 38, 38);
}

/* Domain Details */
.domain-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.detail-row {
    display: flex;
    gap: 2rem;
}

.detail-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: rgb(209, 213, 219);
    font-size: 0.875rem;
}

.detail-icon {
    width: 1rem;
    height: 1rem;
    color: rgb(156, 163, 175);
}

.detail-label {
    color: rgb(156, 163, 175);
}

.detail-value {
    color: white;
}

.detail-link {
    color: rgb(59, 130, 246);
    text-decoration: none;
}

.detail-link:hover {
    text-decoration: underline;
}

/* Empty State */
.empty-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 3rem;
}

.empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
}

.empty-icon {
    width: 3rem;
    height: 3rem;
    color: rgb(156, 163, 175);
}

.empty-title {
    color: white;
    font-size: 1.125rem;
    font-weight: 600;
}

.empty-description {
    color: rgb(156, 163, 175);
    line-height: 1.5;
    max-width: 400px;
}

/* Pagination */
.pagination-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid rgb(55, 55, 55);
}

.pagination-btn {
    padding: 0.5rem 1rem;
    background-color: rgb(55, 55, 55);
    color: white;
    border: 1px solid rgb(75, 75, 75);
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
}

.pagination-btn:hover:not(:disabled) {
    background-color: rgb(75, 75, 75);
}

.pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination-info {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
    margin: 0 1rem;
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
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
}

.primary-badge {
    background-color: rgba(34, 197, 94, 0.1);
    color: rgb(34, 197, 94);
}

.nav-badge {
    background-color: rgba(59, 130, 246, 0.1);
    color: rgb(59, 130, 246);
}

.stats-badge {
    background-color: rgba(251, 191, 36, 0.1);
    color: rgb(251, 191, 36);
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
    gap: 0.5rem;
}

.entities-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    margin-left: 1.5rem;
}

.entity-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background-color: rgb(55, 55, 55);
    border-radius: 0.25rem;
    border: 1px solid rgb(75, 75, 75);
}

.entity-icon {
    width: 1rem;
    height: 1rem;
    color: rgb(156, 163, 175);
}

.entity-name {
    flex: 1;
    color: white;
    font-size: 0.875rem;
}

.entity-badges {
    display: flex;
    gap: 0.25rem;
}

.entity-badges .badge {
    font-size: 0.625rem;
    padding: 0.125rem 0.375rem;
}

/* Feature indicators */
.feature-indicators {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
}

.feature-indicator {
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
}

.feature-indicator.active {
    background-color: rgba(34, 197, 94, 0.1);
    color: rgb(34, 197, 94);
}

.feature-indicator.inactive {
    background-color: rgba(156, 163, 175, 0.1);
    color: rgb(156, 163, 175);
}

@media (max-width: 768px) {
    .admin-domains {
        padding: 1rem;
    }

    .domains-header {
        flex-direction: column;
        align-items: stretch;
    }

    .filters-row {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
    }

    .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    .domain-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
    }

    .domain-actions {
        justify-content: stretch;
    }

    .domain-actions .action-btn {
        flex: 1;
        justify-content: center;
    }

    .detail-row {
        flex-direction: column;
        gap: 0.5rem;
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
}
</style>
