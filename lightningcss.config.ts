import browserslist from "browserslist";
import { browserslistToTargets, Features } from "lightningcss";
import { defineLightningCSSConfig } from "nuxt-lightningcss";

export default defineLightningCSSConfig({
    // Browser targets - optimized for modern EVE-KILL users
    targets: browserslistToTargets(
        browserslist([
            "> 1%",
            "last 2 versions",
            "Firefox ESR",
            "not dead",
            "not IE 11", // EVE-KILL likely doesn't need IE11 support
        ])
    ),

    // Enable modern CSS features that are useful for EVE-KILL
    include:
        Features.Nesting |
        Features.CustomMediaQueries |
        Features.LogicalProperties |
        Features.LightDark,

    // Enable CSS draft features for modern syntax
    drafts: {
        customMedia: true, // Useful for responsive design with EVE UI
    },

    // Error recovery - useful for development
    errorRecovery: true,
});
