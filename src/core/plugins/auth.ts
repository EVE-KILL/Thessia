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
