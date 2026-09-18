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

      // Determine model to use for this slot with safe normalization
      let modelToUse = preferredModel || keyConfig.model || db.assistantSettings.default_model || 'gemini-3.8-flash';
      // Normalize deprecated / invalid model names to approved standard models
      if (
        modelToUse.includes('3.7') ||
        modelToUse.includes('1.5') ||
        modelToUse.includes('2.0') ||
        modelToUse === 'gemini-3.5-transcribe'
      ) {
        modelToUse = 'gemini-3.8-flash';
      }

      const candidateModels = [modelToUse, 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
      let responseText = '';
      let successfulModel = modelToUse;
      let modelErr: any = null;

      for (const candModel of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: candModel,
            contents,
            config: systemInstruction
              ? {
                  systemInstruction,
                  temperature: 0.7,
                }
              : undefined,
          });
          responseText = response.text || '';
          successfulModel = candModel;
          modelErr = null;
          break;
        } catch (candErr: any) {
          modelErr = candErr;
          const errMsg = candErr?.message || String(candErr);
          console.warn(`[AI ROTATION] Model ${candModel} failed on slot ${keyConfig.slot}: ${errMsg}`);
          // If error is permission or quota, try next candidate model
        }
      }

      if (modelErr && !responseText) {
        throw modelErr;
      }

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
        modelUsed: successfulModel,
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

  // Graceful Fallback: instead of completely crashing customer replies, generate a smart contextual response
  console.warn('[AI ROTATION FAILOVER] All API keys exhausted or rate-limited. Serving smart local fallback.');
  const fallbackText = generateSmartLocalFallback(prompt);
  return {
    text: fallbackText,
    slotUsed: 0,
    keyName: 'Fallback Local Intelligent',
    modelUsed: 'smart-fallback',
  };
}

