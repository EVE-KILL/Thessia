import DOMPurify from "isomorphic-dompurify";
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";

// PrismJS will be loaded dynamically on client-side when needed
let Prism: any = null;
let prismLoading = false;

/**
 * Enhanced markdown renderer with micromark and PrismJS syntax highlighting
 * Designed for documentation and comment rendering
 * Renders on both server and client, with syntax highlighting only on client
 */
export const useEnhancedMarkdown = () => {
    /**
     * Load PrismJS dynamically on client-side
     */
    const loadPrismJS = async () => {
        if (Prism || prismLoading || import.meta.server) return;

        prismLoading = true;
        try {
            const prismModule = await import("prismjs");
            Prism = prismModule.default || prismModule;

            // Load additional languages
            // @ts-ignore - PrismJS components don't have type definitions
            await import("prismjs/components/prism-bash");
            // @ts-ignore
            await import("prismjs/components/prism-css");
            // @ts-ignore
            await import("prismjs/components/prism-javascript");
            // @ts-ignore
            await import("prismjs/components/prism-json");
            // @ts-ignore
            await import("prismjs/components/prism-markdown");
            // @ts-ignore
            await import("prismjs/components/prism-typescript");
            // @ts-ignore
            await import("prismjs/components/prism-yaml");
        } catch (error) {
            console.warn("Failed to load PrismJS:", error);
            Prism = null;
        } finally {
            prismLoading = false;
        }
    };

    /**
     * Post-process HTML to add PrismJS syntax highlighting (client-side only)
     */
    const addSyntaxHighlighting = async (html: string): Promise<string> => {
        if (!html || import.meta.server) return html;

        // Load PrismJS if not already loaded
        await loadPrismJS();

        if (!Prism) return html;

        try {
            // Create a temporary DOM to process the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            // Find all code blocks with language classes
            const codeBlocks = doc.querySelectorAll(
                'pre code[class*="language-"]'
            );

            codeBlocks.forEach((codeElement) => {
                const classes = codeElement.className;
                const langMatch = classes.match(/language-(\w+)/);

                if (langMatch?.[1]) {
                    const langName = langMatch[1];
                    const code = codeElement.textContent || "";

                    if (
                        langName &&
                        Prism.languages &&
                        Prism.languages[langName]
                    ) {
                        try {
                            const grammar = Prism.languages[langName];
                            if (grammar) {
                                const highlighted = Prism.highlight(
                                    code,
                                    grammar,
                                    langName
                                );
                                codeElement.innerHTML = highlighted;
                            }
                        } catch (err) {
                            console.warn(
                                "PrismJS highlighting failed for language:",
                                langName,
                                err
                            );
                        }
                    }
                }
            });

            // Find inline code that might benefit from highlighting
            const inlineCodes = doc.querySelectorAll("code:not(pre code)");
            inlineCodes.forEach((codeElement) => {
                const code = codeElement.textContent || "";

                // Simple inline code highlighting for common patterns
                if (
                    code.includes("function") ||
                    code.includes("const") ||
                    code.includes("let")
                ) {
                    try {
                        const jsGrammar = Prism.languages.javascript;
                        if (jsGrammar) {
                            const highlighted = Prism.highlight(
                                code,
                                jsGrammar,
                                "javascript"
                            );
                            codeElement.innerHTML = highlighted;
                            codeElement.classList.add("language-javascript");
                        }
                    } catch (err) {
                        // Fallback to default
                    }
                }
            });

            return doc.body.innerHTML;
        } catch (error) {
            console.error("Error adding syntax highlighting:", error);
            return html;
        }
    };

    /**
     * Post-process HTML to handle docs-specific link transformations (works on both server and client)
     */
    const processDocsLinks = (
        html: string,
        currentPath: string = ""
    ): string => {
        if (!html || !currentPath) return html;

        try {
            // On server, use a simple regex approach since DOMParser isn't available
            if (import.meta.server) {
                // Simple regex-based link transformation for server-side
                return html.replace(/<a href="([^"]+)"/g, (match, href) => {
                    if (!href || typeof href !== "string") return match;

                    let transformedHref = href;

                    // Transform internal documentation links
                    if (
                        href.startsWith("./") ||
                        href.startsWith("../") ||
                        href.endsWith(".md")
                    ) {
                        // Handle relative paths
                        if (href.startsWith("./")) {
                            const currentDir = currentPath
                                ? currentPath.split("/").slice(0, -1).join("/")
                                : "";
                            transformedHref = href
                                .replace("./", "")
                                .replace(".md", "");
                            if (currentDir) {
                                transformedHref = `${currentDir}/${transformedHref}`;
                            }
                        } else if (href.startsWith("../")) {
                            const currentParts = currentPath
                                ? currentPath.split("/")
                                : [];
                            let pathParts = [...currentParts];
                            let relativePath = href;

                            if (pathParts.length > 0) {
                                pathParts.pop();
                            }

                            while (relativePath.startsWith("../")) {
                                relativePath = relativePath.substring(3);
                                if (pathParts.length > 0) {
                                    pathParts.pop();
                                }
                            }

                            transformedHref = relativePath.replace(".md", "");
                            if (pathParts.length > 0) {
                                transformedHref = `${pathParts.join(
                                    "/"
                                )}/${transformedHref}`;
                            }
                        } else if (href.endsWith(".md")) {
                            transformedHref = href.replace(".md", "");
                        }

                        const docsUrl = `/docs/${transformedHref}`;
                        return `<a href="${docsUrl}" class="internal-docs-link" data-docs-path="${transformedHref}"`;
                    }

                    // External links
                    if (
                        href.startsWith("http://") ||
                        href.startsWith("https://")
                    ) {
                        return `<a href="${href}" target="_blank" rel="noopener noreferrer"`;
                    }

                    return match;
                });
            }

            // Client-side DOM processing
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            // Find all links
            const links = doc.querySelectorAll("a[href]");

            links.forEach((linkElement) => {
                const href = linkElement.getAttribute("href");
                if (!href || typeof href !== "string") return;

                let transformedHref = href;

                // Transform internal documentation links
                if (
                    href.startsWith("./") ||
                    href.startsWith("../") ||
                    href.endsWith(".md")
                ) {
                    // Handle relative paths
                    if (href.startsWith("./")) {
                        // Same directory: ./file.md -> current_path/file
                        const currentDir = currentPath
                            ? currentPath.split("/").slice(0, -1).join("/")
                            : "";
                        transformedHref = href
                            .replace("./", "")
                            .replace(".md", "");
                        if (currentDir) {
                            transformedHref = `${currentDir}/${transformedHref}`;
                        }
                    } else if (href.startsWith("../")) {
                        // Parent directory: ../file.md -> parent_path/file
                        const currentParts = currentPath
                            ? currentPath.split("/")
                            : [];
                        let pathParts = [...currentParts];
                        let relativePath = href;

                        // Remove current file from path
                        if (pathParts.length > 0) {
                            pathParts.pop();
                        }

                        // Process ../ segments
                        while (relativePath.startsWith("../")) {
                            relativePath = relativePath.substring(3);
                            if (pathParts.length > 0) {
                                pathParts.pop();
                            }
                        }

                        transformedHref = relativePath.replace(".md", "");
                        if (pathParts.length > 0) {
                            transformedHref = `${pathParts.join(
                                "/"
                            )}/${transformedHref}`;
                        }
                    } else if (href.endsWith(".md")) {
                        // Direct .md file: file.md -> file
                        transformedHref = href.replace(".md", "");
                    }

                    // Create internal link to docs viewer
                    const docsUrl = `/docs/${transformedHref}`;
                    linkElement.setAttribute("href", docsUrl);

                    // Add special classes for internal docs links
                    linkElement.classList.add("internal-docs-link");

                    // Add data attribute for Vue Router handling
                    linkElement.setAttribute("data-docs-path", transformedHref);
                }

                // External links - add target and rel attributes
                if (href.startsWith("http://") || href.startsWith("https://")) {
                    linkElement.setAttribute("target", "_blank");
                    linkElement.setAttribute("rel", "noopener noreferrer");
                }
            });

            return doc.body.innerHTML;
        } catch (error) {
            console.error("Error processing docs links:", error);
            return html;
        }
    };

    /**
     * Render markdown with enhanced features
     * @param content - Markdown content to render
     * @param options - Rendering options
     */
    const renderMarkdown = async (
        content: string,
        options: {
            currentPath?: string;
            allowDiagrams?: boolean;
            allowHtml?: boolean;
        } = {}
    ) => {
        if (!content) return "";

        try {
            const {
                currentPath = "",
                allowDiagrams = true,
                allowHtml = true,
            } = options;

            // Use micromark to render markdown with GitHub Flavored Markdown
            let rawHTML = micromark(content, {
                extensions: [gfm()],
                htmlExtensions: [gfmHtml()],
                allowDangerousHtml: allowHtml,
            });

            // Add syntax highlighting (async)
            rawHTML = await addSyntaxHighlighting(rawHTML);

            // Process docs-specific links if currentPath is provided
            if (currentPath) {
                rawHTML = processDocsLinks(rawHTML, currentPath);
            }

            // Sanitize HTML
            const sanitizedHTML = DOMPurify.sanitize(rawHTML, {
                ADD_TAGS: allowHtml
                    ? [
                          "iframe",
                          "blockquote",
                          "table",
                          "thead",
                          "tbody",
                          "tr",
                          "th",
                          "td",
                          "h1",
                          "h2",
                          "h3",
                          "h4",
                          "h5",
                          "h6",
                          "pre",
                          "code",
                          "span",
                          "div",
                      ]
                    : [
                          "blockquote",
                          "table",
                          "thead",
                          "tbody",
                          "tr",
                          "th",
                          "td",
                          "h1",
                          "h2",
                          "h3",
                          "h4",
                          "h5",
                          "h6",
                          "pre",
                          "code",
                          "span",
                      ],
                ADD_ATTR: [
                    "target",
                    "rel",
                    "href",
                    "src",
                    "alt",
                    "title",
                    "id",
                    "class",
                    "data-docs-path",
                    "data-lang",
                    "data-line",
                ],
                FORBID_TAGS: [
                    "script",
                    "style",
                    "form",
                    "input",
                    "button",
                    "textarea",
                    "select",
                    "option",
                ],
                FORBID_ATTR: [
                    "onerror",
                    "onload",
                    "onclick",
                    "onmouseover",
                    "onmouseout",
                    "eval",
                ],
            });

            return sanitizedHTML;
        } catch (error) {
            console.error("Error rendering enhanced markdown:", error);
            return DOMPurify.sanitize(content || "");
        }
    };

    /**
     * Simple markdown renderer without docs-specific features
     * Useful for comments and general content
     */
    const renderSimpleMarkdown = async (content: string) => {
        return await renderMarkdown(content, {
            currentPath: "",
            allowDiagrams: false,
            allowHtml: false,
        });
    };

    return {
        renderMarkdown,
        renderSimpleMarkdown,
    };
};
