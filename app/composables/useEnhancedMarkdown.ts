import DOMPurify from "isomorphic-dompurify";
import MarkdownIt from "markdown-it";

// Import PrismJS core and some common languages
import Prism from "prismjs";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-yaml";

/**
 * Enhanced markdown renderer with PrismJS syntax highlighting
 * Designed for documentation and comment rendering
 * CLIENT-SIDE ONLY - Do not use on server
 */
export const useEnhancedMarkdown = () => {
    // Prevent execution on server-side
    if (import.meta.server) {
        return {
            renderMarkdown: () => "",
            renderSimpleMarkdown: () => "",
        };
    }
    /**
     * Initialize the markdown renderer with plugins
     */
    const initializeRenderer = (currentPath: string = "") => {
        const md = new MarkdownIt({
            html: true, // Enable HTML tags in source
            xhtmlOut: false, // Use ">" for single tags (<br>)
            breaks: true, // Convert '\n' in paragraphs into <br>
            langPrefix: "language-", // CSS language prefix for fenced blocks
            linkify: true, // Autoconvert URL-like text to links
            typographer: true, // Enable some language-neutral replacement + quotes beautification
        });

        // Add custom PrismJS syntax highlighting
        const defaultFence =
            md.renderer.rules.fence ||
            function (tokens, idx, options, env, self) {
                return self.renderToken(tokens, idx, options);
            };

        md.renderer.rules.fence = function (tokens, idx, options, env, self) {
            const token = tokens[idx];
            if (!token) return defaultFence(tokens, idx, options, env, self);

            const info = token.info ? token.info.trim() : "";
            const langName = info ? info.split(/\s+/g)[0] : "";

            if (langName && Prism.languages[langName]) {
                try {
                    const grammar = Prism.languages[langName];
                    if (grammar) {
                        const highlighted = Prism.highlight(
                            token.content,
                            grammar,
                            langName
                        );
                        return `<pre class="language-${langName}"><code class="language-${langName}">${highlighted}</code></pre>`;
                    }
                } catch (err) {
                    console.warn(
                        "PrismJS highlighting failed for language:",
                        langName,
                        err
                    );
                }
            }

            // Fallback to default renderer
            return defaultFence(tokens, idx, options, env, self);
        };

        // Add highlighting for inline code
        const defaultCodeInline =
            md.renderer.rules.code_inline ||
            function (tokens, idx, options, env, self) {
                return self.renderToken(tokens, idx, options);
            };

        md.renderer.rules.code_inline = function (
            tokens,
            idx,
            options,
            env,
            self
        ) {
            const token = tokens[idx];
            if (!token)
                return defaultCodeInline(tokens, idx, options, env, self);

            // Simple inline code highlighting for common patterns
            if (
                token.content &&
                (token.content.includes("function") ||
                    token.content.includes("const") ||
                    token.content.includes("let"))
            ) {
                try {
                    const jsGrammar = Prism.languages.javascript;
                    if (jsGrammar) {
                        const highlighted = Prism.highlight(
                            token.content,
                            jsGrammar,
                            "javascript"
                        );
                        return `<code class="language-javascript">${highlighted}</code>`;
                    }
                } catch (err) {
                    // Fallback to default
                }
            }

            return defaultCodeInline(tokens, idx, options, env, self);
        };
        if (currentPath) {
            const defaultRender =
                md.renderer.rules.link_open ||
                function (tokens, idx, options, env, self) {
                    return self.renderToken(tokens, idx, options);
                };

            md.renderer.rules.link_open = function (
                tokens,
                idx,
                options,
                env,
                self
            ) {
                const token = tokens[idx];
                if (!token || !token.attrs)
                    return defaultRender(tokens, idx, options, env, self);

                const hrefIndex = token.attrIndex("href");
                if (hrefIndex >= 0 && token.attrs && token.attrs[hrefIndex]) {
                    const href = token.attrs[hrefIndex][1];

                    // Simple: if it's not a string, skip processing
                    if (typeof href !== "string" || !href.trim()) {
                        return defaultRender(tokens, idx, options, env, self);
                    }

                    // Update the token's href attribute with the cleaned string value
                    if (token.attrs && token.attrs[hrefIndex]) {
                        token.attrs[hrefIndex][1] = href;
                    }

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
                        if (token.attrs && token.attrs[hrefIndex]) {
                            token.attrs[hrefIndex][1] = docsUrl;
                        }

                        // Add special classes for internal docs links
                        const classIndex = token.attrIndex("class");
                        if (
                            classIndex >= 0 &&
                            token.attrs &&
                            token.attrs[classIndex]
                        ) {
                            token.attrs[classIndex][1] += " internal-docs-link";
                        } else {
                            token.attrPush(["class", "internal-docs-link"]);
                        }

                        // Add data attribute for Vue Router handling
                        token.attrPush(["data-docs-path", transformedHref]);
                    }

                    // External links - add target and rel attributes
                    if (
                        href.startsWith("http://") ||
                        href.startsWith("https://")
                    ) {
                        token.attrPush(["target", "_blank"]);
                        token.attrPush(["rel", "noopener noreferrer"]);
                    }
                }

                return defaultRender(tokens, idx, options, env, self);
            };
        }

        return md;
    };

    /**
     * Render markdown with enhanced features
     * @param content - Markdown content to render
     * @param options - Rendering options
     */
    const renderMarkdown = (
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

            const md = initializeRenderer(currentPath);
            const rawHTML = md.render(content);

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
    const renderSimpleMarkdown = (content: string) => {
        return renderMarkdown(content, {
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
