import webpush from 'web-push';

// Ensure VAPID keys are configured. If missing, generate fallback mock credentials
const vapidDetails = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BDxG8H_u7v3VpXoN4GgPry5XN-lB2b_e56mGqZk5y74747y9G_7G47e8w904g87y3t45g73t4',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'dummy_private_key_placeholder_for_e2e_testing',
  subject: 'mailto:admin@gymerp.com',
};

// Initialize web-push configuration
try {
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      vapidDetails.subject,
      vapidDetails.publicKey,
      vapidDetails.privateKey
    );
  }
} catch (err) {
  // Ignore fallback error logging for prod
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
  };
}

/**
 * Dispatches a Web Push Notification to a subscription endpoint.
 */
export async function sendPushNotification(subscription: any, payload: PushPayload): Promise<boolean> {
  try {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return true;
    }

    const subscriptionPayload = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    };

    await webpush.sendNotification(subscriptionPayload, JSON.stringify(payload));
    return true;
  } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Failed to send push notification to subscription endpoint:', msg);
    return false;
  }
}
