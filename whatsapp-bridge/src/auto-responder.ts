/**
 * Keyword Auto-Responder & Chatbot Rule Engine
 * Inspired by Zerodha Whatomate (https://github.com/shridarpatil/whatomate).
 * Automatically replies to prospective and existing gym members texting
 * common inquiries (pricing, timings, free trial passes, location).
 */

export interface AutoReplyRule {
  keywords: string[];
  response: string;
}

export const DEFAULT_AUTO_REPLY_RULES: AutoReplyRule[] = [
  {
    keywords: ['hi', 'hello', 'hey', 'start', 'menu', 'help', 'info'],
    response:
      '👋 *Welcome to Gym Assistant!*\n\n' +
      'How can we help your fitness journey today? Reply with a number or keyword:\n\n' +
      '1️⃣ *PLANS* - View Membership Packages & Pricing\n' +
      '2️⃣ *HOURS* - Gym Operating Timings & Peak Hours\n' +
      '3️⃣ *TRIAL* - Claim 1-Day Free Guest Workout Pass\n' +
      '4️⃣ *LOCATION* - Driving Directions & Parking\n' +
      '5️⃣ *DESK* - Connect with Reception Staff\n' +
      '6️⃣ *WORKOUT* - Today\'s Workout Routine & Logger\n' +
      '7️⃣ *PLATES* - Olympic Barbell Plate Calculator\n\n' +
      'Type any keyword above for instant details!',
  },
  {
    keywords: ['1', 'plan', 'plans', 'fee', 'fees', 'price', 'pricing', 'cost', 'package', 'packages', 'membership'],
    response:
      '🏋️ *Membership Plans & Pricing*\n\n' +
      '• *Monthly Silver*: INR 2,500/month (Strength & Cardio)\n' +
      '• *Quarterly Gold*: INR 6,500/3-months (Diet Consultation included)\n' +
      '• *Annual Elite*: INR 18,000/year (Steam, Sauna, Lockers & Personal Trainer)\n\n' +
      '👉 Reply *TRIAL* to claim a complimentary 1-day trial session before joining!',
  },
  {
    keywords: ['2', 'hour', 'hours', 'time', 'times', 'timing', 'timings', 'schedule', 'open', 'close'],
    response:
      '⏰ *Gym Operating Hours*\n\n' +
      '• *Monday - Saturday*: 5:30 AM - 10:30 PM\n' +
      '• *Sunday*: 6:00 AM - 2:00 PM\n\n' +
      '💡 *Tip*: Afternoon hours (12:00 PM - 4:30 PM) have the lightest floor traffic for uninterrupted workouts.',
  },
  {
    keywords: ['3', 'trial', 'pass', 'free', 'guest', 'demo', 'visit'],
    response:
      '🎟️ *1-Day Complimentary Guest Pass*\n\n' +
      'Experience our gym floor, certified trainers, and premium equipment for free!\n\n' +
      'Show this message or claim your pass online:\n' +
      'https://gymerp.live/bio/main-branch\n\n' +
      'Please bring workout shoes and a towel. See you on the floor!',
  },
  {
    keywords: ['4', 'location', 'address', 'map', 'directions', 'where', 'place', 'parking'],
    response:
      '📍 *Gym Location & Directions*\n\n' +
      'Main Branch: Fitness Hub, Ground & 1st Floor, Near Central Metro.\n' +
      'Map Directions: https://maps.google.com\n' +
      'Complimentary valet parking is available for all members.',
  },
  {
    keywords: ['5', 'desk', 'staff', 'manager', 'reception', 'call', 'talk', 'human'],
    response:
      '👤 *Front Desk Connected*\n\n' +
      'Our front desk manager has been alerted. We will message you back shortly during operating hours.\n' +
      'For immediate queries, feel free to call our reception directly.',
  },
  {
    keywords: ['6', 'workout', 'routine', 'exercise', 'exercises', 'split', 'train', 'training'],
    response:
      '🏋️ *Today\'s Workout Companion*\n\n' +
      'Track your sets, weights, reps, and RPE live during your session on the member portal:\n' +
      'https://gymerp.live/member/exercise\n\n' +
      'Includes built-in rest countdown timers, automated volume tracking, and personal records!',
  },
  {
    keywords: ['7', 'plate', 'plates', 'barbell', 'bar'],
    response:
      '📐 *Olympic Barbell Plate Math*\n\n' +
      'Calculate exact plate sleeve loading (25, 20, 15, 10, 5, 2.5, 1.25 kg) for 20kg Olympic bars:\n' +
      'https://gymerp.live/member/exercise\n\n' +
      'Never misload a barbell on the gym floor again!',
  },
];

/**
 * Matches an incoming message body against auto-reply rules.
 * Returns the matching response string or null if no rule matched.
 */
export function matchAutoReply(rawText: string, customRules: AutoReplyRule[] = DEFAULT_AUTO_REPLY_RULES): string | null {
  if (!rawText || typeof rawText !== 'string') return null;

  const normalized = rawText
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ''); // strip punctuation

  if (!normalized) return null;

  const words = normalized.split(/\s+/);

  for (const rule of customRules) {
    for (const kw of rule.keywords) {
      // Exact match for single digits or single words, or phrase contains keyword
      if (normalized === kw || words.includes(kw)) {
        return rule.response;
      }
    }
  }

  return null;
}
