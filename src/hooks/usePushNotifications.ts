'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(userId?: string, memberId?: string) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribing, setSubscribing] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const subscribeToPush = async () => {
    if (!isSupported) {
      toast.error('Web Push notifications are not supported on this browser/device');
      return false;
    }

    try {
      setSubscribing(true);
      
      // 1. Request permission
      const userPermission = await Notification.requestPermission();
      setPermission(userPermission);

      if (userPermission !== 'granted') {
        toast.error('Notification permission was denied');
        return false;
      }

      // 2. Register subscription with Service Worker
      const registration = await navigator.serviceWorker.ready;
      
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        toast.info('Push notification service key not configured for this environment');
        return false;
      }

      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      // 3. Send subscription to our Next.js API
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          userId,
          memberId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register subscription on server');
      }

      toast.success('Successfully subscribed to PWA Push Notifications!');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Push subscription failed:', err);
      toast.error(msg || 'Push subscription failed');
      return false;
    } finally {
      setSubscribing(false);
    }
  };

  return {
    permission,
    subscribing,
    isSupported,
    subscribeToPush,
  };
}
