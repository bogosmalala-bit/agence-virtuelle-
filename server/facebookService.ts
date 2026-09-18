import { db } from './db.js';
import { FacebookPage, Message, Conversation, FacebookComment, ScheduledPost } from '../src/types.js';

// Meta Graph API base URL
const META_GRAPH_VERSION = 'v20.0';
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

// Secure token storage (in-memory server-side only)
const pageTokensStore: Record<string, string> = {
  page_mada_01: 'EAAQ...dummy_valid_page_access_token_secure',
};

export function setPageAccessToken(pageId: string, token: string) {
  pageTokensStore[pageId] = token;
}

export function getPageAccessToken(pageId?: string): string | undefined {
  if (pageId && pageTokensStore[pageId]) return pageTokensStore[pageId];
  const cleanId = (pageId || '').replace(/^page_/, '');
  
  if (pageId) {
    const found = db.facebookPages.find(
      (p) => p.page_id === pageId || p.page_id === cleanId || p.id === pageId || p.id === `page_${cleanId}`
    );
    if (found?.page_access_token) return found.page_access_token;
  }

  // Fallback to active page
  const active = db.facebookPages.find((p) => p.id === db.activePageId || p.page_id === db.activePageId);
  if (active?.page_access_token && !active.page_access_token.startsWith('EAAQ...dummy')) {
    return active.page_access_token;
  }

  // Fallback to any real connected page with token
  const anyReal = db.facebookPages.find((p) => Boolean(p.page_access_token && !p.page_access_token.startsWith('EAAQ...dummy')));
  if (anyReal?.page_access_token) return anyReal.page_access_token;

  // Fallback to in-memory store any token
  const firstStoreToken = Object.values(pageTokensStore).find((t) => t && !t.startsWith('EAAQ...dummy'));
  if (firstStoreToken) return firstStoreToken;

  return undefined;
}

// Meta Webhook Verification Handler (GET /api/webhooks/facebook)
export function verifyMetaWebhook(
  mode: string | undefined,
  token: string | undefined,
  challenge: string | undefined,
  expectedVerifyToken: string
): { isValid: boolean; challenge?: string } {
  if (mode === 'subscribe' && token === expectedVerifyToken && challenge) {
    return { isValid: true, challenge };
  }
  return { isValid: false };
}

