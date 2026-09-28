interface RateLimitConfig {
  perMessageMs: number;
  perHour: number;
  perDay: number;
  cooldownThreshold: number;
  cooldownMs: number;
}

const config: RateLimitConfig = {
  perMessageMs: 3000,
  perHour: 200,
  perDay: 1000,
  cooldownThreshold: 50,
  cooldownMs: 5 * 60 * 1000 // 5 minutes
};

let lastMessageTime = 0;
let hourCount = 0;
let dayCount = 0;
let rapidCount = 0;
let cooldownUntil = 0;

let currentHour = new Date().getHours();
let currentDay = new Date().getDate();

function resetCountersIfNeeded() {
  const now = new Date();
  if (now.getHours() !== currentHour) {
    hourCount = 0;
    rapidCount = 0;
    currentHour = now.getHours();
  }
  if (now.getDate() !== currentDay) {
    dayCount = 0;
    currentDay = now.getDate();
  }
}

export function canSend(): { allowed: boolean; retryAfterMs?: number } {
  resetCountersIfNeeded();
  const now = Date.now();

  if (now < cooldownUntil) {
    return { allowed: false, retryAfterMs: cooldownUntil - now };
  }

  if (dayCount >= config.perDay) {
    return { allowed: false, retryAfterMs: 24 * 60 * 60 * 1000 };
  }

  if (hourCount >= config.perHour) {
    return { allowed: false, retryAfterMs: 60 * 60 * 1000 };
  }

  const timeSinceLast = now - lastMessageTime;
  if (timeSinceLast < config.perMessageMs) {
    return { allowed: false, retryAfterMs: config.perMessageMs - timeSinceLast };
  }

  return { allowed: true };
}

export function recordSend() {
  resetCountersIfNeeded();
  const now = Date.now();
  
  if (now - lastMessageTime < 10000) {
    rapidCount++;
  } else {
    rapidCount = 0;
  }

  lastMessageTime = now;
  hourCount++;
  dayCount++;

  if (rapidCount >= config.cooldownThreshold) {
    cooldownUntil = now + config.cooldownMs;
    rapidCount = 0;
  }
}

export function getStats() {
  resetCountersIfNeeded();
  return {
    hourCount,
    dayCount,
    inCooldown: Date.now() < cooldownUntil,
    cooldownRemainingMs: Math.max(0, cooldownUntil - Date.now())
  };
}
