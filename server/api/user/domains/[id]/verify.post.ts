/**
 * Verify domain ownership through various methods
 */
export default defineEventHandler(async (event) => {
    // Add cache-control headers to prevent caching
    setResponseHeaders(event, {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
    });

    // Only allow POST method
    if (getMethod(event) !== "POST") {
        throw createError({
            statusCode: 405,
            statusMessage: "Method not allowed",
        });
    }

    // Get the cookie value using the hardcoded cookie name
    const cookieName = "evelogin";
    const cookie = getCookie(event, cookieName);

    if (!cookie) {
        throw createError({
            statusCode: 401,
            statusMessage: "Authentication required",
        });
    }

    // Find the user by uniqueIdentifier
    const user = await Users.findOne({ uniqueIdentifier: cookie });

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid authentication",
        });
    }

    const domainId = getRouterParam(event, "id");

    if (!domainId) {
        throw createError({
            statusCode: 400,
            statusMessage: "Domain ID required",
        });
    }

    try {
        // Get the request body
        const body = await readBody(event);
        const { method } = body;

        if (!method || !["dns", "meta", "file"].includes(method)) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Invalid verification method. Must be dns, meta, or file",
            });
        }

        // Find the domain
        const domain = await CustomDomains.findOne({
            domain_id: domainId,
            owner_character_id: user.characterId,
        });

        if (!domain) {
            throw createError({
                statusCode: 404,
                statusMessage: "Domain not found",
            });
        }

        if (domain.verified) {
            return {
                success: true,
                already_verified: true,
                message: "Domain is already verified",
            };
        }

        let verificationResult = false;
        let errorMessage = "";

        try {
            switch (method) {
                case "dns":
                    verificationResult = await verifyDNSRecord(domain);
                    break;
                case "meta":
                    verificationResult = await verifyMetaTag(domain);
                    break;
                case "file":
                    verificationResult = await verifyFile(domain);
                    break;
            }
        } catch (error: any) {
            console.error(`Verification failed for ${domain.domain}:`, error);
            errorMessage = error.message || "Verification failed";
        }

        if (verificationResult) {
            // Update domain as verified and active
            domain.verified = true;
            domain.active = true;
            domain.verification_method = method;
            domain.dns_verified_at = new Date();
            await domain.save();

            // Clear domain cache since status changed
            // Import from the correct helpers location
            const { invalidateDomainCache } = await import(
                "../../../../helpers/domainCache"
            );
            await invalidateDomainCache(domain.domain);

            return {
                success: true,
                verified: true,
                method: method,
                verified_at: domain.dns_verified_at,
                message: "Domain successfully verified and activated",
            };
        } else {
            return {
                success: false,
                verified: false,
                method: method,
                error:
                    errorMessage ||
                    getVerificationInstructions(
                        method,
                        domain.verification_token
                    ),
                message: "Domain verification failed",
            };
        }
    } catch (error: any) {
        console.error("Error verifying domain:", error);

        // Re-throw if it's already a createError
        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to verify domain",
        });
    }
});

/**
 * Verify DNS TXT record
 */
async function verifyDNSRecord(domain: any): Promise<boolean> {
    try {
        const dns = await import("dns").then((m) => m.promises);
        const txtRecords = await dns.resolveTxt(domain.domain);

        // Look for our verification token in TXT records
        const expectedRecord = `eve-kill-verification=${domain.verification_token}`;

        for (const recordSet of txtRecords) {
            for (const record of recordSet) {
                if (record.includes(domain.verification_token)) {
                    return true;
                }
            }
        }

        return false;
    } catch (error) {
        console.error("DNS verification error:", error);
        return false;
    }
}

/**
 * Verify meta tag on website
 */
async function verifyMetaTag(domain: any): Promise<boolean> {
    try {
        const response = await fetch(`https://${domain.domain}`, {
            headers: {
                "User-Agent": "EVE-KILL Domain Verification Bot",
            },
            timeout: 10000,
        });

        if (!response.ok) {
            return false;
        }

        const html = await response.text();

        // Look for meta tag with our verification token
        const metaRegex =
            /<meta\s+name=["']eve-kill-verification["']\s+content=["']([^"']+)["']/i;
        const match = html.match(metaRegex);

        return !!(match && match[1] === domain.verification_token);
    } catch (error) {
        console.error("Meta tag verification error:", error);
        return false;
    }
}

/**
 * Verify file upload method
 */
async function verifyFile(domain: any): Promise<boolean> {
    try {
        const response = await fetch(
            `https://${domain.domain}/eve-kill-verification.txt`,
            {
                headers: {
                    "User-Agent": "EVE-KILL Domain Verification Bot",
                },
                timeout: 10000,
            }
        );

        if (!response.ok) {
            return false;
        }

        const content = await response.text();
        return content.trim() === domain.verification_token;
    } catch (error) {
        console.error("File verification error:", error);
        return false;
    }
}

/**
 * Get verification instructions for each method
 */
function getVerificationInstructions(method: string, token: string): string {
    switch (method) {
        case "dns":
            return `Add a TXT record to your domain with the value: eve-kill-verification=${token}`;
        case "meta":
            return `Add this meta tag to your website's <head> section: <meta name="eve-kill-verification" content="${token}">`;
        case "file":
            return `Upload a file named 'eve-kill-verification.txt' to your domain root containing: ${token}`;
        default:
            return "Unknown verification method";
    }
}
