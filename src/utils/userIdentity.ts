/**
 * User Identity Management (Frontend)
 * 
 * Generates and manages anonymous user IDs without requiring login.
 * Consistent across sessions using localStorage.
 */

const USER_ID_KEY = 'mentalist_user_id';

interface BrowserFingerprint {
  userAgent: string;
  language: string;
  timezone: string;
  screenResolution: string;
  platform: string;
}

/**
 * Get browser fingerprint for ID generation
 */
function getBrowserFingerprint(): BrowserFingerprint {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenResolution: `${screen.width}x${screen.height}`,
    platform: navigator.platform
  };
}

/**
 * Generate user ID from fingerprint
 */
function generateUserIdFromFingerprint(fingerprint: BrowserFingerprint): string {
  const data = JSON.stringify(fingerprint);
  let hash = 0;

  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return `user_${Math.abs(hash).toString(36)}`;
}

/**
 * Get or create user ID
 * This is the main function to use throughout the app
 */
export function getUserId(): string {
  try {
    // Check localStorage first
    let userId = localStorage.getItem(USER_ID_KEY);

    if (!userId) {
      // Generate from browser fingerprint
      const fingerprint = getBrowserFingerprint();
      userId = generateUserIdFromFingerprint(fingerprint);

      // Store for future use
      localStorage.setItem(USER_ID_KEY, userId);
    }

    return userId;
  } catch (error) {
    // Fallback if localStorage is blocked
    console.warn('Could not access localStorage, using session-only ID');
    return `user_temp_${Date.now()}`;
  }
}

/**
 * Clear user ID (for testing or user preference)
 */
export function clearUserId(): void {
  try {
    localStorage.removeItem(USER_ID_KEY);
  } catch (error) {
    console.warn('Could not clear user ID from localStorage');
  }
}

/**
 * Check if user has an existing ID
 */
export function hasExistingUserId(): boolean {
  try {
    return localStorage.getItem(USER_ID_KEY) !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Get user stats from backend
 */
export async function getUserStats(mentalistId: string): Promise<{
  totalSessions: number;
  averageRating: number;
  lastSeen: string;
  returningUser: boolean;
} | null> {
  try {
    const userId = getUserId();
    const response = await fetch(
      `/api/user/${userId}/mentalist/${mentalistId}/history`
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.stats;
  } catch (error) {
    console.error('Failed to get user stats:', error);
    return null;
  }
}
