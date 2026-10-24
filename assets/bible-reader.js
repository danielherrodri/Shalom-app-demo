import DOMPurify from 'dompurify';

// One restrictive policy shared by the static demo and the React application.
export function sanitizeBibleHTML(value) {
  if (typeof value !== 'string' || value.length > 150000) return '';
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: ['div', 'span', 'p', 'br', 'sup', 'sub', 'strong', 'em', 'b', 'i', 'small', 'section', 'article', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption'],
    ALLOWED_ATTR: ['class', 'lang', 'dir', 'title', 'colspan', 'rowspan', 'scope', 'data-usfm', 'data-number'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    RETURN_TRUSTED_TYPE: false,
  });
}

export function validateVerseImage(value) {
  if (!value || typeof value !== 'object') return null;
  try {
    const url = new URL(value.url);
    if (url.protocol !== 'https:' || url.hostname !== 'cdn.youversion.com' || !url.pathname.startsWith('/images/') ||
        url.username || url.password || url.hash || (url.port && url.port !== '443') ||
        url.search !== '?size=card' || typeof value.attribution !== 'string' || !value.attribution.trim() ||
        !Number.isInteger(value.width) || !Number.isInteger(value.height) || value.width < 1 || value.height < 1 ||
        value.width > 10000 || value.height > 10000 || typeof value.language !== 'string' || !/^es(?:-|$)/i.test(value.language)) return null;
    return { url: url.href, width: value.width, height: value.height, attribution: value.attribution };
  } catch { return null; }
}

export function installBibleStyles() {
  for (const [kind, href] of [['bible', 'https://cdn.youversion.com/platform/1/bible.css'], ['font', '/api/v1/scripture/fonts.css']]) {
    if (document.querySelector(`link[data-shalom-bible="${kind}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = href; link.dataset.shalomBible = kind;
    link.referrerPolicy = 'no-referrer';
    document.head.append(link);
  }
}
