import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { AIApiKeyConfig, Product, AssistantSettings } from '../src/types.js';

// Server-side secure in-memory storage of raw keys (NEVER sent to frontend)
const rawKeyStore: Record<string, string> = {};

// Initialize default raw keys for all 5 slots from environment if available
if (process.env.GEMINI_API_KEY) {
  rawKeyStore['key_slot_1'] = process.env.GEMINI_API_KEY;
  rawKeyStore['key_slot_2'] = process.env.GEMINI_API_KEY;
  rawKeyStore['key_slot_3'] = process.env.GEMINI_API_KEY;
  rawKeyStore['key_slot_4'] = process.env.GEMINI_API_KEY;
  rawKeyStore['key_slot_5'] = process.env.GEMINI_API_KEY;
}

export function setRawApiKey(slotId: string, rawKey: string, modelName?: string) {
  rawKeyStore[slotId] = rawKey.trim();
  const existingConfig = db.aiApiKeys.find((k) => k.id === slotId);
  if (existingConfig) {
    existingConfig.masked_key = maskKey(rawKey);
    if (modelName) existingConfig.model = modelName;
    existingConfig.status = 'ACTIVE';
    existingConfig.error_count = 0;
    existingConfig.last_error_message = undefined;
    existingConfig.cooldown_until = undefined;
  }
}

