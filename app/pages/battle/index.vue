<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

// On mounted, redirect to the appropriate page
onMounted(() => {
    const killmailId = route.query.killmail;

    if (killmailId) {
        // If we have a killmail parameter, redirect to the battle/[id] page with the query parameter
        router.replace(`/battle/${killmailId}?killmail=true`);
    } else {
        // Otherwise redirect to the battles list page
        router.replace('/battles');
    }
});
</script>

<template>
    <div class="flex justify-center items-center min-h-[200px]">
        <UIcon name="lucide:loader" class="w-12 h-12 animate-spin text-primary" />
    </div>
</template>
