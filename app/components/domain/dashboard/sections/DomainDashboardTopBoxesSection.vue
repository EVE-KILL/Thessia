<template>
    <div class="space-y-6">
        <KillsTopBox title="Top Killers" :domain="domain" entity-type="character" time-range="7d"
            :entities="topKillersByCharacter" :loading="loading" :days="days" />

        <KillsTopBox title="Top Corporations" :domain="domain" entity-type="corporation" time-range="7d"
            :entities="topKillersByCorporation" :loading="loading" :days="days" />

        <KillsTopBox title="Top Alliances" :domain="domain" entity-type="alliance" time-range="7d"
            :entities="topKillersByAlliance" :loading="loading" :days="days" />
    </div>
</template>

<script setup lang="ts">
import KillsTopBox from '~/components/kills/KillsTopBox.vue'

interface Props {
    domain: string
    topKillersByCharacter: any[]
    topKillersByCorporation: any[]
    topKillersByAlliance: any[]
    loading: boolean
    days: number
}

const props = withDefaults(defineProps<Props>(), {
    topKillersByCharacter: () => [],
    topKillersByCorporation: () => [],
    topKillersByAlliance: () => [],
    loading: false,
    days: 7
})
</script>
