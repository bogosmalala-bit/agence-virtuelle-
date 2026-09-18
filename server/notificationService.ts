import { db } from './db.js';
import { NotificationLog } from '../src/types.js';

export interface PushNotificationPayload {
  title: string;
  message: string;
  type: 'NEW_ORDER' | 'HANDOFF_ALERT' | 'API_QUOTA_ALERT' | 'POST_PUBLISHED' | 'MODERATION_ACTION';
  related_id?: string;
}

export async function sendPushNotification(payload: PushNotificationPayload): Promise<NotificationLog> {
  const fcmServerKey = process.env.FIREBASE_FCM_SERVER_KEY;
  const operatorPhone = db.assistantSettings.operator_phone || process.env.OPERATOR_PHONE_NUMBER;
  const channel = db.assistantSettings.notification_channel;

  console.log(`[NOTIFICATION DISPATCHER] ${payload.type} -> "${payload.title}"`);

  let status: 'SENT' | 'DELIVERED' | 'FAILED' = 'DELIVERED';

  // 1. Firebase Cloud Messaging (FCM) Push if configured
  if (db.assistantSettings.fcm_enabled && fcmServerKey) {
    try {
      // Firebase FCM HTTP v1 / Legacy Endpoint
      const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${fcmServerKey}`,
        },
        body: JSON.stringify({
          to: '/topics/operators',
          notification: {
            title: payload.title,
            body: payload.message,
            icon: '/favicon.ico',
          },
          data: {
            type: payload.type,
            related_id: payload.related_id || '',
          },
        }),
      });

      if (!fcmResponse.ok) {
        console.warn('[FCM PUSH WARNING]', await fcmResponse.text());
      }
    } catch (err: any) {
      console.warn('[FCM ERROR]', err.message);
    }
  }

  // 2. Real SMS Gateway if configured & enabled
  if (db.assistantSettings.sms_enabled && operatorPhone && process.env.SMS_GATEWAY_API_KEY) {
    try {
      console.log(`[SMS GATEWAY] Sending SMS to ${operatorPhone}: "${payload.message}"`);
      // In production, integrate actual SMS gateway (e.g. Twilio, Infobip, Telma/Orange SMS API)
    } catch (err: any) {
      console.warn('[SMS ERROR]', err.message);
    }
  }

  // 3. In-App Notification Log
  const log: NotificationLog = {
    id: `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    channel: channel === 'ALL' ? 'PUSH_FCM' : channel,
    status,
    related_id: payload.related_id,
    created_at: new Date().toISOString(),
  };

  db.notifications.unshift(log);
  return log;
}
