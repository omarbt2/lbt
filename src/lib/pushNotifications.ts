import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

export let navigateRef: ((path: string) => void) | null = null;
export function setNavigate(fn: (path: string) => void) {
  navigateRef = fn;
}

export async function initPushNotifications(userId: string) {
  if (!Capacitor.isNativePlatform()) return;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', async (token) => {
    await (supabase.from as any)('push_tokens').upsert({
      user_id: userId,
      token: token.value,
      platform: Capacitor.getPlatform(),
      is_active: true,
    }, { onConflict: 'user_id,platform' });
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received:', notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = action.notification.data;
    const path = data.type === 'message' ? '/messages'
      : data.type === 'call' ? '/calls'
      : data.type === 'like' || data.type === 'comment' ? `/post/${data.post_id}`
      : '/notifications';

    if (navigateRef) {
      navigateRef(path);
    }
  });
}
