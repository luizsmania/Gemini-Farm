// Rate limiting middleware using rate-limiter-flexible

import { RateLimiterMemory } from 'rate-limiter-flexible';

// Per-IP rate limiters
const moveLimiter = new RateLimiterMemory({
  points: 10, // 10 moves
  duration: 1, // per second
  blockDuration: 5, // Block for 5 seconds if limit exceeded
});

const chatLimiter = new RateLimiterMemory({
  points: 5, // 5 messages
  duration: 1, // per second
  blockDuration: 3, // Block for 3 seconds if limit exceeded
});

const lobbyLimiter = new RateLimiterMemory({
  points: 1, // 1 lobby
  duration: 10, // per 10 seconds
  blockDuration: 10, // Block for 10 seconds if limit exceeded
});

const nicknameLimiter = new RateLimiterMemory({
  points: 3, // 3 attempts
  duration: 60, // per minute
  blockDuration: 60, // Block for 60 seconds if limit exceeded
});

/**
 * Rate limit move requests
 * @returns true if allowed, false if rate limited
 */
export async function rateLimitMove(socketId: string, ip: string): Promise<boolean> {
  try {
    await moveLimiter.consume(`${ip}:move`);
    return true;
  } catch (rejRes) {
    return false;
  }
}

/**
 * Rate limit chat messages
 * @returns true if allowed, false if rate limited
 */
export async function rateLimitChat(socketId: string, ip: string): Promise<boolean> {
  try {
    await chatLimiter.consume(`${ip}:chat`);
    return true;
  } catch (rejRes) {
    return false;
  }
}

/**
 * Rate limit lobby creation
 * @returns true if allowed, false if rate limited
 */
export async function rateLimitLobby(socketId: string, ip: string): Promise<boolean> {
  try {
    await lobbyLimiter.consume(`${ip}:lobby`);
    return true;
  } catch (rejRes) {
    return false;
  }
}

/**
 * Rate limit nickname changes
 * @returns true if allowed, false if rate limited
 */
export async function rateLimitNickname(socketId: string, ip: string): Promise<boolean> {
  try {
    await nicknameLimiter.consume(`${ip}:nickname`);
    return true;
  } catch (rejRes) {
    return false;
  }
}

