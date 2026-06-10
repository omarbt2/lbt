import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return await Notification.requestPermission();
  } catch (err) {
    console.error('Notification permission error:', err);
    return 'denied';
  }
}

export function showLocalNotification(title: string, body: string, icon?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(title, {
    body,
    icon: icon ?? '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'lbt-notification',
  });
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (!VAPID_PUBLIC_KEY) {
    console.warn('VAPID public key not configured. Push notifications disabled.');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const { endpoint } = subscription;
    const keys = subscription.toJSON().keys;

    const { error } = await (supabase as any).from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint,
        p256dh: keys?.p256dh || '',
        auth: keys?.auth || '',
      },
      { onConflict: 'user_id,endpoint' }
    );

    if (error) {
      console.error('Failed to store push subscription:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return false;
  }
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    await (supabase as any)
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);
  } catch (err) {
    console.error('Push unsubscribe failed:', err);
  }
}
