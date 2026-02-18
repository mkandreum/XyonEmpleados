import { pushService } from './api';
import { PushSubscriptionPayload } from '../types';

const isPushSupported = () => typeof window !== 'undefined'
  && 'serviceWorker' in navigator
  && 'PushManager' in window
  && 'Notification' in window;

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

async function registerServiceWorker() {
  return navigator.serviceWorker.register('/push-sw.js');
}

export async function ensurePushSubscription() {
  if (!isPushSupported()) {
    return { enabled: false, reason: 'unsupported' } as const;
  }

  if (Notification.permission === 'denied') {
    return { enabled: false, reason: 'permission-denied' } as const;
  }

  let publicKey: string;
  try {
    publicKey = await pushService.getPublicKey();
  } catch (err) {
    console.warn('Push service not configured', err);
    return { enabled: false, reason: 'not-configured' } as const;
  }

  if (!publicKey) {
    return { enabled: false, reason: 'missing-key' } as const;
  }

  const registration = await registerServiceWorker();
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { enabled: false, reason: 'permission-declined' } as const;
    }

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON();
  const payload: PushSubscriptionPayload = {
    endpoint: json.endpoint || '',
    keys: {
      p256dh: json.keys?.p256dh || '',
      auth: json.keys?.auth || '',
    },
    expirationTime: subscription.expirationTime ?? null,
  };

  await pushService.saveSubscription(payload);
  return { enabled: true } as const;
}

export async function clearPushSubscription() {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.getRegistration('/push-sw.js')
    || await navigator.serviceWorker.ready.catch(() => null);

  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    try {
      await pushService.deleteSubscription(subscription.endpoint);
    } catch (err) {
      console.warn('Failed to delete remote subscription', err);
    }

    try {
      await subscription.unsubscribe();
    } catch (err) {
      console.warn('Failed to unsubscribe locally', err);
    }
  }
}
