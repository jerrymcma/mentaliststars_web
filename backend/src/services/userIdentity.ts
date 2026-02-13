/**
 * User Identity Service
 * 
 * Generates and manages anonymous user IDs without requiring login.
 * Uses a combination of browser fingerprinting data to create a unique,
 * consistent identifier for each user across sessions.
 */

export class UserIdentityService {

  /**
   * Generate a user ID from browser fingerprint data
   * This should be called from the frontend and sent with each request
   */
  static generateUserId(fingerprint: {
    userAgent: string;
    language: string;
    timezone: string;
    screenResolution: string;
    platform: string;
  }): string {
    // Create a deterministic hash from browser characteristics
    const data = JSON.stringify(fingerprint);
    return this.simpleHash(data);
  }

  /**
   * Simple hash function for creating user IDs
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `user_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Validate user ID format
   */
  static isValidUserId(userId: string): boolean {
    return /^user_[a-z0-9]+$/.test(userId);
  }

  /**
   * Get or create anonymous user ID
   * Called when user ID is not provided in request
   */
  static getAnonymousId(): string {
    return `user_anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Frontend implementation guide (to be used in React app):
 * 
 * ```typescript
 * // In your React app:
 * function getUserId(): string {
 *   // Check localStorage first
 *   let userId = localStorage.getItem('mentalist_user_id');
 *   
 *   if (!userId) {
 *     // Generate from browser fingerprint
 *     const fingerprint = {
 *       userAgent: navigator.userAgent,
 *       language: navigator.language,
 *       timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
 *       screenResolution: `${screen.width}x${screen.height}`,
 *       platform: navigator.platform
 *     };
 *     
 *     // Simple hash function (same as backend)
 *     userId = generateUserIdFromFingerprint(fingerprint);
 *     localStorage.setItem('mentalist_user_id', userId);
 *   }
 *   
 *   return userId;
 * }
 * ```
 */
