import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

let isRedisConnected = false;
let redisClient = null;
let redisLimiter = null;

// 1. In-Memory fallback rate limiter
const memoryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after a minute. (Local Fallback)'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. Setup Redis client connection and error handlers
const initRedis = async () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  console.log(`[RateLimiter] Initializing Redis client targeting ${redisUrl}...`);

  redisClient = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 5000, // 5 seconds
      reconnectStrategy: (retries) => {
        // Try reconnecting, cap at 3000ms delay
        const delay = Math.min(retries * 500, 3000);
        console.warn(`[RateLimiter] Redis offline. Reconnecting in ${delay}ms...`);
        return delay;
      }
    }
  });

  redisClient.on('connect', () => {
    console.log('[RateLimiter] Redis connecting...');
  });

  redisClient.on('ready', () => {
    console.log('[RateLimiter] Redis connected and ready. Activating Redis rate limiting.');
    isRedisConnected = true;
  });

  redisClient.on('error', (err) => {
    console.error('[RateLimiter] Redis Client Error:', err.message);
    isRedisConnected = false;
  });

  redisClient.on('end', () => {
    console.warn('[RateLimiter] Redis connection closed. Falling back to Memory rate limiting.');
    isRedisConnected = false;
  });

  try {
    await redisClient.connect();

    // Create the Redis-backed rate limiter
    redisLimiter = rateLimit({
      store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
      }),
      windowMs: 60 * 1000,
      max: 100,
      message: {
        success: false,
        message: 'Too many requests from this IP. Please try again after a minute.'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  } catch (err) {
    console.error('[RateLimiter] Failed to connect to Redis during startup. Falling back to Memory rate limiting.', err.message);
    isRedisConnected = false;
  }
};

// Initiate connection asynchronously
initRedis();

// 3. Wrapper middleware that checks connection status dynamically
const rateLimiterMiddleware = (req, res, next) => {
  if (isRedisConnected && redisLimiter) {
    return redisLimiter(req, res, next);
  }
  return memoryLimiter(req, res, next);
};

export default rateLimiterMiddleware;
