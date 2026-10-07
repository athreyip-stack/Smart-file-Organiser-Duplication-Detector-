/**
 * Format raw bytes into human readable string (KB, MB, GB, TB)
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0 || !bytes) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Parse an ISO or SQL timestamp string into a Date object, ensuring UTC interpretation if no offset is present.
 */
function parseDate(dateString) {
  if (!dateString) return null;
  let str = String(dateString).trim();
  if (!str) return null;

  // Replace space with T if SQL datetime format like "2026-10-03 18:35:21"
  if (str.includes(' ') && !str.includes('T')) {
    str = str.replace(' ', 'T');
  }

  // If there's no timezone indicator ('Z' or '+/-HH:MM'), assume UTC
  if (!str.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(str) && !/[+-]\d{4}$/.test(str)) {
    str = str + 'Z';
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format ISO datetime string to local date and time in the user's browser/system timezone
 */
export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = parseDate(dateString);
    if (!d) return String(dateString);

    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (e) {
    return String(dateString);
  }
}

/**
 * Format relative time (e.g. 5m ago, Just now) based on actual UTC difference
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return '—';
  try {
    const date = parseDate(dateString);
    if (!date) return String(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDate(dateString);
  } catch (e) {
    return String(dateString);
  }
}

/**
 * Truncate middle of long file path
 */
export function truncatePath(path, maxLength = 45) {
  if (!path || path.length <= maxLength) return path;
  const parts = path.split('/');
  if (parts.length <= 3) return path;
  return `${parts[0]}/.../${parts.slice(-2).join('/')}`;
}