export function maskKey(key: string): string {
  if (!key || key.length < 8) return '****';
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

export function getSanitizedApiKeys(): AIApiKeyConfig[] {
  // Check if cooldown has expired for QUOTA_LIMIT keys
  const now = Date.now();
  db.aiApiKeys.forEach((key) => {
    if (key.status === 'QUOTA_LIMIT' && key.cooldown_until) {
      if (new Date(key.cooldown_until).getTime() <= now) {
        key.status = 'ACTIVE';
        key.cooldown_until = undefined;
      }
    }
  });
  return db.aiApiKeys;
}

// Build the robust System Prompt for the AI Assistant
export function buildSystemInstruction(
  settings: AssistantSettings,
  products: Product[]
): string {
  const productsKnowledge = products
    .map((p) => {
      const priceStr = p.price !== null ? `${p.price.toLocaleString('fr-FR')} Ar` : 'Gratuit / Sur devis';
      const stockStr =
        p.stock_status === 'DISPONIBLE'
          ? `Disponible (${p.stock_quantity !== null && p.stock_quantity !== undefined ? p.stock_quantity + ' unités' : 'En stock'})`
          : p.stock_status === 'RUPTURE_STOCK'
          ? 'Rupture de stock'
          : `Quantité limitée (${p.stock_quantity || 0} restants)`;

      const filesList = p.files
        .map((f) => `- [${f.file_type.toUpperCase()}] ${f.file_name} (Lien direct : ${f.file_url})`)
        .join('\n');

      return `---
PRODUIT: ${p.name} (ID: ${p.id})
PRIX: ${priceStr}
ÉTAT DU STOCK: ${stockStr}
CATÉGORIE: ${p.category || 'Général'}
DESCRIPTION OBLIGATOIRE:
${p.description}
FICHIERS DISPONIBLES (Images, Vidéos, PDF):
${filesList || 'Aucun fichier attaché'}
---`;
    })
    .join('\n\n');

  const modeRules =
    settings.assistance_type === 'VENTE'
      ? `=== MODE D'ASSISTANCE : VENTE ===
1. Vous êtes habilitée et encouragée à guider le client vers l'achat et à PRENDRE LES COMMANDES.
2. Lorsqu'un client souhaite acheter ou commander un produit :
   - Vous DEVEZ collecter l'ensemble des 7 informations obligatoires :
     1. Nom complet réel du client
     2. Nom Facebook du client (utilisez celui fourni si disponible)
     3. Nom du produit commandé
     4. Quantité commandée
     5. Contact téléphonique joignable (ex: 034, 032, 033, 038)
     6. Total à payer en Ariary (Calcul : Prix unitaire × Quantité)
     7. Adresse de livraison très précise à Madagascar (Région, District, Quartier, Commune si applicable, et Repère précis comme 'près de la pharmacie X', 'en face de la station Y').
   - Une commande n'est JAMAIS considérée complète tant que ces informations ne sont pas réunies.
   - Demandez les éléments manquants avec courtoisie.
   - Avant de valider, faites TOUJOURS un récapitulatif clair et demandez la confirmation du client.
   - Dès que le client confirme explicitement son accord final sur le récapitulatif complet, incluez à la fin de votre message la balise structurée :
     [ORDER_CONFIRMED: {"customer_name": "...", "facebook_name": "...", "product_id": "...", "product_name": "...", "quantity": 1, "unit_price": 185000, "total": 185000, "phone": "...", "region": "...", "district": "...", "quartier": "...", "landmark": "..."}]`
      : `=== MODE D'ASSISTANCE : TRAVAIL ===
1. Vous expliquez les produits/services, répondez aux questions et présentez les informations disponibles dans la base de produits.
2. RÈGLE STRICTE ET ABSOLUE : Vous ne devez JAMAIS prendre de commande ni enregistrer de commande en mode TRAVAIL. Si un client demande à acheter ou commander, expliquez poliment que les commandes sont temporairement traitées par l'équipe ou via un canal dédié.`;

  return `Vous êtes ${settings.name}, l'assistante virtuelle officielle et professionnelle de la Page Facebook de la boutique.
Votre rôle est de gérer la relation client, d'accueillir les visiteurs, de répondre à leurs questions avec excellence, et d'agir comme une véritable conseillère commerciale dévouée.

TON ET COMMUNICATION :
- Ton de communication : ${settings.tone}
- Langue principale : ${settings.primary_language}
- Adaptez votre langage avec politesse et respect. Si le client s'exprime en Malagasy, vous pouvez lui répondre courtoisement en Malagasy si pertinent, tout en restant clair.
- Donnez des réponses courtes, directes ou détaillées selon le besoin du client.
- Évitez les réponses robotiques ou répétitives.

RÈGLES D'OR STRICTES DE L'ASSISTANTE (NON NÉGOCIABLES) :
1. NE JAMAIS INVENTER un produit qui n'existe pas dans la liste ci-dessous.
2. NE JAMAIS INVENTER un prix. Utilisez exclusivement les prix en Ariary (Ar) indiqués.
3. NE JAMAIS INVENTER un stock ou une disponibilité.
4. NE JAMAIS INVENTER une promotion ou remise non spécifiée.
5. NE JAMAIS INVENTER d'informations techniques absentes de la description produit.
6. Si le client demande une photo, un visuel, une vidéo ou un document PDF du produit, et que ce fichier existe dans la fiche produit, fournissez le lien et mentionnez-le clairement. Vous pouvez ajouter la balise [ATTACHMENT: url:type:nom] pour que le système l'envoie nativement sur Facebook Messenger.
7. Si une question dépasse vos connaissances ou si le client est mécontent / pose une question complexe ou souhaite un partenariat, proposez un transfert à l'opérateur humain en incluant la balise : [HANDOFF_REQUEST: Raison du transfert].

${modeRules}

INSTRUCTIONS SUPPLÉMENTAIRES DE L'ADMINISTRATEUR :
${settings.custom_instructions || 'Aucune consigne supplémentaire.'}

BASE DE DONNÉES DES PRODUITS OFFICIELS :
${productsKnowledge}
`;
}

// Intelligent Multi-Key Rotation Invocation supporting the 5 distinct Gemini Models
export async function generateContentWithRotation(
  prompt: string,
  systemInstruction?: string,
  history?: { role: 'user' | 'model'; parts: string }[],
  preferredModel?: string
): Promise<{ text: string; slotUsed: number; keyName: string; modelUsed: string }> {
  let activeKeys = db.aiApiKeys.filter(
    (k) => k.status === 'ACTIVE' || (k.status === 'QUOTA_LIMIT' && (!k.cooldown_until || new Date(k.cooldown_until).getTime() <= Date.now()))
  );

  // If a preferred model is requested, prioritize keys configured for that model
  if (preferredModel && activeKeys.length > 0) {
    activeKeys = [...activeKeys].sort((a, b) => {
      if (a.model === preferredModel && b.model !== preferredModel) return -1;
      if (b.model === preferredModel && a.model !== preferredModel) return 1;
      return a.slot - b.slot;
    });
  }

  // Fallback if no specific keys configured: try process.env.GEMINI_API_KEY directly
  if (activeKeys.length === 0) {
    if (process.env.GEMINI_API_KEY) {
      const defaultModel = preferredModel || db.assistantSettings.default_model || 'gemini-3.8-flash';
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const res = await ai.models.generateContent({
        model: defaultModel,
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });
      return { text: res.text || '', slotUsed: 1, keyName: 'Gemini Système Intégré', modelUsed: defaultModel };
    }
    throw new Error('Aucune clé API IA active disponible dans le pool de rotation.');
  }

  let lastError: any = null;

  for (const keyConfig of activeKeys) {
    const startTime = Date.now();
    const rawKey = rawKeyStore[keyConfig.id] || process.env.GEMINI_API_KEY;

    if (!rawKey) {
      keyConfig.status = 'ERROR';
      keyConfig.last_error_message = 'Clé API non trouvée dans le trousseau sécurisé.';
      continue;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: rawKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Prepare contents with history if provided
      let contents: any = prompt;
      if (history && history.length > 0) {
        const contentsList: any[] = [];
        for (const item of history) {
          contentsList.push({
            role: item.role,
            parts: [{ text: item.parts }],
          });
        }
        contentsList.push({
          role: 'user',
          parts: [{ text: prompt }],
        });
        contents = contentsList;
      }

      // Determine model to use for this slot
      let modelToUse = preferredModel || keyConfig.model || db.assistantSettings.default_model || 'gemini-3.8-flash';
      // For purely textual chat/prompts, if model is purely transcribe, fallback to gemini-3.8-flash
      if (modelToUse === 'gemini-3.5-transcribe') {
        modelToUse = 'gemini-3.8-flash';
      }

      const response = await ai.models.generateContent({
        model: modelToUse,
        contents,
        config: systemInstruction
          ? {
              systemInstruction,
              temperature: 0.7,
            }
          : undefined,
      });

      const responseText = response.text || '';
      const duration = Date.now() - startTime;

      // Update metrics
      keyConfig.request_count += 1;
      keyConfig.last_used_at = new Date().toISOString();
      keyConfig.latency_ms = duration;
      keyConfig.status = 'ACTIVE';

      return {
        text: responseText,
        slotUsed: keyConfig.slot,
        keyName: keyConfig.name,
        modelUsed: modelToUse,
      };
    } catch (err: any) {
      lastError = err;
      const errorMsg = err?.message || String(err);
      console.warn(`[AI ROTATION] Error on slot ${keyConfig.slot} (${keyConfig.name}):`, errorMsg);

      keyConfig.error_count += 1;
      keyConfig.last_error_at = new Date().toISOString();
      keyConfig.last_error_message = errorMsg;

      // Check if it's a quota / rate limit / 429 error
      const isQuota =
        errorMsg.includes('429') ||
        errorMsg.toLowerCase().includes('quota') ||
        errorMsg.toLowerCase().includes('rate limit') ||
        errorMsg.toLowerCase().includes('resource_exhausted');

      if (isQuota) {
        keyConfig.status = 'QUOTA_LIMIT';
        // 15 min cooldown
        keyConfig.cooldown_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        // Record notification
        db.notifications.unshift({
          id: `notif_${Date.now()}`,
          type: 'API_QUOTA_ALERT',
          title: `⚠️ Quota Limite Détecté (Slot ${keyConfig.slot})`,
          message: `L'API "${keyConfig.name}" a rencontré une limite de quota. Basculement automatique vers la clé suivante.`,
          channel: 'IN_APP',
          status: 'DELIVERED',
          related_id: keyConfig.id,
          created_at: new Date().toISOString(),
        });
      } else {
        keyConfig.status = 'ERROR';
      }

      // Continue to next active key in loop
    }
  }

  throw new Error(`Échec de toutes les clés API IA du pool de rotation : ${lastError?.message || 'Erreur inconnue'}`);
}
