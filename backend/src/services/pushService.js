const { PrismaClient } = require('@prisma/client');
const webpush = require('web-push');

const prisma = new PrismaClient();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

const hasVapidConfig = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (hasVapidConfig) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
    console.warn('⚠️  VAPID keys are not configured. Push notifications will be skipped.');
}

const normalizeExpiration = (expirationTime) => {
    if (!expirationTime) return null;
    // expirationTime can be a timestamp (ms) or Date compatible string
    const date = typeof expirationTime === 'number' ? new Date(expirationTime) : new Date(expirationTime);
    return isNaN(date.getTime()) ? null : date;
};

async function saveSubscription(userId, subscription) {
    const { endpoint, keys, expirationTime } = subscription || {};

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
        throw new Error('Invalid subscription payload');
    }

    const normalizedExpiration = normalizeExpiration(expirationTime);

    return prisma.pushSubscription.upsert({
        where: { endpoint },
        update: {
            userId,
            keys,
            expirationTime: normalizedExpiration,
        },
        create: {
            userId,
            endpoint,
            keys,
            expirationTime: normalizedExpiration,
        },
    });
}

async function deleteSubscription(endpoint) {
    if (!endpoint) return;
    try {
        await prisma.pushSubscription.delete({ where: { endpoint } });
    } catch (err) {
        // Ignore not found
        if (err.code !== 'P2025') {
            console.error('Error deleting subscription', err);
        }
    }
}

async function sendPushToUser(userId, payload) {
    if (!hasVapidConfig) return;

    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
    if (!subscriptions.length) return;

    const payloadString = JSON.stringify(payload);

    for (const sub of subscriptions) {
        const pushSubscription = {
            endpoint: sub.endpoint,
            keys: sub.keys,
            expirationTime: sub.expirationTime ? new Date(sub.expirationTime).getTime() : null,
        };

        try {
            await webpush.sendNotification(pushSubscription, payloadString);
        } catch (error) {
            const gone = error.statusCode === 404 || error.statusCode === 410;
            if (gone) {
                console.warn('Deleting stale push subscription', sub.endpoint);
                await deleteSubscription(sub.endpoint);
            } else {
                console.error('Error sending push notification', error);
            }
        }
    }
}

function getPublicKey() {
    return VAPID_PUBLIC_KEY || null;
}

module.exports = {
    saveSubscription,
    deleteSubscription,
    sendPushToUser,
    getPublicKey,
};
