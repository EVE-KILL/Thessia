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
        const { method, token } = body;

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
            // Use the token from the request if provided, otherwise use stored token
            const verificationToken = token || domain.verification_token;

            switch (method) {
                case "dns":
                    verificationResult = await verifyDNSRecord(
                        domain,
                        verificationToken
                    );
                    break;
                case "meta":
                    verificationResult = await verifyMetaTag(
                        domain,
                        verificationToken
                    );
                    break;
                case "file":
                    verificationResult = await verifyFile(
                        domain,
                        verificationToken
                    );
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
async function verifyDNSRecord(
    domain: any,
    verificationToken?: string
): Promise<boolean> {
    try {
        // Extract root domain from the full domain
        // For test.eve-kill.com -> eve-kill.com
        // For subdomain.example.com -> example.com
        const domainParts = domain.domain.split(".");
        const rootDomain = domainParts.slice(-2).join(".");
        const verificationDomain = `_evekill-verification.${rootDomain}`;

        // Try multiple DNS resolution methods for production reliability
        let txtRecords: string[][] = [];
        const tokenToCheck = verificationToken || domain.verification_token;

        try {
            // Method 1: Use Node.js built-in DNS with Cloudflare servers
            const dns = await import("dns").then((m) => m.promises);
            dns.setServers(["1.1.1.1", "1.0.0.1"]);
            txtRecords = await dns.resolveTxt(verificationDomain);
        } catch (dnsError: any) {
            console.warn(
                `Built-in DNS failed for ${verificationDomain}, trying HTTP-based lookup:`,
                dnsError.message
            );

            // Method 2: Use DNS over HTTPS (DoH) as fallback for production environments
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const dohResponse = await fetch(
                    `https://1.1.1.1/dns-query?name=${verificationDomain}&type=TXT`,
                    {
                        headers: {
                            Accept: "application/dns-json",
                            "User-Agent": "EVE-KILL Domain Verification",
                        },
                        signal: controller.signal,
                    }
                );

                clearTimeout(timeoutId);

                if (dohResponse.ok) {
                    const dnsData = await dohResponse.json();
                    if (dnsData.Answer) {
                        txtRecords = dnsData.Answer.filter(
                            (record: any) => record.type === 16
                        ) // TXT records
                            .map((record: any) => [
                                record.data.replace(/^"|"$/g, ""),
                            ]); // Remove quotes
                    }
                } else {
                    throw new Error(
                        `DoH request failed with status ${dohResponse.status}`
                    );
                }
            } catch (dohError: any) {
                console.error(
                    `DoH DNS lookup also failed for ${verificationDomain}:`,
                    dohError.message
                );
                throw new Error(
                    `DNS resolution failed: ${dnsError.message}. Fallback DoH also failed: ${dohError.message}`
                );
            }
        }

        // Look for our verification token in TXT records
        for (const recordSet of txtRecords) {
            for (const record of recordSet) {
                // Check if the record matches the expected token
                if (record.trim() === tokenToCheck) {
                    return true;
                }
            }
        }
        return false;
    } catch (error: any) {
        console.error(`DNS verification error for ${domain.domain}:`, error);
        const domainParts = domain.domain.split(".");
        const rootDomain = domainParts.slice(-2).join(".");
        const verificationDomain = `_evekill-verification.${rootDomain}`;
        const tokenToCheck = verificationToken || domain.verification_token;

        // Provide more specific error messages
        if (error.code === "ENODATA" || error.message.includes("ENODATA")) {
            throw new Error(
                `No TXT records found at ${verificationDomain}. Please add a TXT record with the value: ${tokenToCheck}`
            );
        } else if (
            error.code === "ENOTFOUND" ||
            error.message.includes("ENOTFOUND")
        ) {
            throw new Error(
                `DNS resolution failed for ${verificationDomain}. Please ensure the subdomain exists and has the required TXT record.`
            );
        } else if (
            error.code === "ETIMEOUT" ||
            error.message.includes("timed out")
        ) {
            throw new Error(
                `DNS lookup timed out for ${verificationDomain}. Please try again later.`
            );
        } else {
            throw new Error(
                `DNS verification failed for ${verificationDomain}: ${error.message}`
            );
        }
    }
}

/**
 * Verify meta tag on website
 */
async function verifyMetaTag(
    domain: any,
    verificationToken?: string
): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`https://${domain.domain}`, {
            headers: {
                "User-Agent": "EVE-KILL Domain Verification Bot",
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return false;
        }

        const html = await response.text();

        // Look for meta tag with our verification token
        const metaRegex =
            /<meta\s+name=["']eve-kill-verification["']\s+content=["']([^"']+)["']/i;
        const match = html.match(metaRegex);

        const tokenToCheck = verificationToken || domain.verification_token;
        return !!(match && match[1] === tokenToCheck);
    } catch (error) {
        return false;
    }
}

/**
 * Verify file upload method
 */
async function verifyFile(
    domain: any,
    verificationToken?: string
): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(
            `https://${domain.domain}/eve-kill-verification.txt`,
            {
                headers: {
                    "User-Agent": "EVE-KILL Domain Verification Bot",
                },
                signal: controller.signal,
            }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
            return false;
        }

        const content = await response.text();
        const tokenToCheck = verificationToken || domain.verification_token;
        return content.trim() === tokenToCheck;
    } catch (error) {
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
