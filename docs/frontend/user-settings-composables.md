# User Settings with Pinia Stores

This document provides examples of how to use the new Pinia-based user settings system.

## Example 1: Getting user's default pages

```typescript
// In any Vue component or composable:
const userDefaults = useUserDefaults();

// Get specific default pages
const defaultCharacterPage = userDefaults.getDefaultCharacterPage(); // Returns: "dashboard", "kills", "losses", etc.
const defaultCorporationPage = userDefaults.getDefaultCorporationPage();
const defaultAlliancePage = userDefaults.getDefaultAlliancePage();

// Check loading state
if (userDefaults.isLoading.value) {
  // Show loading spinner
}
```

## Example 2: Managing user settings with Pinia store

```typescript
const userSettingsStore = useUserSettingsStore();

// Get all settings (reactive)
const allSettings = userSettingsStore.currentSettings; // { killmailDelay: 0, defaultCharacterPage: "dashboard", ... }

// Get specific settings with fallbacks
const killmailDelay = userSettingsStore.getSetting('killmailDelay', 0);
const characterPage = userSettingsStore.getSetting('defaultCharacterPage', 'dashboard');

// Update a single setting
await userSettingsStore.updateSetting('killmailDelay', 24);

// Update multiple settings at once
await userSettingsStore.updateSettings({
  killmailDelay: 12,
  defaultCharacterPage: 'kills',
  defaultCorporationPage: 'stats'
});

// Convenient getters (reactive)
const killmailDelayComputed = userSettingsStore.killmailDelay; // reactive getter
const defaultCharPageComputed = userSettingsStore.defaultCharacterPage; // reactive getter
```

## Example 3: Using in character/corporation/alliance pages

```typescript
// In character/[id].vue page:
const userDefaults = useUserDefaults();
const router = useRouter();

// Redirect to user's preferred default page
const defaultTab = userDefaults.getDefaultCharacterPage();
if (route.params.tab === undefined) {
  await navigateTo(`/character/${characterId}/${defaultTab}`);
}

/*
 * Key Features:
 *
 * 1. Automatic caching - Settings are cached for 5 minutes to avoid unnecessary API calls
 * 2. Reactive updates - All values are reactive and update across the app when changed
 * 3. Authentication-aware - Automatically handles login/logout state changes
 * 4. Optimistic updates - UI updates immediately, reverts on API errors
 * 5. Fallback support - Always returns sensible defaults when user not authenticated
 * 6. TypeScript support - Full type safety for all settings
 * 7. Error handling - Graceful degradation when API calls fail
 */
