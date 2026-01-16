// Validation utilities for input sanitization and validation

// Note: DOMPurify removed due to jsdom compatibility issues in Node.js
// Using simple regex-based sanitization for server-side

/**
 * Validate UUID format
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return typeof str === 'string' && uuidRegex.test(str);
}

/**
 * Validate board position (0-63)
 */
export function isValidBoardPosition(pos: number): boolean {
  return typeof pos === 'number' && 
         Number.isInteger(pos) && 
         pos >= 0 && 
         pos < 64;
}

/**
 * Sanitize nickname - removes dangerous characters and limits length
 */
export function sanitizeNickname(nickname: string): string {
  if (!nickname || typeof nickname !== 'string') {
    return '';
  }
  
  return nickname
    .trim()
    .substring(0, 20)
    .replace(/[<>\"'&]/g, '') // Remove dangerous chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/^\s+|\s+$/g, ''); // Trim again
}

/**
 * Validate nickname format and length
 */
export function isValidNickname(nickname: string): boolean {
  if (!nickname || typeof nickname !== 'string') {
    return false;
  }
  const sanitized = sanitizeNickname(nickname);
  return sanitized.length >= 1 && sanitized.length <= 20;
}

/**
 * Sanitize text content - strips all HTML tags and dangerous characters
 * Server-side implementation without DOMPurify to avoid jsdom issues
 */
export function sanitizeText(text: string, maxLength: number = 200): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // Strip all HTML tags using regex (safe for server-side)
  let sanitized = text
    .trim()
    .substring(0, maxLength)
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&[#\w]+;/g, '') // Remove HTML entities
    .replace(/[<>\"'&]/g, '') // Remove dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  return sanitized;
}

/**
 * Validate match ID format
 */
export function isValidMatchId(matchId: string): boolean {
  // Match ID can be UUID or offline- prefixed string
  if (typeof matchId !== 'string') {
    return false;
  }
  
  if (matchId.startsWith('offline-')) {
    return matchId.length > 8 && matchId.length < 100;
  }
  
  return isValidUUID(matchId);
}

