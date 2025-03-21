import { useState } from "#app";
import { getCookie } from "h3";
import type { UserData } from "~/composables/useAuth";

export default defineNuxtPlugin(async (nuxtApp) => {
    const loading = useState<boolean>("auth.loading", () => true);
    // Initialize auth state
    const authenticated = useState<boolean>("auth.authenticated", () => false);
    const user = useState<UserData>("auth.user", () => ({
        characterId: null,
        characterName: null,
        corporationName: null,
        corporationId: null,
        allianceName: null,
        allianceId: null,
        scopes: [],
        canFetchCorporationKillmails: false,
        dateExpiration: null,
        administrator: false,
    }));

    try {
        // Client-side authentication will be handled by the component
        if (import.meta.client) {
            loading.value = false;
            return;
        }

        // Define the cookie name directly
        const cookieName = 'evelogin';

        // Server-side rendering auth check
        if (import.meta.server) {
            const event = nuxtApp.ssrContext?.event;

            if (event) {
                const cookieValue = getCookie(event, cookieName);

                if (cookieValue) {
                    try {
                        const { data } = await useFetch("/api/auth/me", {
                            credentials: "include",
                        });

                        if (data.value?.authenticated && data.value?.user) {
                            authenticated.value = true;
                            user.value = {
                                characterId: data.value.user.characterId,
                                characterName: data.value.user.characterName,
                                corporationName:
                                    data.value.user.corporationName,
                                corporationId: data.value.user.corporationId,
                                allianceName:
                                    data.value.user.allianceName || "",
                                allianceId: data.value.user.allianceId || 0,
                                scopes: data.value.user.scopes || [],
                                canFetchCorporationKillmails:
                                    data.value.user
                                        .canFetchCorporationKillmails,
                                dateExpiration: data.value.user.dateExpiration,
                                administrator: data.value.user.administrator,
                            };

                            // If we successfully authenticated, we could preload the EVE image URLs
                            // This is optional but can improve performance by having the URLs ready
                            if (authenticated.value && user.value.characterId) {
                                // Use the useEveImages composable logic to precompute URLs
                                const eveImages = useEveImages();

                                // We could store these for later use or just let components compute them
                                // const characterPortraitUrl = eveImages.getCharacterPortrait(user.value.characterId);
                                // const corporationLogoUrl = user.value.corporationId ? eveImages.getCorporationLogo(user.value.corporationId) : null;
                                // const allianceLogoUrl = user.value.allianceId ? eveImages.getAllianceLogo(user.value.allianceId) : null;
                            }
                        }
                    } catch (err) {
                        // Silently fail on server
                    }
                }
            }
        }
    } catch (err) {
        // Silently fail
    } finally {
        loading.value = false;
    }
});
