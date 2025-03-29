/**
 * Composable for handling EVE Online specific HTML content parsing
 */
export const useEveHtmlParser = () => {
  // Define common EVE Online type IDs for proper link handling
  const STATION_TYPE_IDS = [
    54, 56, 57, 58, 59, 1529, 1530, 1531, 1926, 1927, 1928, 1929, 1930, 1931, 1932, 2071, 2496,
    2497, 2498, 2499, 2500, 2501, 2502, 3864, 3865, 3866, 3867, 3868, 3869, 3870, 3871, 3872, 4023,
    4024, 9856, 9857, 9867, 9868, 9873, 10795, 12242, 12294, 12295, 19757, 21642, 21644, 21645,
    21646, 22296, 22297, 22298, 29323, 29387, 29388, 29389, 29390, 34325, 34326, 52678, 59956,
    71361, 74397,
  ];

  const CHARACTER_TYPE_IDS = [
    1373, 1374, 1375, 1376, 1377, 1378, 1379, 1380, 1381, 1382, 1383, 1384, 1385, 1386, 34574,
  ];

  /**
   * Creates a DOM parser that works in both browser and server environments
   */
  const createDOMParser = () => {
    if (typeof DOMParser !== "undefined") {
      return new DOMParser();
    }

    // For server-side rendering, use a minimal implementation
    // This will be replaced by a proper DOM parser in the browser
    return {
      parseFromString: (html: string) => {
        // Return a minimal document-like object for SSR
        return {
          body: {
            innerHTML: html,
          },
        };
      },
    };
  };

  /**
   * Processes and transforms EVE-specific links to standard website URLs
   *
   * @param {string} href - The EVE specific href content
   * @returns {string} Converted URL for the website
   */
  const renderEveHref = (href: string): string => {
    const INVENTORY_INFO_PREFIX = "showinfo:";
    const WAR_REPORT_PREFIX = "warReport:";
    const KILL_REPORT_PREFIX = "killReport:";

    if (href.startsWith(INVENTORY_INFO_PREFIX)) {
      const targetType = href.slice(INVENTORY_INFO_PREFIX.length).split("//");

      if (targetType.length === 1) {
        return `/type/${targetType[0]}`;
      }

      // Handle different types based on the type ID
      if (targetType[0] === "1") return `/item/${targetType[1]}`; // Item type
      if (targetType[0] === "2") return `/corporation/${targetType[1]}`; // Corporation
      if (targetType[0] === "3") return `/region/${targetType[1]}`; // Region
      if (targetType[0] === "4") return `/constellation/${targetType[1]}`; // Constellation
      if (targetType[0] === "5") return `/system/${targetType[1]}`; // System
      if (targetType[0] === "16159") return `/alliance/${targetType[1]}`; // Alliance
      if (targetType[0] === "35834") return "#"; // Goes to a specific station/citadel best i can tell

      // Handle special types
      const typeId = Number.parseInt(targetType[0] ?? "");
      if (CHARACTER_TYPE_IDS.includes(typeId)) return `/character/${targetType[1]}`; // Character types
      if (STATION_TYPE_IDS.includes(typeId)) return `/station/${targetType[1]}`; // Station types
    }

    if (href.startsWith(WAR_REPORT_PREFIX)) {
      const warId = href.slice(WAR_REPORT_PREFIX.length);
      return `/war/${warId}`; // War reports
    }

    if (href.startsWith(KILL_REPORT_PREFIX)) {
      // Extract just the kill ID from format killReport:123:hash
      const killId = href.split(":")[1];
      return `/kill/${killId}`; // Kill reports
    }

    return href;
  };

  /**
   * Pre-processes EVE HTML content before DOM parsing
   * Handles escaped characters and Python string format
   *
   * @param {string} content - Raw EVE HTML content
   * @returns {string} Pre-processed content ready for DOM parsing
   */
  const preProcessContent = (content: string): string => {
    if (!content) return "";

    // Handle Python/Unicode string format
    if (content.startsWith("u'") && content.endsWith("'")) {
      content = content.slice(2, -1);
    } else if (content.startsWith('u"') && content.endsWith('"')) {
      content = content.slice(2, -1);
    }

    // Replace escaped single quotes
    content = content.replace(/\\'/g, "'");

    // Replace unicode escape sequences
    content = content.replace(/\\u([\dA-Fa-f]{4})/g, (_, hex) => {
      return String.fromCharCode(Number.parseInt(hex, 16));
    });

    // Wrap content in a container for proper parsing
    return `<div>${content}</div>`;
  };

  /**
   * Processes a DOM node and its children to convert EVE HTML elements
   *
   * @param {Node} node - DOM node to process
   */
  const processNode = (node: Node): void => {
    // Skip non-element nodes (text, comments, etc.)
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as Element;

    // Process by tag name
    switch (element.tagName.toLowerCase()) {
      case "color":
        // Convert color tags to spans
        if (element.hasAttribute("0x")) {
          const hexColor = element.getAttribute("0x") || "";
          const colorValue = `#${hexColor.slice(2, 8)}`;

          const span = document.createElement("span");
          span.style.color = colorValue;

          // Move all child nodes to the new span
          while (element.firstChild) {
            span.appendChild(element.firstChild);
          }

          // Replace the original element with the span
          if (element.parentNode) {
            element.parentNode.replaceChild(span, element);
          }
        }
        break;

      case "font": {
        // Convert font tags to spans
        const span = document.createElement("span");

        // Handle color attribute
        if (element.hasAttribute("color")) {
          let color = element.getAttribute("color") || "";

          // Handle hex color format
          if (color.startsWith("#") && color.length === 9) {
            color = `#${color.slice(1, 7)}`; // Remove alpha channel
          }

          span.style.color = color;
        }

        // Handle size attribute
        if (element.hasAttribute("size")) {
          const size = element.getAttribute("size") || "";
          span.style.fontSize = `${size}px`;
        }

        // Move all child nodes to the new span
        while (element.firstChild) {
          span.appendChild(element.firstChild);
        }

        // Replace the original element with the span
        if (element.parentNode) {
          element.parentNode.replaceChild(span, element);
        }
        break;
      }

      case "a":
        // Process links
        if (element.hasAttribute("href")) {
          const href = element.getAttribute("href") || "";

          // Handle killReport links
          if (href.startsWith("killReport:")) {
            const killId = href.split(":")[1];
            element.setAttribute("href", `/kill/${killId}`);
          }
          // Handle warReport links
          else if (href.startsWith("warReport:")) {
            const warId = href.split(":")[1];
            element.setAttribute("href", `/war/${warId}`);
          }
          // Handle showinfo links
          else if (href.startsWith("showinfo:")) {
            element.setAttribute("href", renderEveHref(href));
          }
          // External links
          else if (!href.startsWith("/")) {
            element.setAttribute("target", "_blank");
            element.setAttribute("rel", "noopener noreferrer");
          }
        }
        break;

      case "url": {
        // Convert url tags to a tags
        const url = element.textContent || "";
        const linkTarget = element.getAttribute("url") || url;

        const a = document.createElement("a");
        a.setAttribute("href", linkTarget);
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
        a.textContent = url;

        if (element.parentNode) {
          element.parentNode.replaceChild(a, element);
        }
        break;
      }
    }

    // Process child nodes recursively
    // Create a copy of childNodes to avoid modification during iteration
    const childNodes = Array.from(element.childNodes);
    childNodes.forEach((childNode) => processNode(childNode));
  };

  /**
   * Converts EVE Online specific HTML content to standard HTML
   *
   * @param {string} htmlContent - The EVE HTML content to convert
   * @returns {string} Sanitized and converted standard HTML
   */
  const convertEveHtml = (htmlContent: string): string => {
    if (!htmlContent) return "";

    try {
      // First, handle special cases with regex that are hard to manage with DOM
      let content = htmlContent;

      // Pre-process the content
      content = preProcessContent(content);

      // Replace EVE specific tags with standard HTML equivalents
      content = content
        // Font tags with color attribute
        .replace(
          /<font\s+color=["']?([^"'\s>]+)["']?>(.*?)<\/font>/gi,
          '<span style="color: $1">$2</span>',
        )

        // Font tags with hex color in more complex format
        .replace(/<font[^>]*color="#([A-Fa-f0-9]{8})"[^>]*>/g, (_, hex) => {
          const color = `#${hex.slice(0, 6)}`; // Use only RGB part
          return `<span style="color:${color}">`;
        })

        // Size tags
        .replace(
          /<size=["']?([^"'\s>]+)["']?>(.*?)<\/size>/gi,
          '<span style="font-size: $1">$2</span>',
        )

        // Localized tags
        .replace(/<loc>(.*?)<\/loc>/gi, "$1")

        // URL handling with target attribute
        .replace(
          /<url=(.*?)>(.*?)<\/url>/gi,
          '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>',
        )

        // Simple URL
        .replace(
          /<url>(.*?)<\/url>/gi,
          '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
        )

        // Close color tags properly
        .replace(/<\/color>/g, "</span>");

      // Handle killReport and warReport links with regex first
      content = content.replace(
        /<a href="killReport:(\d+)(:[A-Fa-f0-9]+)?"[^>]*>([^<]+)<\/a>/g,
        '<a href="/kill/$1">$3</a>',
      );
      content = content.replace(
        /<a href="warReport:(\d+)"[^>]*>([^<]+)<\/a>/g,
        '<a href="/war/$1">$2</a>',
      );

      // Process showinfo links
      content = content.replace(
        /<a href="(showinfo:[^"]+)"[^>]*>([^<]+)<\/a>/g,
        (_, href, text) => `<a href="${renderEveHref(href)}">${text}</a>`,
      );

      // Handle external links (add target="_blank")
      content = content.replace(
        /<a href="(https?:\/\/[^"]+)"[^>]*>([^<]+)<\/a>/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>',
      );

      // Replace newlines with <br> tags
      content = content.replace(/\r\n|\r|\n/g, "<br>");

      return content;
    } catch (error) {
      console.error("Error parsing EVE HTML:", error);
      // Fall back to the original content if parsing fails
      return htmlContent;
    }
  };

  /**
   * Decodes Unicode escape sequences in a string
   *
   * @param {string} str - String with Unicode escape sequences
   * @returns {string} String with decoded Unicode characters
   */
  const decodeUnicodeEscapes = (str: string): string => {
    return str.replace(/\\u([\dA-F]{4})/gi, (_match, grp) => {
      return String.fromCharCode(Number.parseInt(grp, 16));
    });
  };

  return {
    convertEveHtml,
    decodeUnicodeEscapes,
    renderEveHref,
  };
};
