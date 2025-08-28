import { Socket } from "net";
import { connect as tlsConnect } from "tls";

interface SSLInfo {
    valid: boolean;
    issuer: string;
    subject: string;
    validFrom: string;
    expiresAt: string;
    fingerprint: string;
    serialNumber: string;
    protocol: string | null;
    cipher: string;
    keyUsage: string[];
    altNames: string[];
    authorizationError: Error | null;
    daysUntilExpiry: number;
    status: "valid" | "invalid" | "expired" | "expiring";
}

/**
 * SSL Certificate checker API endpoint
 * Checks SSL certificate information for a custom domain
 */
export default defineEventHandler(async (event) => {
    const domain = getRouterParam(event, "domain");

    if (!domain) {
        throw createError({
            statusCode: 400,
            statusMessage: "Domain parameter required",
        });
    }

    try {
        // Verify domain belongs to user (if authenticated)
        const cookie = getCookie(event, "evelogin");
        if (cookie) {
            const user = await Users.findOne({ uniqueIdentifier: cookie });
            if (user) {
                // Check if user owns this domain
                const domainConfig = await CustomDomains.findOne({
                    domain: domain.toLowerCase(),
                    owner_character_id: user.characterId,
                });

                if (!domainConfig) {
                    throw createError({
                        statusCode: 403,
                        statusMessage:
                            "Access denied - domain not owned by user",
                    });
                }
            }
        }

        // Check SSL certificate
        const sslInfo = await checkSSLCertificate(domain);

        return {
            success: true,
            domain,
            ssl: sslInfo,
        };
    } catch (error: any) {
        console.error("SSL check error for domain:", domain, error);

        // If it's already a createError, re-throw it
        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: error.message || "Failed to check SSL certificate",
        });
    }
});

/**
 * Check SSL certificate information for a domain
 */
async function checkSSLCertificate(domain: string): Promise<SSLInfo> {
    return new Promise((resolve, reject) => {
        const socket = new Socket();

        // Set timeout
        const timeout = setTimeout(() => {
            socket.destroy();
            reject(new Error("SSL check timeout"));
        }, 10000);

        socket.connect(443, domain, () => {
            const tlsSocket = tlsConnect(
                {
                    socket: socket,
                    servername: domain,
                    rejectUnauthorized: false,
                },
                () => {
                    clearTimeout(timeout);

                    try {
                        const cert = tlsSocket.getPeerCertificate(true);
                        const cipher = tlsSocket.getCipher();
                        const protocol = tlsSocket.getProtocol();

                        if (!cert || Object.keys(cert).length === 0) {
                            tlsSocket.destroy();
                            reject(new Error("No certificate found"));
                            return;
                        }

                        // Calculate days until expiry
                        const now = new Date();
                        const expiryDate = new Date(cert.valid_to);
                        const daysUntilExpiry = Math.floor(
                            (expiryDate.getTime() - now.getTime()) /
                                (1000 * 60 * 60 * 24)
                        );

                        // Determine overall status
                        let status:
                            | "valid"
                            | "invalid"
                            | "expired"
                            | "expiring";
                        if (daysUntilExpiry < 0) {
                            status = "expired";
                        } else if (daysUntilExpiry <= 30) {
                            status = "expiring";
                        } else if (tlsSocket.authorized) {
                            status = "valid";
                        } else {
                            status = "invalid";
                        }

                        const sslInfo: SSLInfo = {
                            valid: tlsSocket.authorized,
                            issuer:
                                cert.issuer?.CN || cert.issuer?.O || "Unknown",
                            subject: cert.subject?.CN || domain,
                            validFrom: cert.valid_from,
                            expiresAt: cert.valid_to,
                            fingerprint: cert.fingerprint,
                            serialNumber: cert.serialNumber,
                            protocol: protocol,
                            cipher: cipher
                                ? `${cipher.name} (${cipher.version})`
                                : "Unknown",
                            keyUsage: cert.ext_key_usage || [],
                            altNames: cert.subjectaltname
                                ? cert.subjectaltname
                                      .split(", ")
                                      .map((name: string) =>
                                          name.replace("DNS:", "")
                                      )
                                : [],
                            authorizationError:
                                tlsSocket.authorizationError || null,
                            daysUntilExpiry,
                            status,
                        };

                        tlsSocket.destroy();
                        resolve(sslInfo);
                    } catch (error: any) {
                        tlsSocket.destroy();
                        reject(error);
                    }
                }
            );

            tlsSocket.on("error", (error: any) => {
                clearTimeout(timeout);
                reject(error);
            });
        });

        socket.on("error", (error: any) => {
            clearTimeout(timeout);
            reject(error);
        });

        socket.on("timeout", () => {
            clearTimeout(timeout);
            socket.destroy();
            reject(new Error("Connection timeout"));
        });
    });
}
