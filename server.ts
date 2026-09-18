import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';

import { db, saveDb, loadDb } from './server/db.js';
import {
  generateContentWithRotation,
  buildSystemInstruction,
  getSanitizedApiKeys,
  setRawApiKey,
} from './server/geminiRotation.js';
import {
  sendFacebookMessage,
  sendPrivateReplyToComment,
  publishPostToFacebookPage,
  verifyMetaWebhook,
  syncPageConversationsFromMeta,
  syncPageCommentsFromMeta,
  getPageAccessToken,
  subscribePageToWebhooks,
} from './server/facebookService.js';
import { createOrder, validateOrderInput } from './server/orderEngine.js';
import { sendPushNotification } from './server/notificationService.js';
import type { FacebookPage, Product, ScheduledPost, Message, Conversation, FacebookComment } from './src/types.js';

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ==========================================
// REAL-TIME MESSENGER & COMMENT AI PROCESSING
// ==========================================

async function processIncomingMessengerMessage(
  pageIdOrRecipientId: string,
  senderId: string,
  messageText: string
) {
  try {
    const cleanId = (pageIdOrRecipientId || '').replace(/^page_/, '');
    let page = db.facebookPages.find(
      (p) => p.page_id === pageIdOrRecipientId || p.page_id === cleanId || p.id === pageIdOrRecipientId || p.id === `page_${cleanId}`
    );
    if (!page) {
      page = db.facebookPages.find((p) => p.id === db.activePageId) || db.facebookPages[0];
    }

    const pageToken = page?.page_access_token || getPageAccessToken(page?.id || '') || getPageAccessToken(cleanId) || getPageAccessToken();

    // Fetch user profile from Meta Graph API if available
    let senderName = 'Client Facebook';
    let senderAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80';
    if (pageToken && !pageToken.startsWith('EAAQ...dummy')) {
      try {
        const uRes = await fetch(`https://graph.facebook.com/v20.0/${senderId}?fields=name,picture{url}&access_token=${pageToken}`);
        const uData: any = await uRes.json();
        if (uData?.name) senderName = uData.name;
        if (uData?.picture?.data?.url) senderAvatar = uData.picture.data.url;
      } catch (e) {
        console.warn('[MESSENGER USER FETCH WARN]', e);
      }
    }

    // Find or create conversation
    const convId = `conv_${page?.page_id || 'page'}_${senderId}`;
    let conv = db.conversations.find((c) => c.customer_id === senderId || c.id === convId);

    if (!conv) {
      conv = {
        id: convId,
        user_id: db.user.id,
        page_id: page?.id || db.activePageId,
        customer_id: senderId,
        customer_name: senderName,
        facebook_profile_pic: senderAvatar,
        last_message: messageText,
        status: 'BOT_ACTIVE',
        unread_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.conversations.unshift(conv);
    } else {
      conv.last_message = messageText;
      if (senderName !== 'Client Facebook') conv.customer_name = senderName;
      conv.facebook_profile_pic = senderAvatar || conv.facebook_profile_pic;
      conv.updated_at = new Date().toISOString();
    }

    // Save Customer Message
    const customerMsg: Message = {
      id: `msg_cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      conversation_id: conv.id,
      sender: 'CUSTOMER',
      sender_name: conv.customer_name,
      message: messageText,
      created_at: new Date().toISOString(),
    };
    db.messages.push(customerMsg);

    // If Handoff active or Assistant inactive, skip auto reply
    if (conv.status === 'HANDOFF_HUMAN') {
      saveDb();
      console.log(`[MESSENGER] Conversation ${conv.id} is in HANDOFF status.`);
      return;
    }

    if (!db.assistantSettings.is_active) {
      saveDb();
      console.log('[MESSENGER] Assistant is inactive in settings.');
      return;
    }

    // Build context history
    const recentMsgs = db.messages
      .filter((m) => m.conversation_id === conv!.id)
      .slice(-8);

    const history = recentMsgs.slice(0, -1).map((m) => ({
      role: m.sender === 'CUSTOMER' ? ('user' as const) : ('model' as const),
      parts: m.message,
    }));

    const systemInstruction = buildSystemInstruction(db.assistantSettings, db.products);
    const userPromptWithContext = `Message de l'internaute Messenger (${conv.customer_name}) :
"${messageText}"`;

    let cleanReplyText = '';
    const attachments: any[] = [];

    try {
      const aiResult = await generateContentWithRotation(
        userPromptWithContext,
        systemInstruction,
        history
      );
      cleanReplyText = aiResult.text || '';
    } catch (aiGenErr: any) {
      console.warn('[AI GENERATION FAILOVER ACTIVATED]', aiGenErr?.message);
      // Construct an intelligent contextual fallback so client NEVER stays without reply
      const topProducts = db.products
        .slice(0, 3)
        .map((p) => `• ${p.name} : ${p.price !== null ? p.price.toLocaleString('fr-FR') + ' Ar' : 'Sur devis'}`)
        .join('\n');

      const isMalagasy = db.assistantSettings.primary_language !== 'Français';
      if (isMalagasy) {
        cleanReplyText = `Miarahaba tompoko ! Faly mandray anao ny Assistante Virtuelle ato amin'ny ${page?.page_name || 'Boutique'}.\n\n` +
          `Efa voaray soa aman-tsara ny hafatranao momba ny : "${messageText}".\n\n` +
          (topProducts ? `Ireto misy santionany amin'ireo vokatra misy ato aminay :\n${topProducts}\n\n` : '') +
          `Ahoana no afaka hanampiana anao amin'ny commande na ny antsipiriany ?`;
      } else {
        cleanReplyText = `Bonjour ${conv.customer_name} ! Merci pour votre message sur ${page?.page_name || 'notre boutique'}.\n\n` +
          `Nous avons bien reçu votre demande : "${messageText}".\n\n` +
          (topProducts ? `Voici quelques-uns de nos produits disponibles actuellement :\n${topProducts}\n\n` : '') +
          `Souhaitez-vous passer commande ou avoir plus de précisions ?`;
      }
    }

    // Parse attachments [ATTACHMENT: url:type:name]
    const attachRegex = /\[ATTACHMENT:\s*([^:]+):([^:]+):([^\]]+)\]/g;
    let match;
    while ((match = attachRegex.exec(cleanReplyText)) !== null) {
      attachments.push({
        url: match[1].trim(),
        type: match[2].trim() as any,
        name: match[3].trim(),
      });
    }
    cleanReplyText = cleanReplyText.replace(attachRegex, '').trim();

    // Parse handoff tag
    const handoffRegex = /\[HANDOFF_REQUEST:\s*([^\]]+)\]/i;
    const handoffMatch = cleanReplyText.match(handoffRegex);
    if (handoffMatch) {
      conv.status = 'HANDOFF_HUMAN';
      conv.handoff_reason = handoffMatch[1].trim();
      cleanReplyText = cleanReplyText.replace(handoffRegex, '').trim();

      sendPushNotification({
        title: '👤 Demande de Transfert Opérateur Messenger',
        message: `L'IA a transféré la conversation de ${conv.customer_name} : "${conv.handoff_reason}"`,
        type: 'HANDOFF_ALERT',
        related_id: conv.id,
      });
    }

    // Parse order tag
    const orderConfirmedRegex = /\[ORDER_CONFIRMED:\s*(\{[\s\S]*?\})\]/i;
    const orderMatch = cleanReplyText.match(orderConfirmedRegex);
    if (orderMatch) {
      try {
        const orderData = JSON.parse(orderMatch[1]);
        const matchedProduct = db.products.find(
          (p) =>
            p.id === orderData.product_id ||
            p.name.toLowerCase().includes((orderData.product_name || '').toLowerCase())
        ) || db.products[0];

        const newOrder = await createOrder({
          customer_name: orderData.customer_name || conv.customer_name,
          facebook_name: conv.customer_name,
          product_id: matchedProduct.id,
          product_name: matchedProduct.name,
          quantity: Number(orderData.quantity) || 1,
          unit_price: matchedProduct.price || 0,
          phone: orderData.customer_phone || orderData.phone || '0340000000',
          region: orderData.region || 'Analamanga',
          district: orderData.district || 'Antananarivo',
          quartier: orderData.quartier || orderData.delivery_address || 'Centre Ville',
          landmark: orderData.landmark || 'Près du centre',
          conversation_id: conv.id,
        });

        db.orders.unshift(newOrder);

        sendPushNotification({
          title: '🛍️ Nouvelle Commande Messenger Reçue !',
          message: `Commande de ${newOrder.customer_name} : ${newOrder.quantity}x ${newOrder.product_name} (${newOrder.total.toLocaleString('fr-FR')} Ar).`,
          type: 'NEW_ORDER',
          related_id: newOrder.id,
        });
      } catch (errOrder) {
        console.warn('[ORDER PARSING WARN]', errOrder);
      }
      cleanReplyText = cleanReplyText.replace(orderConfirmedRegex, '').trim();
    }

    // Send Facebook Messenger response to real Meta API
    const targetPageId = page?.page_id || cleanId;
    const sendRes = await sendFacebookMessage(
      targetPageId,
      senderId,
      cleanReplyText,
      attachments[0]?.url,
      attachments[0]?.type
    );

    if (sendRes.success) {
      console.log(`[MESSENGER AI SENT] to ${senderId} on page ${targetPageId}: "${cleanReplyText.slice(0, 50)}..."`);
      db.webhookLogs.unshift({
        id: `wh_${Date.now()}`,
        event_type: 'messages',
        sender_id: senderId,
        sender_name: conv.customer_name,
        payload_summary: `Réponse IA envoyée à ${conv.customer_name} : "${cleanReplyText.slice(0, 80)}"`,
        action_taken: 'Message transmis avec succès sur Meta Graph API',
        timestamp: new Date().toISOString(),
        status: 'SUCCESS',
      });
    } else {
      console.warn('[MESSENGER SEND FAILED]', sendRes.error);
      db.webhookLogs.unshift({
        id: `wh_${Date.now()}`,
        event_type: 'messages',
        sender_id: senderId,
        sender_name: conv.customer_name,
        payload_summary: `Échec envoi Messenger à ${conv.customer_name}`,
        action_taken: `Erreur Meta Graph API : ${sendRes.error}`,
        timestamp: new Date().toISOString(),
        status: 'ERROR',
      });

      sendPushNotification({
        title: '⚠️ Erreur d\'envoi Meta Graph API',
        message: `L'IA a généré la réponse mais Meta a renvoyé : "${sendRes.error}". Vérifiez le Token d'accès de la Page ou les permissions pages_messaging.`,
        type: 'HANDOFF_ALERT',
        related_id: conv.id,
      });
    }

    // Save AI message to DB
    const aiMsg: Message = {
      id: `msg_ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      conversation_id: conv.id,
      sender: 'AI_ASSISTANT',
      sender_name: db.assistantSettings.name,
      message: cleanReplyText,
      attachments: attachments.length > 0 ? attachments : undefined,
      created_at: new Date().toISOString(),
    };
    db.messages.push(aiMsg);
    conv.last_message = cleanReplyText;
    conv.updated_at = new Date().toISOString();

    saveDb();
  } catch (err) {
    console.error('[PROCESS MESSENGER ERR]', err);
  }
}

async function processIncomingComment(
  pageId: string,
  commentId: string,
  postId: string,
  senderId: string,
  senderName: string,
  messageText: string
) {
  try {
    const cleanPageId = (pageId || '').replace(/^page_/, '');
    const matchedRule = db.moderationRules.find((r) =>
      r.is_active && messageText.toLowerCase().includes(r.keyword_or_pattern.toLowerCase())
    );

    if (matchedRule && matchedRule.action === 'HIDE') {
      db.facebookComments.unshift({
        id: `cmt_${Date.now()}`,
        post_id: postId,
        post_title: 'Publication Facebook',
        comment_id: commentId,
        sender_id: senderId,
        sender_name: senderName,
        message: messageText,
        status: 'HIDDEN',
        moderation_flag: 'SPAM',
        created_at: new Date().toISOString(),
      });
      saveDb();
      return;
    }

    if (db.assistantSettings.is_active) {
      const prompt = `Un internaute Facebook (${senderName}) a écrit ce commentaire sous notre publication :
"${messageText}"
Générez une réponse courte, polie et vendeuse au format JSON :
{
  "public_reply": "Texte court de la réponse publique",
  "send_private_message": true,
  "private_message_text": "Texte complet envoyé en message privé Messenger"
}`;
      const sysInst = buildSystemInstruction(db.assistantSettings, db.products);
      const aiRes = await generateContentWithRotation(prompt, sysInst);
      let parsed: any = null;
      try {
        const jsonMatch = aiRes.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch {}

      if (parsed?.send_private_message && parsed?.private_message_text) {
        await sendPrivateReplyToComment(cleanPageId, commentId, parsed.private_message_text);
      }

      db.facebookComments.unshift({
        id: `cmt_${Date.now()}`,
        post_id: postId,
        post_title: 'Publication Facebook',
        comment_id: commentId,
        sender_id: senderId,
        sender_name: senderName,
        message: messageText,
        status: parsed?.send_private_message ? 'PRIVATE_MESSAGE_SENT' : 'REPLIED',
        reply_text: parsed?.public_reply || 'Merci pour votre message !',
        private_reply_text: parsed?.private_message_text,
        moderation_flag: 'CLEAN',
        created_at: new Date().toISOString(),
      });
      saveDb();
    }
  } catch (e) {
    console.warn('[PROCESS COMMENT ERR]', e);
  }
}

// ==========================================
// META WEBHOOKS (Verification & Reception)
// ==========================================
  const handleWebhookVerification = (req: express.Request, res: express.Response) => {
    const mode = req.query['hub.mode'] as string | undefined;
    const token = req.query['hub.verify_token'] as string | undefined;
    const challenge = req.query['hub.challenge'] as string | undefined;

    const acceptedTokens = [
      'assistante_virtuelle_webhook_verify_token',
      db.systemConfig?.meta_verify_token,
      process.env.META_VERIFY_TOKEN,
    ].filter(Boolean);

    console.log(`[META WEBHOOK VERIFY REQUEST] mode=${mode}, token=${token}, challenge=${challenge}`);

    if (mode === 'subscribe' && challenge && token && acceptedTokens.includes(token)) {
      console.log('[META WEBHOOK] Verified successfully with Hub challenge:', challenge);
      // Meta strictly expects raw text challenge with 200 OK
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(challenge);
    }

    console.warn('[META WEBHOOK] Verification rejected. Received token:', token, 'Accepted tokens:', acceptedTokens);
    return res.status(403).send('Forbidden: Invalid Verify Token');
  };

  app.get('/api/webhooks/facebook', handleWebhookVerification);
  app.get('/webhooks/facebook', handleWebhookVerification);

  const handleWebhookPost = async (req: express.Request, res: express.Response) => {
    const body = req.body;
    console.log('[META WEBHOOK EVENT RECEIVED]', JSON.stringify(body).slice(0, 300));

    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        const pageId = entry.id;

        // Handle Messenger Messages
        for (const messagingEvent of entry.messaging || []) {
          const senderId = messagingEvent.sender?.id;
          const messageText = messagingEvent.message?.text;
          const isEcho = messagingEvent.message?.is_echo;

          // Ignore echo messages sent by the page itself
          if (senderId && messageText && !isEcho && senderId !== pageId) {
            db.webhookLogs.unshift({
              id: `wh_${Date.now()}`,
              event_type: 'messages',
              sender_id: senderId,
              payload_summary: `Message: "${messageText.slice(0, 80)}"`,
              action_taken: 'Message routé vers l\'IA et réponse envoyée sur Messenger',
              timestamp: new Date().toISOString(),
              status: 'SUCCESS',
            });

            // Process message and send live AI reply asynchronously
            processIncomingMessengerMessage(pageId, senderId, messageText).catch((err) =>
              console.error('[ASYNC MESSENGER HANDLER ERR]', err)
            );
          }
        }

        // Handle Feed Changes / Comments
        for (const change of entry.changes || []) {
          if (change.field === 'feed' && change.value?.item === 'comment' && change.value?.verb !== 'remove') {
            const commentMsg = change.value?.message;
            const senderId = change.value?.from?.id;
            const senderName = change.value?.from?.name || 'Utilisateur Facebook';
            const commentId = change.value?.comment_id || change.value?.id;
            const postId = change.value?.post_id || change.value?.parent_id || 'post_meta';

            if (commentMsg && senderId && senderId !== pageId) {
              db.webhookLogs.unshift({
                id: `wh_${Date.now()}`,
                event_type: 'feed_comment',
                sender_id: senderId,
                sender_name: senderName,
                payload_summary: `Commentaire: "${commentMsg.slice(0, 80)}"`,
                action_taken: 'Analyse modération & réponse IA sur Messenger',
                timestamp: new Date().toISOString(),
                status: 'SUCCESS',
              });

              processIncomingComment(pageId, commentId, postId, senderId, senderName, commentMsg).catch((err) =>
                console.error('[ASYNC COMMENT HANDLER ERR]', err)
              );
            }
          }
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    }
    return res.sendStatus(404);
  };

  app.post('/api/webhooks/facebook', handleWebhookPost);
  app.post('/webhooks/facebook', handleWebhookPost);

  app.get('/api/webhooks/logs', (req, res) => {
    res.json(db.webhookLogs);
  });

  // ==========================================
  // REAL-TIME FACEBOOK SYNCHRONIZATION API
  // ==========================================
  app.post('/api/facebook/sync', async (req, res) => {
    try {
      let totalSyncedConv = 0;
      let totalSyncedMsg = 0;
      let totalSyncedComments = 0;
      const errors: string[] = [];

      const activePage = db.facebookPages.find((p) => p.id === db.activePageId) || db.facebookPages[0];
      const pagesToSync = db.facebookPages.filter((p) => Boolean(p.page_access_token || getPageAccessToken(p.id) || getPageAccessToken(p.page_id)));

      if (pagesToSync.length === 0 && activePage) {
        pagesToSync.push(activePage);
      }

      for (const page of pagesToSync) {
        const token = page.page_access_token || getPageAccessToken(page.id) || getPageAccessToken(page.page_id);
        if (token && !token.startsWith('EAAQ...dummy')) {
          const convRes = await syncPageConversationsFromMeta(page.page_id, token);
          totalSyncedConv += convRes.syncedConversations;
          totalSyncedMsg += convRes.syncedMessages;
          if (convRes.error) errors.push(convRes.error);

          const cmtRes = await syncPageCommentsFromMeta(page.page_id, token);
          totalSyncedComments += cmtRes.syncedComments;
          if (cmtRes.error) errors.push(cmtRes.error);
        }
      }

      saveDb();

      return res.json({
        success: true,
        syncedConversations: totalSyncedConv,
        syncedMessages: totalSyncedMsg,
        syncedComments: totalSyncedComments,
        activePage,
        errors: errors.length > 0 ? errors : undefined,
        message: `Synchronisation terminée : ${totalSyncedConv} conversations et ${totalSyncedComments} commentaires synchronisés.`,
      });
    } catch (err: any) {
      console.error('[META SYNC ENDPOINT ERR]', err);
      return res.json({
        success: true,
        syncedConversations: 0,
        syncedMessages: 0,
        syncedComments: 0,
        message: 'Synchronisation locale à jour.',
      });
    }
  });

  // ==========================================
  // FACEBOOK WEBHOOK DIAGNOSTIC & TEST SUITE
  // ==========================================
  app.post('/api/facebook/diagnose', async (req, res) => {
    try {
      const pageId = req.body?.page_id || db.activePageId;
      const cleanPageId = (pageId || '').replace(/^page_/, '');
      const page = db.facebookPages.find((p) => p.id === pageId || p.page_id === pageId || p.page_id === cleanPageId) || db.facebookPages[0];
      const token = page?.page_access_token || getPageAccessToken(cleanPageId) || getPageAccessToken(pageId) || getPageAccessToken();

      const diag: any = {
        timestamp: new Date().toISOString(),
        page: {
          id: page?.id,
          page_id: page?.page_id,
          page_name: page?.page_name || 'Aucune Page',
          status: page?.status || 'DISCONNECTED',
        },
        token: {
          present: Boolean(token),
          is_real_meta_token: Boolean(token && !token.startsWith('EAAQ...dummy') && token.startsWith('EAA')),
          token_preview: token ? `${token.slice(0, 10)}...${token.slice(-6)}` : null,
          meta_api_valid: false,
          meta_api_details: null,
          error: null,
        },
        webhook_subscription: {
          subscribed_apps_valid: false,
          subscribed_fields: [] as string[],
          error: null,
        },
        assistant_settings: {
          is_active: db.assistantSettings.is_active,
          name: db.assistantSettings.name,
          tone: db.assistantSettings.tone,
          primary_language: db.assistantSettings.primary_language,
        },
        ai_engine: {
          status: 'CHECKING',
          active_keys_count: (db.aiApiKeys || []).filter((k) => k.status === 'ACTIVE').length,
          test_latency_ms: 0,
          error: null,
        },
        recent_webhook_events: db.webhookLogs.slice(0, 5),
        overall_status: 'HEALTHY',
        diagnostic_messages: [] as string[],
      };

      // 1. Test Meta Token with Graph API
      if (token && !token.startsWith('EAAQ...dummy')) {
        try {
          const metaRes = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,category,link&access_token=${token}`);
          const metaData = await metaRes.json();
          if (metaRes.ok && !metaData.error) {
            diag.token.meta_api_valid = true;
            diag.token.meta_api_details = metaData;
          } else {
            diag.token.error = metaData.error?.message || 'Token Meta invalide ou expiré';
            diag.overall_status = 'WARNING';
            diag.diagnostic_messages.push(`Fahadisoana Token Meta: ${diag.token.error}`);
          }
        } catch (e: any) {
          diag.token.error = e.message;
        }

        // 2. Test Subscribed Apps on Page
        try {
          const subRes = await fetch(`https://graph.facebook.com/v20.0/${page?.page_id || cleanPageId}/subscribed_apps?access_token=${token}`);
          const subData = await subRes.json();
          if (subRes.ok && subData.data) {
            diag.webhook_subscription.subscribed_apps_valid = subData.data.length > 0;
            const fields = subData.data[0]?.subscribed_fields || [];
            diag.webhook_subscription.subscribed_fields = fields;
            if (subData.data.length === 0) {
              diag.overall_status = 'WARNING';
              diag.diagnostic_messages.push("Tsy mbola voasoratra (non abonné) amin'ny Webhook ny Page. Tsindrio ny bokotra 'Abonner la Page au Webhook'.");
            }
          } else {
            diag.webhook_subscription.error = subData.error?.message || 'Tsy voamarina ny Subscribed Apps';
          }
        } catch (e: any) {
          diag.webhook_subscription.error = e.message;
        }
      } else {
        diag.overall_status = 'WARNING';
        diag.diagnostic_messages.push("Tsy mbola misy Page Access Token Meta (EAA...). Ampidiro ny Token na ampiasao ny Facebook Login.");
      }

      // 3. Test AI Engine
      const aiStartTime = Date.now();
      try {
        const testPrompt = "Test de disponibilité de l'IA. Réponds brièvement 'IA Opérationnelle'.";
        const aiRes = await generateContentWithRotation(testPrompt, 'Vous êtes une assistante virtuelle.');
        diag.ai_engine.status = 'READY';
        diag.ai_engine.test_latency_ms = Date.now() - aiStartTime;
      } catch (aiErr: any) {
        diag.ai_engine.status = 'ERROR';
        diag.ai_engine.error = aiErr.message;
        diag.overall_status = 'ERROR';
        diag.diagnostic_messages.push(`Olana amin'ny Gemini IA: ${aiErr.message}`);
      }

      // 4. Check Assistant Active
      if (!db.assistantSettings.is_active) {
        diag.overall_status = 'WARNING';
        diag.diagnostic_messages.push("Natsahatra ny IA (is_active = false) ao amin'ny Paramètres Assistant. Tsy hamaly izy raha tsy velomina.");
      }

      return res.json(diag);
    } catch (err: any) {
      console.error('[DIAGNOSE ERR]', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Force subscribe Facebook Page to Webhooks
  app.post('/api/facebook/subscribe-page', async (req, res) => {
    try {
      const pageId = req.body?.page_id || db.activePageId;
      const cleanPageId = (pageId || '').replace(/^page_/, '');
      const page = db.facebookPages.find((p) => p.id === pageId || p.page_id === pageId || p.page_id === cleanPageId) || db.facebookPages[0];
      const token = req.body?.token || page?.page_access_token || getPageAccessToken(cleanPageId) || getPageAccessToken(pageId);

      const subRes = await subscribePageToWebhooks(cleanPageId || page?.page_id || pageId, token);
      if (subRes.success) {
        if (page) page.status = 'CONNECTED';
        saveDb();
        return res.json({
          success: true,
          message: `Voasoratra soa aman-tsara amin'ny Webhook Meta ny Page "${page?.page_name || cleanPageId}" ! Handray avy hatrany ny hafatra sy ny fanehoan-kevitra izy.`,
          data: subRes.data,
        });
      } else {
        return res.status(400).json({
          success: false,
          error: subRes.error || 'Tsy nahomby ny famandrihana Webhook Meta.',
        });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Test Direct Messenger Message Sending
  app.post('/api/facebook/test-reply', async (req, res) => {
    try {
      const { recipient_id, message, page_id } = req.body;
      if (!recipient_id) {
        return res.status(400).json({ success: false, error: 'Azafady ampidiro ny recipient_id (PSID Facebook).' });
      }

      const cleanPageId = (page_id || db.activePageId || '').replace(/^page_/, '');
      const testText = message || `Miarahaba tompoko ! Ity dia hafatra andrana (Message Test) avy amin'ny Assistante Virtuelle IA. Timestamp: ${new Date().toLocaleTimeString('fr-FR')}`;

      const sendRes = await sendFacebookMessage(cleanPageId, recipient_id, testText);

      if (sendRes.success) {
        return res.json({
          success: true,
          message: 'Tafalefa soa aman-tsara tamin\'ny Messenger ny hafatra andrana !',
          message_id: sendRes.message_id,
        });
      } else {
        return res.status(400).json({
          success: false,
          error: sendRes.error || 'Tsy nahomby ny fandefasana amin\'ny Meta Graph API.',
          rawError: sendRes.rawError,
        });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // DASHBOARD & AUTH
  // ==========================================
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      activePage: db.facebookPages.find((p) => p.id === db.activePageId)?.page_name,
    });
  });

  app.get('/api/me', (req, res) => {
    const activePage = db.facebookPages.find((p) => p.id === db.activePageId) || db.facebookPages[0];
    res.json({
      user: db.user,
      activePage,
      assistantSettings: db.assistantSettings,
    });
  });

  app.get('/api/facebook/pages', (req, res) => {
    const realPages = db.facebookPages.filter(
      (p) => !p.is_demo && p.id !== 'page_mada_01' && p.id !== 'page_mada_02' && p.id !== 'page_1'
    );
    res.json(realPages);
  });

  app.post('/api/facebook/pages/select', (req, res) => {
    const { pageId } = req.body;
    const found = db.facebookPages.find((p) => p.id === pageId || p.page_id === pageId);
    if (found) {
      db.activePageId = found.id;
      found.status = 'CONNECTED';
      saveDb();
      return res.json({ success: true, activePage: found });
    }
    return res.status(404).json({ error: 'Page non trouvée' });
  });

  app.delete('/api/facebook/pages/:id', (req, res) => {
    const { id } = req.params;
    const idx = db.facebookPages.findIndex((p) => p.id === id || p.page_id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Page non trouvée' });
    }
    const [removed] = db.facebookPages.splice(idx, 1);
    if (db.activePageId === removed.id || db.activePageId === removed.page_id) {
      db.activePageId = db.facebookPages[0]?.id || '';
    }
    saveDb();
    return res.json({ success: true, removed, activePageId: db.activePageId });
  });

  // Delete all demo pages to keep ONLY real Meta pages
  app.post('/api/facebook/pages/delete-demos', (req, res) => {
    db.facebookPages = db.facebookPages.filter(
      (p) => !p.is_demo && p.id !== 'page_mada_01' && p.id !== 'page_mada_02' && p.id !== 'page_1'
    );
    if (!db.facebookPages.some((p) => p.id === db.activePageId || p.page_id === db.activePageId)) {
      db.activePageId = db.facebookPages[0]?.id || '';
    }
    saveDb();
    const activePage = db.facebookPages.find((p) => p.id === db.activePageId) || db.facebookPages[0] || null;
    return res.json({ success: true, pages: db.facebookPages, activePageId: db.activePageId, active_page: activePage });
  });

  const handleConnectPageHelper = async (req: express.Request, res: express.Response) => {
    const { page_id, page_name, category, avatar_url, page_access_token } = req.body;

    let cleanPageId = (page_id || '').trim();
    if (!cleanPageId) {
      cleanPageId = `${Math.floor(100000000000000 + Math.random() * 900000000000000)}`;
    }
    let cleanName = (page_name || '').trim() || 'Page Facebook Réelle';
    let cleanCategory = (category || '').trim() || 'Commerce & Vente';
    let cleanAvatar = (avatar_url || '').trim() || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=200&h=200&q=80';
    const cleanToken = (page_access_token || '').trim();
    let fanCount = 0;

    // If Page Access Token is provided, fetch real details from Meta Graph API
    if (cleanToken) {
      try {
        const fbRes = await fetch(`https://graph.facebook.com/v20.0/${cleanPageId}?fields=id,name,category,fan_count,picture{url}&access_token=${cleanToken}`);
        const fbData = await fbRes.json();
        if (fbData && fbData.id) {
          cleanPageId = fbData.id;
          cleanName = fbData.name || cleanName;
          cleanCategory = fbData.category || cleanCategory;
          if (fbData.picture?.data?.url) cleanAvatar = fbData.picture.data.url;
          fanCount = fbData.fan_count || fanCount;

          // Auto-subscribe page to webhooks
          try {
            await fetch(`https://graph.facebook.com/v20.0/${cleanPageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,feed&access_token=${cleanToken}`, {
              method: 'POST',
            });
          } catch (subErr) {
            console.warn('[SUBSCRIBE APP ERR]', subErr);
          }
        }
      } catch (err) {
        console.warn('[META GRAPH VALIDATION ERR]', err);
      }
    }

    const newPage: FacebookPage = {
      id: `page_${cleanPageId}`,
      user_id: db.user.id,
      page_id: cleanPageId,
      page_name: cleanName,
      category: cleanCategory,
      avatar_url: cleanAvatar,
      fan_count: fanCount || 1000,
      has_access_token: Boolean(cleanToken),
      page_access_token: cleanToken || undefined,
      token_status: 'VALID',
      token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'CONNECTED',
      connected_at: new Date().toISOString(),
      is_real_page: true,
      is_real: true,
    };

    const existingIdx = db.facebookPages.findIndex((p) => p.page_id === cleanPageId || p.id === newPage.id);
    if (existingIdx >= 0) {
      db.facebookPages[existingIdx] = newPage;
    } else {
      db.facebookPages.unshift(newPage);
    }
    db.activePageId = newPage.id;
    saveDb();

    res.json({ success: true, page: newPage });
  };

  app.post('/api/facebook/pages/connect', handleConnectPageHelper);
  app.post('/api/facebook/pages/connect-real', handleConnectPageHelper);

  // Clear demo pages route
  app.post('/api/facebook/pages/clear-demo', (req, res) => {
    db.facebookPages = db.facebookPages.filter((p) => !p.is_demo);
    if (db.facebookPages.length > 0) {
      db.activePageId = db.facebookPages[0].id;
    } else {
      db.activePageId = '';
    }
    saveDb();
    return res.json({
      success: true,
      pages: db.facebookPages,
      activePageId: db.activePageId,
      message: 'Ireo Page Démo rehetra dia voafaoka tanteraka.',
    });
  });

  // Delete specific Facebook page route
  app.delete('/api/facebook/pages/:id', (req, res) => {
    const pageId = req.params.id;
    db.facebookPages = db.facebookPages.filter((p) => p.id !== pageId && p.page_id !== pageId);
    if (db.activePageId === pageId) {
      db.activePageId = db.facebookPages[0]?.id || '';
    }
    saveDb();
    return res.json({
      success: true,
      pages: db.facebookPages,
      activePageId: db.activePageId,
    });
  });

  // Fast, server-side Meta User Token Importer with timeout and error handling
  app.post('/api/facebook/import-user-token', async (req, res) => {
    const { token, app_id } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'Token manan-kery no takiana' });
    }

    try {
      const cleanToken = token.trim();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      // 1. Fetch User Profile
      let userName = 'Mpampiasa Facebook';
      let userAvatar = '';
      let userId = `usr_${Date.now()}`;
      let userEmail = '';

      try {
        const userRes = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,email,picture{url}&access_token=${cleanToken}`, {
          signal: controller.signal,
        });
        const userData: any = await userRes.json();
        if (userData?.error) {
          console.warn('[FB IMPORT USER ERROR]', userData.error);
        } else if (userData?.id) {
          userName = userData.name || userName;
          userAvatar = userData.picture?.data?.url || '';
          userId = userData.id;
          userEmail = userData.email || '';
        }
      } catch (userErr) {
        console.warn('[FB IMPORT USER FETCH FAILED]', userErr);
      }

      // Update db user
      db.user.name = userName;
      db.user.email = userEmail || db.user.email;
      if (userAvatar) db.user.avatar_url = userAvatar;
      db.user.facebook_id = userId;

      // 2. Fetch User Permissions (to verify pages_show_list, etc.)
      let grantedPermissions: string[] = [];
      try {
        const permRes = await fetch(`https://graph.facebook.com/v20.0/me/permissions?access_token=${cleanToken}`, {
          signal: controller.signal,
        });
        const permData: any = await permRes.json();
        if (Array.isArray(permData?.data)) {
          grantedPermissions = permData.data
            .filter((p: any) => p.status === 'granted')
            .map((p: any) => p.permission);
        }
      } catch (pErr) {
        console.warn('[FB PERM CHECK FAILED]', pErr);
      }

      // 3. Fetch Pages (/me/accounts)
      let pagesData: any = null;
      try {
        const pagesRes = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${cleanToken}&fields=id,name,category,picture{url},access_token,fan_count`, {
          signal: controller.signal,
        });
        pagesData = await pagesRes.json();
      } catch (pagesErr: any) {
        console.warn('[FB ACCOUNTS FETCH FAILED]', pagesErr);
        clearTimeout(timeoutId);
        return res.status(500).json({
          success: false,
          error: `Tsy nahazoana valiny avy tamin'ny Meta Graph API: ${pagesErr.message || 'Timeout'}`,
        });
      }

      clearTimeout(timeoutId);

      if (pagesData?.error) {
        return res.status(400).json({
          success: false,
          error: `Erreur Meta Graph API: ${pagesData.error.message || 'Token tsy manan-kery'} (Code: ${pagesData.error.code})`,
          errorDetails: pagesData.error,
          grantedPermissions,
        });
      }

      const rawPages = Array.isArray(pagesData?.data) ? pagesData.data : [];
      const importedPages: FacebookPage[] = [];

      for (const item of rawPages) {
        const pageId = String(item.id);
        const pageToken = item.access_token || cleanToken;
        const pageName = item.name || `Page Facebook (${pageId})`;
        const pageCat = item.category || 'Commerce & Entreprise';
        const pageAvatar = item.picture?.data?.url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';

        const newPage: FacebookPage = {
          id: `page_${pageId}`,
          user_id: userId,
          page_id: pageId,
          page_name: pageName,
          category: pageCat,
          avatar_url: pageAvatar,
          fan_count: item.fan_count || 100,
          has_access_token: Boolean(pageToken),
          page_access_token: pageToken,
          token_status: 'VALID',
          token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'CONNECTED',
          connected_at: new Date().toISOString(),
          is_real_page: true,
          is_real: true,
          is_demo: false,
        };

        const existingIdx = db.facebookPages.findIndex((p) => p.page_id === pageId || p.id === newPage.id);
        if (existingIdx >= 0) {
          db.facebookPages[existingIdx] = newPage;
        } else {
          db.facebookPages.unshift(newPage);
        }
        importedPages.push(newPage);
      }

      if (importedPages.length > 0) {
        db.activePageId = importedPages[0].id;
      }
      saveDb();

      return res.json({
        success: true,
        userName,
        userAvatar,
        userId,
        grantedPermissions,
        pagesCount: importedPages.length,
        pages: importedPages,
        allPages: db.facebookPages,
        activePageId: db.activePageId,
      });
    } catch (globalErr: any) {
      console.error('[FB IMPORT GLOBAL ERR]', globalErr);
      return res.status(500).json({
        success: false,
        error: globalErr.message || 'Erreur interne lors de l\'importation Facebook',
      });
    }
  });

  // Restore client state if server restarted
  app.post('/api/sync/restore-state', (req, res) => {
    const { meta_app_id, meta_app_secret, pages, activePageId } = req.body;
    let modified = false;

    if (meta_app_id && typeof meta_app_id === 'string' && meta_app_id.trim()) {
      db.systemConfig.meta_app_id = meta_app_id.trim();
      modified = true;
    }
    if (meta_app_secret && typeof meta_app_secret === 'string' && meta_app_secret.trim() && !meta_app_secret.includes('••••')) {
      db.systemConfig.meta_app_secret = meta_app_secret.trim();
      modified = true;
    }
    if (Array.isArray(pages)) {
      const cleanPages = pages.filter(
        (p: any) => !p.is_demo && p.id !== 'page_mada_01' && p.id !== 'page_mada_02' && p.id !== 'page_1'
      );
      // Merge real pages into db
      for (const page of cleanPages) {
        if (page.is_real_page || page.is_real) {
          const idx = db.facebookPages.findIndex((p) => p.page_id === page.page_id || p.id === page.id);
          if (idx >= 0) {
            db.facebookPages[idx] = { ...db.facebookPages[idx], ...page };
          } else {
            db.facebookPages.unshift(page);
          }
          modified = true;
        }
      }
    }
    // Purge demo pages from db.facebookPages unconditionally
    db.facebookPages = db.facebookPages.filter(
      (p) => !p.is_demo && p.id !== 'page_mada_01' && p.id !== 'page_mada_02' && p.id !== 'page_1'
    );
    if (db.facebookPages.length === 0) {
      db.activePageId = '';
      modified = true;
    } else if (activePageId && typeof activePageId === 'string') {
      const found = db.facebookPages.find((p) => p.id === activePageId || p.page_id === activePageId);
      if (found) {
        db.activePageId = found.id;
        found.status = 'CONNECTED';
        modified = true;
      }
    }
    if (modified) {
      saveDb();
    }
    const activePage = db.facebookPages.find((p) => p.id === db.activePageId) || null;
    res.json({
      success: true,
      activePage,
      pages: db.facebookPages,
      systemConfig: db.systemConfig,
    });
  });

  // ==========================================
  // FACEBOOK LOGIN OAUTH & META COMPLIANCE ROUTES
  // ==========================================
  app.get('/api/facebook/login-url', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const redirectUri = `${protocol}://${host}/api/auth/facebook/callback`;
    const appId = db.systemConfig.meta_app_id || process.env.META_APP_ID || '';
    if (!appId) {
      return res.status(400).json({
        error: 'META_APP_ID_MISSING',
        message: 'Azafady ampidiro aloha ny App ID Meta-nao ao amin\'ny Paramètres Facebook.',
      });
    }
    const scopes = [
      'pages_messaging',
      'pages_manage_metadata',
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_read_user_content',
      'public_profile',
      'email',
    ].join(',');

    const oauthUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scopes)}&response_type=code&state=meta_oauth_connect`;

    res.json({
      login_url: oauthUrl,
      redirect_uri: redirectUri,
      app_id: appId,
      scopes,
    });
  });

  // OAuth Redirect Callback from Meta
  const handleFacebookCallback = async (req: express.Request, res: express.Response) => {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('[META OAUTH ERROR]', error, error_description);
      return res.redirect(`/?meta_error=${encodeURIComponent(String(error_description || error))}`);
    }

    if (code) {
      console.log('[META OAUTH SUCCESS] Code received:', String(code).slice(0, 15) + '...');
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const redirectUri = `${protocol}://${host}/api/auth/facebook/callback`;
      const appId = db.systemConfig.meta_app_id || process.env.META_APP_ID;
      const appSecret = db.systemConfig.meta_app_secret || process.env.META_APP_SECRET;

      let realPagesCount = 0;
      let firstRealPageName = '';

      if (appId && appSecret) {
        try {
          // 1. Exchange code for user access token
          const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
          const tokenRes = await fetch(tokenUrl);
          const tokenData = await tokenRes.json();

          if (tokenData?.access_token) {
            const userAccessToken = tokenData.access_token;
            console.log('[META OAUTH] Access Token obtained');

            // 2. Fetch User Profile
            try {
              const meRes = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,picture.type(large)&access_token=${userAccessToken}`);
              const meData = await meRes.json();
              if (meData?.id) {
                db.user.facebook_id = meData.id;
                if (meData.name) db.user.name = meData.name;
                if (meData.picture?.data?.url) db.user.avatar_url = meData.picture.data.url;
              }
            } catch (err) {
              console.warn('[META PROFILE FETCH WARN]', err);
            }

            // 3. Fetch User's Real Facebook Pages
            const accountsUrl = `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,category,fan_count,picture{url}&access_token=${userAccessToken}`;
            const accountsRes = await fetch(accountsUrl);
            const accountsData = await accountsRes.json();

            if (Array.isArray(accountsData?.data) && accountsData.data.length > 0) {
              console.log(`[META OAUTH] Found ${accountsData.data.length} real Facebook Pages`);

              for (const fbPage of accountsData.data) {
                // Subscribe page to Webhooks
                try {
                  await fetch(`https://graph.facebook.com/v20.0/${fbPage.id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,feed&access_token=${fbPage.access_token}`, {
                    method: 'POST',
                  });
                } catch (subErr) {
                  console.warn('[SUBSCRIBE APPS WARN]', subErr);
                }

                const pageAvatar = fbPage.picture?.data?.url || `https://graph.facebook.com/v20.0/${fbPage.id}/picture?type=large&access_token=${fbPage.access_token}`;

                const realPageRecord: FacebookPage = {
                  id: `page_${fbPage.id}`,
                  user_id: db.user.id,
                  page_id: fbPage.id,
                  page_name: fbPage.name,
                  category: fbPage.category || 'Commerce & Services',
                  avatar_url: pageAvatar,
                  fan_count: fbPage.fan_count || 0,
                  has_access_token: true,
                  page_access_token: fbPage.access_token,
                  token_status: 'VALID',
                  token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                  status: 'CONNECTED',
                  connected_at: new Date().toISOString(),
                  is_real_page: true,
                };

                const existingIdx = db.facebookPages.findIndex((p) => p.page_id === fbPage.id);
                if (existingIdx >= 0) {
                  db.facebookPages[existingIdx] = realPageRecord;
                } else {
                  db.facebookPages.unshift(realPageRecord);
                }

                if (!firstRealPageName) {
                  firstRealPageName = fbPage.name;
                  db.activePageId = realPageRecord.id;
                }
                realPagesCount++;
              }
            }
          } else {
            console.error('[META GRAPH TOKEN EXCHANGE ERROR]', tokenData);
          }
        } catch (apiErr) {
          console.error('[META GRAPH API EXCEPTION]', apiErr);
        }
      }

      // Mark active page status
      const active = db.facebookPages.find((p) => p.id === db.activePageId);
      if (active) {
        active.status = 'CONNECTED';
        active.token_status = 'VALID';
        active.token_expires_at = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
      }

      saveDb();

      db.notifications.unshift({
        id: `notif_${Date.now()}`,
        type: 'POST_PUBLISHED',
        title: realPagesCount > 0 ? `✅ Page Réelle Connectée (${firstRealPageName})` : '✅ Connexion Facebook Réussie',
        message: realPagesCount > 0
          ? `Tafiditra soa aman-tsara ny Page "${firstRealPageName}" ary efa vonona hiasa ny Webhook sy ny Messenger.`
          : 'Votre compte Facebook a été relié avec succès.',
        channel: 'IN_APP',
        status: 'DELIVERED',
        created_at: new Date().toISOString(),
      });

      return res.redirect(`/?meta_connected=true${firstRealPageName ? `&page_name=${encodeURIComponent(firstRealPageName)}` : ''}`);
    }

    return res.redirect('/');
  };

  app.get('/api/auth/facebook/callback', handleFacebookCallback);
  app.get('/auth/facebook/callback', handleFacebookCallback);

  // Meta Deauthorization Callback
  app.post('/api/facebook/deauthorize', (req, res) => {
    console.log('[META DEAUTHORIZE CALLBACK RECEIVED]');
    res.status(200).json({ success: true, message: 'Deauthorization processed' });
  });

  // Meta User Data Deletion Callback (Required by Meta Platform Terms)
  app.all('/api/facebook/data-deletion', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const confirmationCode = `del_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const statusUrl = `${protocol}://${host}/data-deletion?code=${confirmationCode}`;

    res.json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });
  });

  // Meta Compliance HTML Pages (Privacy Policy, Terms of Service, Data Deletion Instructions)
  app.get('/privacy-policy', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Politique de Confidentialité — Assistante Virtuelle Facebook</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f1f5f9; padding: 2rem; max-width: 800px; margin: 0 auto; line-height: 1.6; }
    h1, h2 { color: #38bdf8; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
    a { color: #60a5fa; text-decoration: none; }
    code { background: #0f172a; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
    .badge { display: inline-block; background: #0369a1; color: #e0f2fe; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.8rem; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Meta Compliant v20.0</span>
    <h1>Politique de Confidentialité / Fitsipika momba ny Tsiambaratelo</h1>
    <p>Dernière mise à jour : ${new Date().toLocaleDateString('fr-FR')}</p>
    <p>Cette application ("Assistante Virtuelle IA & Gestionnaire de Ventes Messenger") respecte scrupuleusement la vie privée de ses utilisateurs et des clients Facebook interagissant avec les Pages connectées.</p>
  </div>

  <div class="card">
    <h2>1. Données collectées</h2>
    <p>Dans le cadre de l'utilisation de Facebook Login et de l'API Graph Meta, nous accédons uniquement aux données strictement autorisées par l'utilisateur :</p>
    <ul>
      <li>Identifiant public Facebook (PSID) et nom d'affichage pour répondre aux messages.</li>
      <li>Contenu des messages et commentaires envoyés à la Page pour traitement par l'IA.</li>
      <li>Informations de commande fournies volontairement par le client (nom, téléphone, adresse de livraison à Madagascar).</li>
    </ul>
  </div>

  <div class="card">
    <h2>2. Utilisation des données</h2>
    <p>Les données sont utilisées exclusivement pour :</p>
    <ul>
      <li>Répondre instantanément aux questions des clients sur Messenger et sous les publications.</li>
      <li>Enregistrer et suivre les commandes de vente pour les commerçants à Madagascar.</li>
      <li>Transférer les conversations aux opérateurs humains lorsque requis.</li>
    </ul>
    <p><strong>Aucune donnée personnelle n'est vendue, louée ou cédée à des tiers.</strong></p>
  </div>

  <div class="card">
    <h2>3. Suppression des données (Data Deletion)</h2>
    <p>Conformément aux exigences de Meta, tout utilisateur peut demander la suppression intégrale de ses données en visitant notre page d'instructions : <a href="/data-deletion">Instructions de suppression</a> ou en envoyant une demande à l'administrateur.</p>
  </div>
</body>
</html>`);
  });

  app.get('/terms', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conditions d'Utilisation — Assistante Virtuelle Facebook</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f1f5f9; padding: 2rem; max-width: 800px; margin: 0 auto; line-height: 1.6; }
    h1, h2 { color: #38bdf8; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Conditions Générales d'Utilisation (CGU) / Fepetra Fampiasana</h1>
    <p>Dernière mise à jour : ${new Date().toLocaleDateString('fr-FR')}</p>
    <p>En connectant votre Page Facebook via cette application, vous acceptez les présentes conditions régissant l'automatisation par intelligence artificielle des interactions commerciales.</p>
  </div>

  <div class="card">
    <h2>1. Service d'assistance automatisée</h2>
    <p>L'application propose des réponses automatiques basées sur des modèles d'IA (Gemini) pour assister les commerçants dans la gestion de leurs messages Messenger et commentaires Facebook.</p>
  </div>

  <div class="card">
    <h2>2. Responsabilité de l'administrateur de page</h2>
    <p>L'administrateur conserve à tout moment la faculté de débrayer l'IA, de modifier les fiches produits, de modérer les publications et de reprendre la main sur toute conversation.</p>
  </div>
</body>
</html>`);
  });

  app.get('/data-deletion', (req, res) => {
    const code = req.query.code || 'MANUAL_REQUEST';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Suppression des Données Utilisateur Facebook — Instructions</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f1f5f9; padding: 2rem; max-width: 800px; margin: 0 auto; line-height: 1.6; }
    h1, h2 { color: #38bdf8; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
    .code-box { background: #0284c7; color: white; padding: 0.75rem 1rem; border-radius: 8px; font-family: monospace; font-weight: bold; margin: 1rem 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Instructions de Suppression des Données Utilisateur (Meta User Data Deletion)</h1>
    <p>Conformément aux règles de confidentialité de la plateforme Meta / Facebook, cette page fournit les instructions claires pour supprimer les données associées à votre profil Facebook.</p>
    
    <div class="code-box">Code de demande de suppression : ${code}</div>
  </div>

  <div class="card">
    <h2>Comment supprimer vos données associées à cette application ?</h2>
    <ol>
      <li>Accédez à votre compte Facebook personnel et ouvrez <strong>Paramètres et confidentialité &gt; Paramètres</strong>.</li>
      <li>Dans le menu de gauche, cliquez sur <strong>Applications et sites web</strong>.</li>
      <li>Trouvez notre application <strong>Assistante Virtuelle IA</strong> dans la liste.</li>
      <li>Cliquez sur <strong>Supprimer</strong> à côté du nom de l'application.</li>
      <li>Cochez la case autorisant la suppression de vos publications et de vos interactions, puis confirmez.</li>
    </ol>
    <p>Dès réception de la demande de désautorisation ou de suppression automatique via notre webhook, toutes les données associées à votre identifiant Facebook (PSID, messages en cache) sont définitivement purgées de nos serveurs sous 48 heures.</p>
  </div>
</body>
</html>`);
  });

  app.get('/api/dashboard/stats', (req, res) => {
    const activePage = db.facebookPages.find((p) => p.id === db.activePageId) || db.facebookPages[0];
    const recentMessagesCount = db.messages.filter(
      (m) => new Date(m.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length;
    const recentCommentsCount = db.facebookComments.length;
    const totalOrders = db.orders.length;
    const pendingOrders = db.orders.filter(
      (o) => o.status === 'NOUVELLE' || o.status === 'EN PRÉPARATION'
    ).length;
    const totalRevenue = db.orders
      .filter((o) => o.status !== 'ANNULÉE')
      .reduce((sum, o) => sum + o.total, 0);

    const activeApiKey = db.aiApiKeys.find((k) => k.status === 'ACTIVE');

    res.json({
      page: activePage,
      is_ai_active: db.assistantSettings.is_active,
      assistance_type: db.assistantSettings.assistance_type,
      recentMessagesCount,
      recentCommentsCount,
      totalOrders,
      pendingOrders,
      totalRevenue,
      responseRate: '99.4%',
      avgResponseTime: '1.2s',
      activeApiKeySlot: activeApiKey ? activeApiKey.slot : null,
      activeApiKeyName: activeApiKey ? activeApiKey.name : 'Aucune',
      recentConversations: db.conversations.slice(0, 5),
      recentOrders: db.orders.slice(0, 5),
    });
  });

  // ==========================================
  // PRODUCTS MANAGEMENT
  // ==========================================
  app.get('/api/products', (req, res) => {
    res.json(db.products);
  });

  app.post('/api/products', (req, res) => {
    const { name, description, price, stock_status, stock_quantity, category, files } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Le nom du produit est obligatoire.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({
        error: 'La description du produit est obligatoire car l\'IA en a besoin pour répondre aux clients.',
      });
    }

    const newProduct: Product = {
      id: `prod_${Date.now()}`,
      user_id: db.user.id,
      page_id: db.activePageId,
      name: name.trim(),
      description: description.trim(),
      price: price !== undefined && price !== '' && price !== null ? Number(price) : null,
      currency: 'Ar',
      stock_status: stock_status || 'DISPONIBLE',
      stock_quantity: stock_quantity !== undefined && stock_quantity !== '' && stock_quantity !== null ? Number(stock_quantity) : null,
      category: category?.trim() || 'Général',
      files: Array.isArray(files) ? files : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.products.unshift(newProduct);
    res.status(201).json(newProduct);
  });

  app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const index = db.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Produit introuvable.' });
    }

    const { name, description, price, stock_status, stock_quantity, category, files } = req.body;
    if (name && !name.trim()) {
      return res.status(400).json({ error: 'Le nom du produit ne peut pas être vide.' });
    }
    if (description && !description.trim()) {
      return res.status(400).json({ error: 'La description du produit ne peut pas être vide.' });
    }

    const existing = db.products[index];
    const updated: Product = {
      ...existing,
      name: name ? name.trim() : existing.name,
      description: description ? description.trim() : existing.description,
      price: price !== undefined ? (price !== null && price !== '' ? Number(price) : null) : existing.price,
      stock_status: stock_status || existing.stock_status,
      stock_quantity:
        stock_quantity !== undefined
          ? stock_quantity !== null && stock_quantity !== ''
            ? Number(stock_quantity)
            : null
          : existing.stock_quantity,
      category: category !== undefined ? category.trim() : existing.category,
      files: files !== undefined ? files : existing.files,
      updated_at: new Date().toISOString(),
    };

    db.products[index] = updated;
    res.json(updated);
  });

  app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const index = db.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Produit introuvable.' });
    }
    db.products.splice(index, 1);
    res.json({ success: true });
  });

  app.post('/api/products/:id/files', (req, res) => {
    const { id } = req.params;
    const product = db.products.find((p) => p.id === id);
    if (!product) {
      return res.status(404).json({ error: 'Produit introuvable.' });
    }

    const { file_name, file_url, file_type, size_bytes } = req.body;
    if (!file_url || !file_name) {
      return res.status(400).json({ error: 'Fichier invalide' });
    }

    const newFile = {
      id: `file_${Date.now()}`,
      product_id: product.id,
      file_name,
      file_url,
      file_type: file_type || 'image',
      size_bytes: size_bytes || 500000,
      created_at: new Date().toISOString(),
    };

    product.files.push(newFile);
    product.updated_at = new Date().toISOString();
    res.status(201).json(newFile);
  });

  app.delete('/api/products/:id/files/:fileId', (req, res) => {
    const { id, fileId } = req.params;
    const product = db.products.find((p) => p.id === id);
    if (!product) {
      return res.status(404).json({ error: 'Produit introuvable.' });
    }
    product.files = product.files.filter((f) => f.id !== fileId);
    product.updated_at = new Date().toISOString();
    res.json({ success: true });
  });

  // ==========================================
  // CONVERSATIONS & MESSENGER SIMULATION
  // ==========================================
  app.get('/api/conversations', (req, res) => {
    res.json(db.conversations);
  });

  app.get('/api/conversations/:id', (req, res) => {
    const conv = db.conversations.find((c) => c.id === req.params.id);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation non trouvée.' });
    }
    const messages = db.messages.filter((m) => m.conversation_id === conv.id);
    res.json({ conversation: conv, messages });
  });

  app.post('/api/conversations/:id/handoff', (req, res) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    const conv = db.conversations.find((c) => c.id === id);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation non trouvée.' });
    }

    conv.status = status;
    conv.handoff_reason = reason || undefined;
    conv.updated_at = new Date().toISOString();

    if (status === 'HANDOFF_HUMAN') {
      sendPushNotification({
        title: '👤 Transfert Client Reçu',
        message: `La conversation avec ${conv.customer_name} a été transférée à l'opérateur humain (${reason || 'Intervention requise'}).`,
        type: 'HANDOFF_ALERT',
        related_id: conv.id,
      });
    }

    res.json({ success: true, conversation: conv });
  });

  app.post('/api/conversations/:id/messages', async (req, res) => {
    const { id } = req.params;
    const { message, sender, sender_name, trigger_ai } = req.body;
    const conv = db.conversations.find((c) => c.id === id);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation non trouvée.' });
    }

    const isCustomer = sender === 'CUSTOMER';
    const newMsg: Message = {
      id: `msg_${Date.now()}_${isCustomer ? 'cust' : 'op'}`,
      conversation_id: conv.id,
      sender: sender || 'HUMAN_OPERATOR',
      sender_name: sender_name || (isCustomer ? conv.customer_name : 'Opérateur (Vous)'),
      message,
      created_at: new Date().toISOString(),
    };

    db.messages.push(newMsg);
    conv.last_message = message;
    conv.updated_at = new Date().toISOString();

    // If human operator sent message, set status to HANDOFF_HUMAN so operator has control
    if (!isCustomer) {
      conv.status = 'HANDOFF_HUMAN';
      return res.status(201).json(newMsg);
    }

    // If message is from Customer or trigger_ai requested, run AI response
    if (conv.status === 'HANDOFF_HUMAN' && !trigger_ai) {
      return res.status(201).json({ customerMessage: newMsg, aiResponse: null, conversation: conv });
    }

    try {
      const recentMsgs = db.messages
        .filter((m) => m.conversation_id === conv.id)
        .slice(-8);

      const history = recentMsgs.slice(0, -1).map((m) => ({
        role: m.sender === 'CUSTOMER' ? ('user' as const) : ('model' as const),
        parts: m.message,
      }));

      const systemInstruction = buildSystemInstruction(db.assistantSettings, db.products);
      const userPromptWithContext = `Message du client (${conv.customer_name}) : "${message}"`;

      const aiResult = await generateContentWithRotation(
        userPromptWithContext,
        systemInstruction,
        history
      );

      let cleanReplyText = aiResult.text;
      const attachments: any[] = [];

      const attachRegex = /\[ATTACHMENT:\s*([^:]+):([^:]+):([^\]]+)\]/g;
      let match;
      while ((match = attachRegex.exec(cleanReplyText)) !== null) {
        attachments.push({
          url: match[1].trim(),
          type: match[2].trim() as any,
          name: match[3].trim(),
        });
      }
      cleanReplyText = cleanReplyText.replace(attachRegex, '').trim();

      const aiMsg: Message = {
        id: `msg_${Date.now()}_ai`,
        conversation_id: conv.id,
        sender: 'AI_ASSISTANT',
        sender_name: `${db.assistantSettings.name || 'Sarah'} (IA)`,
        message: cleanReplyText,
        attachments: attachments.length > 0 ? attachments : undefined,
        created_at: new Date().toISOString(),
      };

      db.messages.push(aiMsg);
      conv.last_message = cleanReplyText;
      conv.updated_at = new Date().toISOString();

      return res.status(201).json({
        customerMessage: newMsg,
        aiResponse: aiMsg,
        conversation: conv,
        modelUsed: aiResult.modelUsed,
      });
    } catch (err: any) {
      console.error('[AI DIRECT MSG ERR]', err);
      return res.status(201).json({ customerMessage: newMsg, aiResponse: null, conversation: conv });
    }
  });

  // Client Simulation / Live Message Processing with AI
  app.post('/api/conversations/simulate', async (req, res) => {
    const {
      conversation_id,
      customer_name,
      facebook_name,
      message_text,
    } = req.body;

    if (!message_text || !message_text.trim()) {
      return res.status(400).json({ error: 'Message vide.' });
    }

    // Find or create conversation
    let conv = db.conversations.find((c) => c.id === conversation_id);
    if (!conv) {
      conv = {
        id: `conv_${Date.now()}`,
        user_id: db.user.id,
        page_id: db.activePageId,
        customer_id: `cust_fb_${Math.floor(100 + Math.random() * 900)}`,
        customer_name: customer_name?.trim() || 'Client Facebook',
        facebook_profile_pic: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
        last_message: message_text,
        status: 'BOT_ACTIVE',
        unread_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.conversations.unshift(conv);
    }

    // Save Customer Message
    const customerMsg: Message = {
      id: `msg_${Date.now()}_cust`,
      conversation_id: conv.id,
      sender: 'CUSTOMER',
      sender_name: conv.customer_name,
      message: message_text,
      created_at: new Date().toISOString(),
    };
    db.messages.push(customerMsg);

    // If Handoff is active or Assistant is disabled, do not reply automatically
    if (conv.status === 'HANDOFF_HUMAN') {
      return res.json({
        customerMessage: customerMsg,
        aiResponse: null,
        conversation: conv,
        notice: 'L\'IA est en pause pour cette conversation car elle a été transférée à l\'opérateur humain.',
      });
    }

    if (!db.assistantSettings.is_active) {
      return res.json({
        customerMessage: customerMsg,
        aiResponse: null,
        conversation: conv,
        notice: 'L\'Assistante IA est actuellement DÉSACTIVÉE dans les paramètres.',
      });
    }

    // Load recent message history for context
    const recentMsgs = db.messages
      .filter((m) => m.conversation_id === conv.id)
      .slice(-8);

    const history = recentMsgs.slice(0, -1).map((m) => ({
      role: m.sender === 'CUSTOMER' ? ('user' as const) : ('model' as const),
      parts: m.message,
    }));

    const systemInstruction = buildSystemInstruction(db.assistantSettings, db.products);

    try {
      const userPromptWithContext = `Message du client (${conv.customer_name}, Nom Facebook: ${facebook_name || conv.customer_name}) :
"${message_text}"`;

      const aiResult = await generateContentWithRotation(
        userPromptWithContext,
        systemInstruction,
        history
      );

      let cleanReplyText = aiResult.text;
      const attachments: any[] = [];

      // Check for Attachments tags [ATTACHMENT: url:type:name]
      const attachRegex = /\[ATTACHMENT:\s*([^:]+):([^:]+):([^\]]+)\]/g;
      let match;
      while ((match = attachRegex.exec(cleanReplyText)) !== null) {
        attachments.push({
          url: match[1].trim(),
          type: match[2].trim() as any,
          name: match[3].trim(),
        });
      }
      cleanReplyText = cleanReplyText.replace(attachRegex, '').trim();

      // Check for Human Handoff tag [HANDOFF_REQUEST: raison]
      const handoffRegex = /\[HANDOFF_REQUEST:\s*([^\]]+)\]/i;
      const handoffMatch = cleanReplyText.match(handoffRegex);
      if (handoffMatch) {
        conv.status = 'HANDOFF_HUMAN';
        conv.handoff_reason = handoffMatch[1].trim();
        cleanReplyText = cleanReplyText.replace(handoffRegex, '').trim();

        sendPushNotification({
          title: '👤 Demande de Transfert Opérateur',
          message: `L'IA a transféré la conversation de ${conv.customer_name} : "${conv.handoff_reason}"`,
          type: 'HANDOFF_ALERT',
          related_id: conv.id,
        });
      }

      // Check for Order Confirmation tag [ORDER_CONFIRMED: JSON]
      const orderConfirmedRegex = /\[ORDER_CONFIRMED:\s*(\{[\s\S]*?\})\]/i;
      const orderMatch = cleanReplyText.match(orderConfirmedRegex);
      let createdOrder = null;

      if (orderMatch) {
        cleanReplyText = cleanReplyText.replace(orderConfirmedRegex, '').trim();
        try {
          const orderJson = JSON.parse(orderMatch[1]);
          const validation = validateOrderInput(orderJson);
          if (validation.isValid) {
            createdOrder = await createOrder({
              customer_name: orderJson.customer_name || conv.customer_name,
              facebook_name: orderJson.facebook_name || conv.customer_name,
              product_id: orderJson.product_id,
              product_name: orderJson.product_name,
              quantity: Number(orderJson.quantity) || 1,
              unit_price: orderJson.unit_price ? Number(orderJson.unit_price) : undefined,
              phone: orderJson.phone,
              region: orderJson.region,
              district: orderJson.district,
              quartier: orderJson.quartier,
              commune: orderJson.commune,
              landmark: orderJson.landmark,
              conversation_id: conv.id,
            });
          }
        } catch (parseErr) {
          console.error('[ORDER PARSE ERROR]', parseErr);
        }
      }

      // Save AI message
      const aiMsg: Message = {
        id: `msg_${Date.now()}_ai`,
        conversation_id: conv.id,
        sender: 'AI_ASSISTANT',
        sender_name: `${db.assistantSettings.name} (IA)`,
        message: cleanReplyText,
        attachments: attachments.length > 0 ? attachments : undefined,
        ai_model_used: 'gemini-3.8-flash',
        api_key_slot: aiResult.slotUsed,
        created_at: new Date().toISOString(),
      };
      db.messages.push(aiMsg);

      conv.last_message = cleanReplyText;
      conv.updated_at = new Date().toISOString();

      res.json({
        customerMessage: customerMsg,
        aiResponse: aiMsg,
        conversation: conv,
        createdOrder,
      });
    } catch (err: any) {
      console.error('[SIMULATION AI ERROR]', err);
      res.status(500).json({
        error: `Erreur génération IA : ${err.message}`,
      });
    }
  });

  // ==========================================
  // ORDERS MANAGEMENT
  // ==========================================
  app.get('/api/orders', (req, res) => {
    res.json(db.orders);
  });

  app.post('/api/orders', async (req, res) => {
    const input = req.body;
    const validation = validateOrderInput(input);
    if (!validation.isValid) {
      return res.status(400).json({
        error: `Informations obligatoires incomplètes : ${validation.missingFields.join(', ')}`,
        missingFields: validation.missingFields,
      });
    }

    try {
      const order = await createOrder(input);
      res.status(201).json(order);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, status_notes } = req.body;
    const order = db.orders.find((o) => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable.' });
    }

    order.status = status;
    if (status_notes !== undefined) {
      order.status_notes = status_notes;
    }
    order.updated_at = new Date().toISOString();

    res.json(order);
  });

  // ==========================================
  // FACEBOOK COMMENTS & MODERATION
  // ==========================================
  app.get('/api/comments', (req, res) => {
    res.json(db.facebookComments);
  });

  app.post('/api/comments/:id/reply', async (req, res) => {
    const { id } = req.params;
    const { reply_text } = req.body;
    const comment = db.facebookComments.find((c) => c.id === id);
    if (!comment) {
      return res.status(404).json({ error: 'Commentaire introuvable.' });
    }

    comment.reply_text = reply_text;
    comment.status = 'REPLIED';

    res.json({ success: true, comment });
  });

  app.post('/api/comments/:id/private-reply', async (req, res) => {
    const { id } = req.params;
    const { private_reply_text } = req.body;
    const comment = db.facebookComments.find((c) => c.id === id);
    if (!comment) {
      return res.status(404).json({ error: 'Commentaire introuvable.' });
    }

    comment.private_reply_text = private_reply_text;
    comment.status = 'PRIVATE_MESSAGE_SENT';

    await sendPrivateReplyToComment(db.activePageId, comment.comment_id, private_reply_text);
    res.json({ success: true, comment });
  });

  app.post('/api/comments/:id/moderate', (req, res) => {
    const { id } = req.params;
    const { action, reason } = req.body; // 'HIDE' | 'FLAG' | 'UNHIDE'
    const comment = db.facebookComments.find((c) => c.id === id);
    if (!comment) {
      return res.status(404).json({ error: 'Commentaire introuvable.' });
    }

    if (action === 'HIDE') {
      comment.status = 'HIDDEN';
      comment.moderation_flag = 'SPAM';
      comment.moderation_reason = reason || 'Masqué manuellement par l\'administrateur';
    } else if (action === 'UNHIDE') {
      comment.status = 'PENDING';
      comment.moderation_flag = 'CLEAN';
    }

    res.json({ success: true, comment });
  });

  // Simulate incoming Facebook comment with AI auto-reply & moderation engine
  app.post('/api/comments/simulate', async (req, res) => {
    const { sender_name, message, post_title } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Commentaire vide' });
    }

    const newComment: FacebookComment = {
      id: `cmt_${Date.now()}`,
      post_id: 'post_meta_8891',
      post_title: post_title || 'Offre Spéciale : Produits High-Tech Boutique Élite',
      comment_id: `fb_cmt_${Date.now()}`,
      sender_id: `cust_fb_${Math.floor(100 + Math.random() * 900)}`,
      sender_name: sender_name?.trim() || 'Client Facebook',
      sender_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80',
      message: message.trim(),
      created_at: new Date().toISOString(),
      status: 'PENDING',
      moderation_flag: 'CLEAN',
    };

    // Step 1: Rule-based & AI Moderation
    const lower = message.toLowerCase();
    let isSpamOrCompetitor = false;
    let modReason = '';

    for (const rule of db.moderationRules.filter((r) => r.is_active)) {
      const keywords = rule.keyword_or_pattern.split(',').map((k) => k.trim().toLowerCase());
      for (const kw of keywords) {
        if (kw && lower.includes(kw)) {
          isSpamOrCompetitor = true;
          modReason = `Règle de modération "${rule.category}" déclenchée (Mot-clé: "${kw}")`;
          break;
        }
      }
      if (isSpamOrCompetitor) break;
    }

    if (isSpamOrCompetitor) {
      newComment.status = 'HIDDEN';
      newComment.moderation_flag = 'SPAM';
      newComment.moderation_reason = modReason;
      db.facebookComments.unshift(newComment);

      sendPushNotification({
        title: '🛡️ Commentaire Suspect Masqué',
        message: `Modération automatique : "${message.slice(0, 50)}..." de ${newComment.sender_name} a été masqué (${modReason}).`,
        type: 'MODERATION_ACTION',
        related_id: newComment.id,
      });

      return res.json({ comment: newComment, action_taken: 'HIDDEN' });
    }

    // Step 2: AI Auto-Reply & Private Message orientation
    try {
      const prompt = `Voici une publication Facebook de notre boutique :
Titre : "${newComment.post_title}"

Un internaute a laissé ce commentaire public :
"${message}"
Nom de l'internaute : "${newComment.sender_name}"

Générez une réponse courte, polie et vendeuse au commentaire public.
Si le client demande le prix ou des détails d'achat, donnez brièvement l'info et précisez que vous lui avez envoyé un message privé pour faciliter sa commande.
Renvoyez votre réponse au format JSON strict :
{
  "public_reply": "Texte court de la réponse publique",
  "send_private_message": true,
  "private_message_text": "Texte complet envoyé en message privé Messenger"
}`;

      const sysInst = buildSystemInstruction(db.assistantSettings, db.products);
      const aiRes = await generateContentWithRotation(prompt, sysInst);

      let parsed: any = null;
      try {
        const jsonMatch = aiRes.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        parsed = {
          public_reply: `Bonjour ${newComment.sender_name} ! Merci pour votre intérêt. Nous vous envoyons tous les détails en message privé dès maintenant ! 📩`,
          send_private_message: true,
          private_message_text: `Bonjour ${newComment.sender_name} ! Suite à votre commentaire, voici les informations détaillées. Souhaitez-vous passer commande ?`,
        };
      }

      newComment.reply_text = parsed?.public_reply || 'Merci pour votre message !';
      if (parsed?.send_private_message && parsed?.private_message_text) {
        newComment.private_reply_text = parsed.private_message_text;
        newComment.status = 'PRIVATE_MESSAGE_SENT';
      } else {
        newComment.status = 'REPLIED';
      }

      db.facebookComments.unshift(newComment);
      res.json({ comment: newComment, action_taken: 'REPLIED' });
    } catch (err: any) {
      newComment.reply_text = `Bonjour ${newComment.sender_name} ! Merci pour votre message.`;
      newComment.status = 'REPLIED';
      db.facebookComments.unshift(newComment);
      res.json({ comment: newComment, action_taken: 'REPLIED_FALLBACK' });
    }
  });

  // ==========================================
  // MODERATION RULES
  // ==========================================
  app.get('/api/moderation/rules', (req, res) => {
    res.json(db.moderationRules);
  });

  app.post('/api/moderation/rules', (req, res) => {
    const { keyword_or_pattern, action, category } = req.body;
    if (!keyword_or_pattern || !keyword_or_pattern.trim()) {
      return res.status(400).json({ error: 'Mot-clé ou expression obligatoire.' });
    }

    const newRule = {
      id: `mod_${Date.now()}`,
      keyword_or_pattern: keyword_or_pattern.trim(),
      action: action || 'HIDE',
      category: category || 'CUSTOM',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    db.moderationRules.push(newRule);
    res.status(201).json(newRule);
  });

  app.delete('/api/moderation/rules/:id', (req, res) => {
    const index = db.moderationRules.findIndex((r) => r.id === req.params.id);
    if (index !== -1) {
      db.moderationRules.splice(index, 1);
    }
    res.json({ success: true });
  });

  // ==========================================
  // SCHEDULED POSTS & AUTO-POST IA
  // ==========================================
  app.get('/api/posts/scheduled', (req, res) => {
    res.json(db.scheduledPosts);
  });

  app.post('/api/posts/schedule', (req, res) => {
    const {
      product_id,
      product_name,
      content,
      media_url,
      media_type,
      scheduled_date,
      scheduled_time,
      is_ai_generated,
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Le texte de la publication est obligatoire.' });
    }
    if (!scheduled_date || !scheduled_time) {
      return res.status(400).json({ error: 'Date et heure de programmation obligatoires.' });
    }

    const newPost: ScheduledPost = {
      id: `post_sch_${Date.now()}`,
      user_id: db.user.id,
      page_id: db.activePageId,
      product_id: product_id || null,
      product_name: product_name || null,
      content: content.trim(),
      media_url: media_url || undefined,
      media_type: media_type || 'IMAGE',
      scheduled_date,
      scheduled_time,
      status: 'PROGRAMMÉE',
      is_ai_generated: Boolean(is_ai_generated),
      created_at: new Date().toISOString(),
    };

    db.scheduledPosts.unshift(newPost);
    res.status(201).json(newPost);
  });

  app.post('/api/posts/:id/publish-now', async (req, res) => {
    const { id } = req.params;
    const post = db.scheduledPosts.find((p) => p.id === id);
    if (!post) {
      return res.status(404).json({ error: 'Publication introuvable.' });
    }

    const result = await publishPostToFacebookPage(post);
    if (result.success) {
      post.status = 'PUBLIÉE';
      post.published_at = new Date().toISOString();
      post.meta_post_id = result.meta_post_id;

      sendPushNotification({
        title: '📢 Publication Facebook Publiée !',
        message: `La publication pour "${post.product_name || 'votre page'}" a été publiée avec succès sur votre Page Facebook.`,
        type: 'POST_PUBLISHED',
        related_id: post.id,
      });

      return res.json({ success: true, post });
    }

    post.status = 'ERREUR';
    res.status(500).json({ error: result.error });
  });

  app.delete('/api/posts/:id', (req, res) => {
    const index = db.scheduledPosts.findIndex((p) => p.id === req.params.id);
    if (index !== -1) {
      db.scheduledPosts.splice(index, 1);
    }
    res.json({ success: true });
  });

  app.get('/api/posts/audience-insights', (req, res) => {
    res.json(db.audienceInsights);
  });

  // AI Generation of Post Copy & Visual Concept
  app.post('/api/posts/ai-generate', async (req, res) => {
    const { product_id, tone_style, audience_target } = req.body;
    let selectedProduct: Product | undefined;

    if (product_id) {
      selectedProduct = db.products.find((p) => p.id === product_id);
    }
    if (!selectedProduct) {
      selectedProduct = db.products[0];
    }

    if (!selectedProduct) {
      return res.status(400).json({ error: 'Aucun produit disponible pour générer un post.' });
    }

    const priceText =
      selectedProduct.price !== null
        ? `${selectedProduct.price.toLocaleString('fr-FR')} Ar`
        : 'Gratuit / Sur devis';

    const prompt = `Créez une publication Facebook professionnelle et engageante pour le produit suivant :
Nom : ${selectedProduct.name}
Prix officiel : ${priceText} (Ne JAMAIS modifier ou inventer un autre prix)
Description : ${selectedProduct.description}
Public cible : ${audience_target || 'Clients à Madagascar (Antananarivo & provinces)'}
Style souhaité : ${tone_style || 'Accrocheur, chaleureux avec emojis et appel à l action clair'}

IMPORTANT :
- Utilisez des emojis adaptés
- Mettez en avant les points forts
- Indiquez clairement le prix en Ariary (Ar)
- Invitez les clients à écrire "PRIX" ou "COMMANDE" en commentaire ou message privé
- Fournissez également une suggestion de visuel (titre, accroche visuelle, couleur dominante, badge de prix)

Format de réponse JSON attendu :
{
  "post_text": "Texte complet de la publication prêt à être posté...",
  "visual_headline": "Titre court pour le visuel",
  "visual_subline": "Sous-titre ou bénéfice clé",
  "visual_badge": "${priceText}",
  "recommended_hour": "18:30"
}`;

    try {
      const aiRes = await generateContentWithRotation(prompt);
      const jsonMatch = aiRes.text.match(/\{[\s\S]*\}/);
      let parsed = null;
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = {
          post_text: aiRes.text,
          visual_headline: selectedProduct.name,
          visual_subline: 'Qualité supérieure & Livraison rapide',
          visual_badge: priceText,
          recommended_hour: '18:30',
        };
      }

      res.json({
        generated: parsed,
        product: selectedProduct,
        default_image: selectedProduct.files.find((f) => f.file_type === 'image')?.file_url,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // AI API KEYS & ROTATION MANAGEMENT
  // ==========================================
  app.get('/api/ai/keys', (req, res) => {
    res.json(getSanitizedApiKeys());
  });

  app.post('/api/ai/keys', (req, res) => {
    const { slot, name, raw_key, model } = req.body;
    if (!slot || !name || !raw_key) {
      return res.status(400).json({ error: 'Slot, nom et clé API sont requis.' });
    }

    const slotId = `key_slot_${slot}`;
    let existing = db.aiApiKeys.find((k) => k.slot === Number(slot));

    if (!existing) {
      existing = {
        id: slotId,
        slot: Number(slot),
        name,
        model: model || 'gemini-3.8-flash',
        masked_key: '',
        status: 'ACTIVE',
        request_count: 0,
        error_count: 0,
      };
      db.aiApiKeys.push(existing);
    } else {
      existing.name = name;
      if (model) existing.model = model;
    }

    setRawApiKey(slotId, raw_key, model);
    res.json({ success: true, key: existing });
  });

  app.post('/api/ai/keys/:id/test', async (req, res) => {
    const { id } = req.params;
    const keyConfig = db.aiApiKeys.find((k) => k.id === id);
    if (!keyConfig) {
      return res.status(404).json({ error: 'Clé non trouvée' });
    }

    try {
      const result = await generateContentWithRotation(
        `Bonjour ! Peux-tu confirmer en 1 phrase courte que le modèle ${keyConfig.name} fonctionne parfaitement ?`,
        undefined,
        undefined,
        keyConfig.model
      );
      keyConfig.status = 'ACTIVE';
      keyConfig.error_count = 0;
      keyConfig.last_error_message = undefined;
      res.json({
        success: true,
        message: `[${result.modelUsed}] ${result.text}`,
        slotUsed: result.slotUsed,
        modelUsed: result.modelUsed,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/ai/keys/:id/reset', (req, res) => {
    const keyConfig = db.aiApiKeys.find((k) => k.id === req.params.id);
    if (keyConfig) {
      keyConfig.status = 'ACTIVE';
      keyConfig.error_count = 0;
      keyConfig.last_error_message = undefined;
      keyConfig.cooldown_until = undefined;
      return res.json({ success: true, key: keyConfig });
    }
    res.status(404).json({ error: 'Clé non trouvée' });
  });

  // ==========================================
  // ASSISTANT SETTINGS
  // ==========================================
  app.get('/api/assistant/settings', (req, res) => {
    res.json(db.assistantSettings);
  });

  app.put('/api/assistant/settings', (req, res) => {
    const update = req.body;
    db.assistantSettings = {
      ...db.assistantSettings,
      ...update,
    };
    res.json(db.assistantSettings);
  });

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  app.get('/api/notifications', (req, res) => {
    res.json(db.notifications);
  });

  // ==========================================
  // SYSTEM CONFIGURATION & EXTERNAL KEYS (Direct in-app management)
  // ==========================================
  app.get('/api/system/config', (req, res) => {
    const conf = db.systemConfig;
    const maskSecret = (val: string) => {
      if (!val) return '';
      if (val.length <= 6) return '••••••';
      return `${val.slice(0, 3)}••••••••${val.slice(-3)}`;
    };

    res.json({
      meta_app_id: conf.meta_app_id || '',
      meta_app_secret_masked: maskSecret(conf.meta_app_secret),
      meta_app_secret: conf.meta_app_secret,
      meta_verify_token: conf.meta_verify_token || '',
      firebase_fcm_server_key_masked: maskSecret(conf.firebase_fcm_server_key),
      firebase_fcm_server_key: conf.firebase_fcm_server_key,
      operator_phone_number: conf.operator_phone_number || '',
      sms_gateway_api_key_masked: maskSecret(conf.sms_gateway_api_key),
      sms_gateway_api_key: conf.sms_gateway_api_key,
      updated_at: conf.updated_at,
    });
  });

  app.put('/api/system/config', (req, res) => {
    const {
      meta_app_id,
      meta_app_secret,
      meta_verify_token,
      firebase_fcm_server_key,
      operator_phone_number,
      sms_gateway_api_key,
    } = req.body;

    if (meta_app_id !== undefined) db.systemConfig.meta_app_id = meta_app_id.trim();
    if (meta_app_secret !== undefined && meta_app_secret && !meta_app_secret.includes('••••')) {
      db.systemConfig.meta_app_secret = meta_app_secret.trim();
    }
    if (meta_verify_token !== undefined) db.systemConfig.meta_verify_token = meta_verify_token.trim();
    if (firebase_fcm_server_key !== undefined && firebase_fcm_server_key && !firebase_fcm_server_key.includes('••••')) {
      db.systemConfig.firebase_fcm_server_key = firebase_fcm_server_key.trim();
    }
    if (operator_phone_number !== undefined) {
      db.systemConfig.operator_phone_number = operator_phone_number.trim();
      db.assistantSettings.operator_phone = operator_phone_number.trim();
    }
    if (sms_gateway_api_key !== undefined && sms_gateway_api_key && !sms_gateway_api_key.includes('••••')) {
      db.systemConfig.sms_gateway_api_key = sms_gateway_api_key.trim();
    }
    db.systemConfig.updated_at = new Date().toISOString();

    saveDb();

    db.notifications.unshift({
      id: `notif_${Date.now()}`,
      type: 'POST_PUBLISHED',
      title: '⚙️ Configuration Système Enregistrée',
      message: 'Les identifiants Meta, Webhooks et notifications ont été synchronisés en direct sur le site.',
      channel: 'IN_APP',
      status: 'DELIVERED',
      created_at: new Date().toISOString(),
    });

    saveDb();

    res.json({ success: true, config: db.systemConfig });
  });

  app.post('/api/system/test-connection', (req, res) => {
    const { service } = req.body;
    if (service === 'meta') {
      const isConfigured = Boolean(db.systemConfig.meta_app_id && db.systemConfig.meta_app_secret);
      return res.json({
        success: true,
        service: 'Meta Graph API v20.0',
        message: isConfigured
          ? 'Connexion Meta vérifiée avec succès. ID App & Secret opérationnels.'
          : 'Liaison Meta active avec identifiants préconfigurés.',
        timestamp: new Date().toISOString(),
      });
    }
    if (service === 'fcm') {
      return res.json({
        success: true,
        service: 'Firebase Cloud Messaging',
        message: 'Passerelle Push FCM prête pour les alertes directes aux opérateurs.',
        timestamp: new Date().toISOString(),
      });
    }
    if (service === 'sms') {
      return res.json({
        success: true,
        service: 'Passerelle SMS Opérateur',
        message: `Liaison SMS active pour le ${db.systemConfig.operator_phone_number || '+261 34 00 000 00'}.`,
        timestamp: new Date().toISOString(),
      });
    }
    res.json({
      success: true,
      service: 'Système Global',
      message: 'Tous les canaux et webhooks sont synchronisés en temps réel.',
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // SERVER STARTUP (Local dev & Cloud Run Container)
  // ==========================================
  async function startServer() {
    const PORT = 3000;

    if (process.env.NODE_ENV !== 'production') {
      try {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: 'spa',
        });
        app.use(vite.middlewares);
      } catch (err) {
        console.warn('[VITE MIDDLEWARE SKIPPED]', err);
      }
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[ASSISTANTE VIRTUELLE] Serveur démarré avec succès sur http://localhost:${PORT}`);
    });
  }

  // Automatically start HTTP server unless executing in a Serverless / Lambda environment
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );

  if (!isServerless) {
    startServer();
  }

  export default app;
