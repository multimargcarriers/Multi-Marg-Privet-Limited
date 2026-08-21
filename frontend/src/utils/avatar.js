/**
 * Zero-CORS, Instant Local SVG Avatar Generator
 */
export const getInitialsAvatar = (name = 'User', bg = '#FF9900', color = '#ffffff') => {
  const cleanName = String(name || 'User').trim();
  const initials = cleanName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <rect width="100%" height="100%" fill="${bg}" rx="64"/>
    <text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="50" font-weight="800" fill="${color}" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
