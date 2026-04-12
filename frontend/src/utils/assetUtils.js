const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://eventspace-mern-production.up.railway.app';

/**
 * Formats an image URL. If it's a relative path (starts with /), 
 * it prepends the backend API base URL so it loads from the correct server.
 * @param {string} url - The image URL or path
 * @returns {string} - The formatted absolute URL
 */
export const getAssetUrl = (url) => {
  if (!url) return null;
  
  // If it's already an absolute URL (starts with http) or a blob/data URL
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  
  // Ensure the path starts with /uploads/ if it's a relative path to an uploaded file
  // but if it already starts with /api or similar, leave it
  let formattedPath = url.startsWith('/') ? url : `/${url}`;
  
  // High chance that relative paths in this app meant to be in /uploads/
  if (!formattedPath.startsWith('/uploads/') && !formattedPath.startsWith('/api/')) {
    formattedPath = `/uploads${formattedPath}`;
  }
  
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${base}${formattedPath}`;
};
