<template>
  <div>
    <h1 class="text-3xl md:text-4xl font-bold mb-6">{{ t('legal.title') }}</h1>

    <section class="mb-8">
      <h2 class="text-xl font-semibold mb-3">{{ t('legal.disclaimer.title') }}</h2>
      <p class="mb-2">{{ t('legal.disclaimer.p1') }}</p>
      <p class="mb-2">{{ t('legal.disclaimer.p2') }}</p>
    </section>

    <section class="mb-8">
      <h2 class="text-xl font-semibold mb-3">{{ t('legal.license.title') }}</h2>
      <p class="mb-2">{{ t('legal.license.p1') }}</p>
      <p class="mb-2">{{ t('legal.license.p2') }}</p>
      <p class="mb-2">
        <a
          href="https://github.com/EVE-KILL/Thessia/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary-500 hover:underline"
        >
          {{ t('legal.license.viewLicense') }}
        </a>
      </p>
    </section>

    <section class="mb-8">
      <h2 class="text-xl font-semibold mb-3">{{ t('legal.ownership.title') }}</h2>
      <p class="mb-2">{{ t('legal.ownership.p1') }}</p>
      <p class="mb-2">
        <a
          href="https://www.ccpgames.com"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary-500 hover:underline"
        >
          {{ t('legal.ownership.ccpLink') }}
        </a>
      </p>
    </section>

    <section class="mb-8">
      <h2 class="text-xl font-semibold mb-3">{{ t('legal.data.title') }}</h2>
      <p class="mb-2">{{ t('legal.data.p1') }}</p>
      <p class="mb-2">{{ t('legal.data.p2') }}</p>
    </section>

    <section class="mb-8">
      <h2 class="text-xl font-semibold mb-3">{{ t('legal.contact.title') }}</h2>
      <p class="mb-2">{{ t('legal.contact.p1') }}</p>
      <p class="mb-2">
        <a
          href="https://github.com/EVE-KILL/Thessia/issues"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary-500 hover:underline"
        >
          {{ t('legal.contact.githubIssues') }}
        </a>
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

useSeoMeta({
  title: t("legalPageTitle"),
});
</script>