function generateSmartLocalFallback(prompt: string): string {
  const pLower = prompt.toLowerCase();
  const isMalagasy = db.assistantSettings.primary_language !== 'Français' || pLower.includes('manao ahoana') || pLower.includes('salama') || pLower.includes('tompoko') || pLower.includes('ohatrinona') || pLower.includes('inona') || pLower.includes('hividy') || pLower.includes('misaotra');
  const assistantName = db.assistantSettings.name || 'Sarah';

  // 1. Human Operator Request
  if (
    pLower.includes('olombelona') ||
    pLower.includes('responsable') ||
    pLower.includes('humain') ||
    pLower.includes('opérateur') ||
    pLower.includes('operateur') ||
    pLower.includes('urgence') ||
    pLower.includes('parler à quelqu\'un')
  ) {
    return isMalagasy
      ? `Miarahaba tompoko ! Efa nafindra tany amin'ny tompon'andraikitra olombelona ny hafatrao. Hifandray aminao tsy ho ela ny ekipanay amin'ny laharana ${db.assistantSettings.operator_phone || 'finday'}. Misaotra amin'ny faharetanao !`
      : `Bonjour ! Votre demande a bien été transmise à notre conseiller humain. Un responsable va prendre le relais très rapidement. Merci de votre patience !`;
  }

  // 2. Find matching products
  const matchedProducts = db.products.filter((prod) => {
    const nameMatch = prod.name.toLowerCase().split(/\s+/).some((w) => w.length > 2 && pLower.includes(w));
    const descMatch = prod.description?.toLowerCase().split(/\s+/).some((w) => w.length > 3 && pLower.includes(w));
    const catMatch = prod.category?.toLowerCase().split(/\s+/).some((w) => w.length > 3 && pLower.includes(w));
    return nameMatch || descMatch || catMatch;
  });

  const targetProd = matchedProducts.length > 0 ? matchedProducts[0] : null;

  // 3. Price or Product Details Inquiry
  if (
    pLower.includes('ohatrinona') ||
    pLower.includes('prix') ||
    pLower.includes('combien') ||
    pLower.includes('vidiny') ||
    pLower.includes('tarifs') ||
    pLower.includes('cost') ||
    pLower.includes('misy ve') ||
    pLower.includes('dispo')
  ) {
    if (targetProd) {
      const priceStr = targetProd.price !== null ? `${targetProd.price.toLocaleString('fr-FR')} Ar` : 'Sur devis';
      const stock = targetProd.stock_status === 'DISPONIBLE' ? 'Misy tahiry (En stock)' : 'Lany tahiry (Rupture)';
      if (isMalagasy) {
        return `Miarahaba tompoko ! Ny vidin'ny "${targetProd.name}" dia ${priceStr}.\n\n` +
          `📦 Toetoetran'ny tahiry : ${stock}\n` +
          `📝 Mombamomba azy : ${targetProd.description.slice(0, 180)}...\n\n` +
          `Tianao ve ny hanao commande ? Azafady valio eto ny :\n` +
          `1. Anaranao feno sy laharana finday\n` +
          `2. Isan'ny entana ilainao\n` +
          `3. Adiresy mazava hanaterana azy (Faritra, Fokontany, Repère)`;
      } else {
        return `Bonjour ! Le prix pour "${targetProd.name}" est de ${priceStr}.\n\n` +
          `📦 Disponibilité : ${stock}\n` +
          `📝 Description : ${targetProd.description.slice(0, 180)}...\n\n` +
          `Souhaitez-vous passer commande dès maintenant ? Merci de nous communiquer :\n` +
          `- Votre Nom complet et Téléphone\n` +
          `- La quantité souhaitée\n` +
          `- Votre adresse de livraison précise (Ville, Quartier, Repère)`;
      }
    } else {
      const catalogText = db.products
        .slice(0, 5)
        .map((p) => `• ${p.name} : ${p.price !== null ? p.price.toLocaleString('fr-FR') + ' Ar' : 'Sur devis'}`)
        .join('\n');
      return isMalagasy
        ? `Miarahaba tompoko ! Ireto avy ireo entana sy vidiny misy ato aminay :\n\n${catalogText}\n\nInona amin'ireo no mahaliana anao indrindra tompoko ?`
        : `Bonjour ! Voici la liste de nos articles phares disponibles :\n\n${catalogText}\n\nLequel de ces articles vous intéresse ?`;
    }
  }

  // 4. Order intent
  if (
    pLower.includes('commande') ||
    pLower.includes('hividy') ||
    pLower.includes('commander') ||
    pLower.includes('mividy') ||
    pLower.includes('acheter') ||
    pLower.includes('passer commande')
  ) {
    const prodToOrder = targetProd || db.products[0];
    const prodName = prodToOrder ? prodToOrder.name : 'Produit';
    const prodPrice = prodToOrder?.price || 0;

    // Check if user already provided phone number (e.g. 034, 032, 033, 038)
    const phoneMatch = prompt.match(/(?:03[23489]|034|032|033|038)\s?[0-9]{2}\s?[0-9]{3}\s?[0-9]{2}/);
    if (phoneMatch && prompt.length > 40) {
      // Order structured confirmation
      const orderPayload = {
        customer_name: 'Client Messenger',
        facebook_name: 'Client Facebook',
        product_id: prodToOrder?.id || 'prod_01',
        product_name: prodName,
        quantity: 1,
        unit_price: prodPrice,
        total: prodPrice,
        phone: phoneMatch[0].replace(/\s/g, ''),
        region: 'Analamanga',
        district: 'Antananarivo',
        quartier: 'Centre-ville',
        landmark: 'Indications données en message',
      };

      return isMalagasy
        ? `Tena misaotra tompoko ! Voaray soa aman-tsara ny kaomandinao ho an'ny "${prodName}" mitentina ${prodPrice.toLocaleString('fr-FR')} Ar.\n\n` +
          `📞 Laharana finday : ${phoneMatch[0]}\n` +
          `🛵 Efa manomana ny fanaterana ny ekipanay ary hiantso anao mialoha.\n\n` +
          `[ORDER_CONFIRMED: ${JSON.stringify(orderPayload)}]`
        : `Merci infiniment ! Votre commande pour "${prodName}" d'un montant de ${prodPrice.toLocaleString('fr-FR')} Ar est bien enregistrée.\n\n` +
          `📞 Contact : ${phoneMatch[0]}\n` +
          `🛵 Notre service logistique prépare l'expédition et vous contactera avant la livraison.\n\n` +
          `[ORDER_CONFIRMED: ${JSON.stringify(orderPayload)}]`;
    }

    return isMalagasy
      ? `Faly mandray ny kaomandinao tompoko ! Mba hanomanana ny fanaterana ny "${prodName}", azafady fenoy ireto fampahalalana ireto :\n\n` +
        `1. Anaranao feno\n` +
        `2. Laharana finday (034, 032, 033, 038...)\n` +
        `3. Isan'ny entana tianao\n` +
        `4. Toerana sy adiresy hanaterana azy (Faritra, Fokontany, Repère mazava)\n\n` +
        `Avy hatrany dia ho raisinay an-tanana ny fandefasana rehefa voarainay ireo !`
      : `C'est un plaisir de prendre votre commande ! Afin d'organiser la livraison de "${prodName}", merci de nous communiquer :\n\n` +
        `1. Votre Nom complet\n` +
        `2. Votre Numéro de téléphone joignable\n` +
        `3. La Quantité souhaitée\n` +
        `4. Votre Adresse exacte de livraison (Ville, Quartier, Repère)\n\n` +
        `Dès réception, nous validons immédiatement l'expédition !`;
  }

  // 5. Delivery Inquiry
  if (
    pLower.includes('livraison') ||
    pLower.includes('fanaterana') ||
    pLower.includes('frais') ||
    pLower.includes('province') ||
    pLower.includes('tananarive') ||
    pLower.includes('tana') ||
    pLower.includes('mandefa')
  ) {
    return isMalagasy
      ? `Miarahaba tompoko ! Eny, manatitra manerana an'i Madagasikara izahay :\n\n` +
        `🛵 Antananarivo : Fanaterana ao anatin'ny 24h hatramin'ny 48h (Frais : 3.000 Ar hatramin'ny 5.000 Ar arakaraka ny toerana).\n` +
        `📦 Provinces : Fandefasana amin'ny alalan'ny Cooperatives na Colis Express azo antoka.\n\n` +
        `Inona no vokatra tianao hafindra tompoko ?`
      : `Bonjour ! Oui, nous assurons la livraison sur tout Madagascar :\n\n` +
        `🛵 Sur Antananarivo : Livraison sous 24h à 48h (Frais : 3 000 Ar à 5 000 Ar selon le quartier).\n` +
        `📦 En Province : Expédition sécurisée via coopératives et transporteurs partenaires.\n\n` +
        `Quel article souhaitez-vous recevoir ?`;
  }

  // 6. Greetings and General Welcome
  const catalogSnippet = db.products
    .slice(0, 4)
    .map((p) => `• ${p.name} (${p.price !== null ? p.price.toLocaleString('fr-FR') + ' Ar' : 'Sur devis'})`)
    .join('\n');

  if (isMalagasy) {
    return `Salama tompoko ! Faly mandray anao ny Assistante Virtuelle ${assistantName} ao amin'ny Page Facebook.\n\n` +
      `Misy zavatra manokana azoko anampiana anao ve anio ?\n\n` +
      `Ireto misy santionany amin'ireo vokatra misy ato aminay :\n${catalogSnippet}\n\n` +
      `Afaka manontany ny vidiny, ny toetoetran'ny entana, na mametraka commande avy hatrany ianao !`;
  } else {
    return `Bonjour ! Bienvenue sur notre page Facebook. Je suis ${assistantName}, votre Assistante Virtuelle à votre service.\n\n` +
      `Comment puis-je vous renseigner aujourd'hui ?\n\n` +
      `Voici un aperçu de nos articles en vedette :\n${catalogSnippet}\n\n` +
      `N'hésitez pas à poser vos questions sur nos tarifs, la livraison ou passer commande !`;
  }
}