// Explicitly Subscribe Facebook Page to Webhook events (subscribed_apps)
export async function subscribePageToWebhooks(
  pageId: string,
  token?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const cleanPageId = (pageId || '').replace(/^page_/, '');
  const pageToken = token || getPageAccessToken(cleanPageId) || getPageAccessToken(pageId);

  if (!pageToken || pageToken.startsWith('EAAQ...dummy')) {
    return { success: false, error: 'Tsy misy Page Access Token Meta manan-kery.' };
  }

  try {
    const fields = 'messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads,feed';
    const subUrl = `${META_GRAPH_BASE}/${cleanPageId}/subscribed_apps?subscribed_fields=${fields}&access_token=${pageToken}`;
    const res = await fetch(subUrl, { method: 'POST' });
    const data = await res.json();

    if (!res.ok || data.error) {
      console.warn('[SUBSCRIBE APPS META ERROR]', data?.error);
      return { success: false, error: data?.error?.message || 'Meta API Subscription Error' };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('[SUBSCRIBE APPS EXCEPTION]', err);
    return { success: false, error: err.message };
  }
}

// Send Facebook Messenger message via Meta Graph API
export async function sendFacebookMessage(
  pageId: string,
  recipientId: string,
  text: string,
  attachmentUrl?: string,
  attachmentType?: 'image' | 'video' | 'file' | 'audio'
): Promise<{ success: boolean; message_id?: string; error?: string; rawError?: any }> {
  const token = getPageAccessToken(pageId);

  // If connected to a real Meta Page Access Token (not dummy)
  if (token && !token.startsWith('EAAQ...dummy')) {
    try {
      const cleanRecipientId = recipientId.trim();
      const payload: any = {
        recipient: { id: cleanRecipientId },
        message: { text },
        messaging_type: 'RESPONSE',
      };

      if (attachmentUrl && attachmentType) {
        payload.message.attachment = {
          type: attachmentType,
          payload: {
            url: attachmentUrl,
            is_reusable: true,
          },
        };
      }

      // Try sending with /me/messages or /{page_id}/messages
      const cleanPageId = (pageId || '').replace(/^page_/, '');
      const endpoint = cleanPageId && /^\d+$/.test(cleanPageId)
        ? `${META_GRAPH_BASE}/${cleanPageId}/messages?access_token=${token}`
        : `${META_GRAPH_BASE}/me/messages?access_token=${token}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        console.error('[META GRAPH API MESSENGER ERROR]', data);
        return {
          success: false,
          error: data?.error?.message || `Meta API Error (${response.status})`,
          rawError: data?.error,
        };
      }

      return { success: true, message_id: data.message_id || data.recipient_id };
    } catch (err: any) {
      console.error('[META SEND FAILED EXCEPTION]', err);
      return { success: false, error: err.message };
    }
  }

  // Simulator / Local Mode
  return { success: true, message_id: `sim_msg_${Date.now()}` };
}

// Send Private Reply to a Facebook Post Comment
export async function sendPrivateReplyToComment(
  pageId: string,
  commentId: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  const token = getPageAccessToken(pageId);
  if (token && !token.startsWith('EAAQ...dummy')) {
    try {
      const response = await fetch(`${META_GRAPH_BASE}/me/messages?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { comment_id: commentId },
          message: { text },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data?.error?.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
  return { success: true };
}

// Publish post to Facebook Page via Meta Graph API
export async function publishPostToFacebookPage(
  post: ScheduledPost
): Promise<{ success: boolean; meta_post_id?: string; error?: string }> {
  const token = getPageAccessToken(post.page_id);
  if (token && !token.startsWith('EAAQ...dummy')) {
    try {
      const endpoint = post.media_url ? `${META_GRAPH_BASE}/me/photos` : `${META_GRAPH_BASE}/me/feed`;
      const bodyPayload = post.media_url
        ? { url: post.media_url, caption: post.content, access_token: token }
        : { message: post.content, access_token: token };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data?.error?.message || 'Erreur publication Meta' };
      }
      return { success: true, meta_post_id: data.id || data.post_id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
  return { success: true, meta_post_id: `fb_post_pub_${Date.now()}` };
}

// =======================================================
// REAL META GRAPH API SYNCHRONIZATION (Conversations & Feed)
// =======================================================

export async function syncPageConversationsFromMeta(
  pageId: string,
  token: string
): Promise<{ syncedConversations: number; syncedMessages: number; error?: string }> {
  try {
    const url = `${META_GRAPH_BASE}/${pageId}/conversations?fields=id,snippet,updated_time,unread_count,participants{id,name,picture},messages{id,message,from,created_time}&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      console.warn('[META SYNC CONVERSATIONS WARNING]', data?.error?.message);
      return { syncedConversations: 0, syncedMessages: 0, error: data?.error?.message };
    }

    let convCount = 0;
    let msgCount = 0;

    const rawConversations = data?.data || [];
    for (const rawConv of rawConversations) {
      const participants = rawConv.participants?.data || [];
      const customer = participants.find((p: any) => p.id !== pageId) || participants[0] || { id: 'cust_unknown', name: 'Client Facebook' };

      const convId = rawConv.id || `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const existingConvIdx = db.conversations.findIndex((c) => c.id === convId);

      const convObj: Conversation = {
        id: convId,
        user_id: db.user.id,
        page_id: pageId,
        customer_id: customer.id,
        customer_name: customer.name || 'Client Facebook',
        facebook_profile_pic: customer.picture?.data?.url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
        last_message: rawConv.snippet || '',
        status: 'BOT_ACTIVE',
        unread_count: rawConv.unread_count || 0,
        created_at: rawConv.updated_time || new Date().toISOString(),
        updated_at: rawConv.updated_time || new Date().toISOString(),
      };

      if (existingConvIdx >= 0) {
        db.conversations[existingConvIdx] = { ...db.conversations[existingConvIdx], ...convObj };
      } else {
        db.conversations.unshift(convObj);
      }
      convCount++;

      // Messages in conversation
      const rawMessages = rawConv.messages?.data || [];
      for (const rawMsg of rawMessages) {
        if (!rawMsg.message) continue;
        const msgId = rawMsg.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        if (db.messages.some((m) => m.id === msgId)) continue;

        const isFromPage = rawMsg.from?.id === pageId;
        db.messages.push({
          id: msgId,
          conversation_id: convId,
          sender: isFromPage ? 'AI_ASSISTANT' : 'CUSTOMER',
          sender_name: rawMsg.from?.name || (isFromPage ? db.assistantSettings.name : customer.name),
          message: rawMsg.message,
          created_at: rawMsg.created_time || new Date().toISOString(),
        });
        msgCount++;
      }
    }

    return { syncedConversations: convCount, syncedMessages: msgCount };
  } catch (err: any) {
    console.error('[META SYNC CONVERSATIONS FAILED]', err);
    return { syncedConversations: 0, syncedMessages: 0, error: err.message };
  }
}

export async function syncPageCommentsFromMeta(
  pageId: string,
  token: string
): Promise<{ syncedComments: number; error?: string }> {
  try {
    const url = `${META_GRAPH_BASE}/${pageId}/feed?fields=id,message,created_time,comments{id,message,from{id,name,picture},created_time}&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      console.warn('[META SYNC COMMENTS WARNING]', data?.error?.message);
      return { syncedComments: 0, error: data?.error?.message };
    }

    let count = 0;
    for (const post of data?.data || []) {
      const postId = post.id;
      const postTitle = post.message?.slice(0, 70) || 'Publication Facebook';
      for (const comment of post.comments?.data || []) {
        if (!comment.message) continue;
        const cmtId = comment.id;
        if (db.facebookComments.some((c) => c.comment_id === cmtId)) continue;

        db.facebookComments.unshift({
          id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          post_id: postId,
          post_title: postTitle,
          comment_id: cmtId,
          sender_id: comment.from?.id || 'unknown',
          sender_name: comment.from?.name || 'Utilisateur Facebook',
          sender_avatar: comment.from?.picture?.data?.url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80',
          message: comment.message,
          created_at: comment.created_time || new Date().toISOString(),
          status: 'PENDING',
          moderation_flag: 'CLEAN',
        });
        count++;
      }
    }

    return { syncedComments: count };
  } catch (err: any) {
    console.error('[META SYNC COMMENTS FAILED]', err);
    return { syncedComments: 0, error: err.message };
  }
}

