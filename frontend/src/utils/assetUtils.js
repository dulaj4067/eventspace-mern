const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://eventspace-mern-production.up.railway.app';

/**
 * Formats an image URL. If it's a relative path (starts with /), 
 * it prepends the backend API base URL so it loads from the correct server.
 * @param {string} url - The image URL or path
 * @returns {string} - The formatted absolute URL
 */
export const getAssetUrl = (url) => {
  if (!url) return null;
  
  // If it's already an absolute URL (starts with http)
  if (url.startsWith('http')) {
    return url;
  }
  
  // Ensure we don't double slash if API_BASE_URL ends with / or url starts with /
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const path = url.startsWith('/') ? url : `/${url}`;
  
  return `${base}${path}`;
};
