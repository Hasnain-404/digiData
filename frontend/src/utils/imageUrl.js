const BASE_URL = import.meta.env.VITE_BACKEND_URL
  ? `${import.meta.env.VITE_BACKEND_URL}/api/v1`
  : 'https://digidata.onrender.com/api/v1';

/**
 * Ensures images hosted on domains blocked by mobile ISP DNS (like i.ibb.co in India)
 * are served through our backend proxy so mobile users can view them seamlessly.
 */
export function getSafeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Local assets, data URLs, and blobs
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }

  // Already proxied
  if (trimmed.includes('/trades/image-proxy')) {
    return trimmed;
  }

  // Route ibb.co / i.ibb.co through the backend proxy
  if (/ibb\.co/i.test(trimmed)) {
    return `${BASE_URL}/trades/image-proxy?url=${encodeURIComponent(trimmed)}`;
  }

  return trimmed;
}

/**
 * Forces any image URL through the proxy (useful as an onError fallback)
 */
export function getProxiedImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.includes('/trades/image-proxy')) return trimmed;
  return `${BASE_URL}/trades/image-proxy?url=${encodeURIComponent(trimmed)}`;
}
