<template>
    <div class="admin-placeholder">
        <div class="placeholder-content">
            <Icon name="heroicons:chart-bar" class="placeholder-icon" />
            <h3 class="placeholder-title">{{ t('admin.pages.overview') }}</h3>
            <p class="placeholder-description">
                {{ t('admin.placeholder.description') }}
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
</script>

<style scoped>
.admin-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
}

.placeholder-content {
    text-align: center;
    max-width: 400px;
}

.placeholder-icon {
    width: 3rem;
    height: 3rem;
    color: rgb(156, 163, 175);
    margin-bottom: 1rem;
}

.placeholder-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.5rem;
}

.placeholder-description {
    color: rgb(156, 163, 175);
    line-height: 1.5;
}
</style>
