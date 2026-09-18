import fs from 'fs';
import path from 'path';
import {
  User,
  FacebookPage,
  Product,
  Conversation,
  Message,
  Order,
  AIApiKeyConfig,
  AssistantSettings,
  FacebookComment,
  ModerationRule,
  ScheduledPost,
  NotificationLog,
  AudienceInsight,
  WebhookLog,
  SystemConfig,
} from '../src/types.js';

const STORAGE_FILE = process.env.VERCEL
  ? '/tmp/assistante_storage.json'
  : path.join(process.cwd(), 'assistante_storage.json');

// In-Memory Database with realistic seed data
export interface DatabaseSchema {
  user: User;
  facebookPages: FacebookPage[];
  activePageId: string;
  products: Product[];
  conversations: Conversation[];
  messages: Message[];
  orders: Order[];
  aiApiKeys: AIApiKeyConfig[];
  assistantSettings: AssistantSettings;
  facebookComments: FacebookComment[];
  moderationRules: ModerationRule[];
  scheduledPosts: ScheduledPost[];
  notifications: NotificationLog[];
  audienceInsights: AudienceInsight[];
  webhookLogs: WebhookLog[];
  systemConfig: SystemConfig;
}

export const db: DatabaseSchema = {
  systemConfig: {
    meta_app_id: process.env.META_APP_ID || '',
    meta_app_secret: process.env.META_APP_SECRET || '',
    meta_verify_token: process.env.META_VERIFY_TOKEN || 'assistante_virtuelle_webhook_verify_token',
    firebase_fcm_server_key: process.env.FIREBASE_FCM_SERVER_KEY || 'AAAA_fcm_server_key_live_2026',
    operator_phone_number: process.env.OPERATOR_PHONE_NUMBER || '+261340000000',
    sms_gateway_api_key: process.env.SMS_GATEWAY_API_KEY || 'sms_gw_live_key_9921',
    updated_at: new Date().toISOString(),
  },

  user: {
    id: 'usr_001',
    facebook_id: 'fb_1029384756',
    name: 'Rova Rakotoarisoa',
    email: 'admin.page@elite-madagascar.com',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
    created_at: '2026-01-10T08:00:00.000Z',
  },

  activePageId: '',

  facebookPages: [],

  assistantSettings: {
    id: 'sett_01',
    page_id: '',
    name: 'Sarah',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&h=200&q=80',
    is_active: true,
    default_model: 'gemini-3.8-flash',
    assistance_type: 'VENTE', // 'VENTE' ou 'TRAVAIL'
    tone: 'Commercial', // 'Professionnel' | 'Amical' | 'Commercial' | 'Simple'
    primary_language: 'Français', // 'Français' | 'Malagasy' | 'Bilingue (FR/MG)'
    custom_instructions:
      'Toujours saluer chaleureusement le client avec politesse. Donner le prix en Ariary (Ar). En mode VENTE, quand le client veut commander, demander les 7 informations obligatoires (Nom complet, Nom Facebook, Produit, Quantité, Téléphone, Total en Ar, Adresse détaillée avec Région, District, Quartier, Repère). Ne jamais inventer de stock ni de caractéristiques absentes de la fiche produit.',
    operator_phone: '+261 34 56 789 01',
    notification_channel: 'ALL',
    fcm_enabled: true,
    sms_enabled: true,
    auto_handoff_on_frustration: true,
    auto_post_enabled: true,
    comment_auto_reply_enabled: true,
    comment_private_reply_enabled: true,
    comment_moderation_enabled: true,
  },

  aiApiKeys: [
    {
      id: 'key_slot_1',
      slot: 1,
      name: 'Gemini 3.8 Flash (Vente & Messenger Principal)',
      model: 'gemini-3.8-flash',
      model_description: 'Modèle haute performance ultra-réactif, idéal pour l accueil Messenger, le conseil produit et la prise de commande immédiate.',
      masked_key: 'AIzaSy... (Système Intégré)',
      status: 'ACTIVE',
      request_count: 0,
      error_count: 0,
      latency_ms: 220,
    },
    {
      id: 'key_slot_2',
      slot: 2,
      name: 'Gemini 3.1 Pro (Raisonnement & Négociation Avancée)',
      model: 'gemini-3.1-pro-preview',
      model_description: 'Modèle d analyse avancée et de raisonnement complexe, parfait pour les devis sur mesure, calculs et argumentations détaillées.',
      masked_key: 'AIzaSy... (Système Intégré)',
      status: 'ACTIVE',
      request_count: 0,
      error_count: 0,
      latency_ms: 310,
    },
    {
      id: 'key_slot_3',
      slot: 3,
      name: 'Gemini 3.1 Flash-Lite (Vitesse Éclair & FAQ)',
      model: 'gemini-3.1-flash-lite',
      model_description: 'Modèle ultra-léger conçu pour une latence minimale, idéal pour répondre en une fraction de seconde aux questions simples et tarifs.',
      masked_key: 'AIzaSy... (Système Intégré)',
      status: 'ACTIVE',
      request_count: 0,
      error_count: 0,
      latency_ms: 150,
    },
    {
      id: 'key_slot_4',
      slot: 4,
      name: 'Gemini 3.1 Flash Image (Vision & Analyse Visuelle)',
      model: 'gemini-3.1-flash-image',
      model_description: 'Modèle multimodal capable d inspecter et comprendre visuellement les photos de produits, reçus de paiement et captures envoyées par les clients.',
      masked_key: 'AIzaSy... (Système Intégré)',
      status: 'ACTIVE',
      request_count: 0,
      error_count: 0,
      latency_ms: 420,
    },
    {
      id: 'key_slot_5',
      slot: 5,
      name: 'Gemini 3.5 Transcribe (Audio & Messages Vocaux)',
      model: 'gemini-3.5-transcribe',
      model_description: 'Modèle spécialisé dans l écoute et la transcription des notes audio ou messages vocaux Messenger des clients à Madagascar.',
      masked_key: 'AIzaSy... (Système Intégré)',
      status: 'ACTIVE',
      request_count: 0,
      error_count: 0,
      latency_ms: 380,
    },
  ],

  products: [
    {
      id: 'prod_001',
      user_id: 'usr_001',
      page_id: 'page_mada_01',
      name: 'Smartwatch Pro Ultra GPS 2026',
      price: 185000,
      currency: 'Ar',
      stock_status: 'DISPONIBLE',
      stock_quantity: 45,
      category: 'High-Tech & Montres',
      description:
        'Montre connectée étanche IP68 avec écran AMOLED 1.96 pouce tactile HD, capteur de fréquence cardiaque, SpO2, suivi du sommeil, GPS autonome pour le sport, plus de 100 modes sportifs et autonomie batterie jusqu à 14 jours. Compatible Android et iOS. Livrée avec bracelet silicone + câble charge magnétique rapide.',
      files: [
        {
          id: 'file_001',
          product_id: 'prod_001',
          file_name: 'smartwatch_ultra_photo_hd.jpg',
          file_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
          file_type: 'image',
          size_bytes: 420000,
          created_at: '2026-02-01T10:00:00.000Z',
        },
        {
          id: 'file_002',
          product_id: 'prod_001',
          file_name: 'smartwatch_demo_video.mp4',
          file_url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          file_type: 'video',
          size_bytes: 1048576,
          created_at: '2026-02-01T10:05:00.000Z',
        },
        {
          id: 'file_003',
          product_id: 'prod_001',
          file_name: 'manuel_utilisation_smartwatch_fr.pdf',
          file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          file_type: 'pdf',
          size_bytes: 250000,
          created_at: '2026-02-01T10:10:00.000Z',
        },
      ],
      created_at: '2026-02-01T10:00:00.000Z',
      updated_at: '2026-02-15T11:20:00.000Z',
    },
    {
      id: 'prod_002',
      user_id: 'usr_001',
      page_id: 'page_mada_01',
      name: 'Écouteurs Sans Fil TWS Bass Boost',
      price: 65000,
      currency: 'Ar',
      stock_status: 'DISPONIBLE',
      stock_quantity: 80,
      category: 'Audio & Accessoires',
      description:
        'Écouteurs Bluetooth 5.3 stéréo sans fil avec réduction active du bruit ambiant (ANC). Son surround immersif avec basses profondes. Boîtier de charge compact USB-C offrant 32h d autonomie totale. Contrôle tactile tactile pour appels et musique. Résistant à la sueur (IPX5).',
      files: [
        {
          id: 'file_004',
          product_id: 'prod_002',
          file_name: 'ecouteurs_tws_black.jpg',
          file_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
          file_type: 'image',
          size_bytes: 380000,
          created_at: '2026-02-02T09:00:00.000Z',
        },
      ],
      created_at: '2026-02-02T09:00:00.000Z',
      updated_at: '2026-02-10T14:00:00.000Z',
    },
    {
      id: 'prod_003',
      user_id: 'usr_001',
      page_id: 'page_mada_01',
      name: 'Powerbank Solaire 30000mAh Fast Charge',
      price: 120000,
      currency: 'Ar',
      stock_status: 'DISPONIBLE',
      stock_quantity: 30,
      category: 'Énergie & Voyage',
      description:
        'Batterie externe haute capacité 30000mAh avec panneau solaire de secours intégré. 2 sorties USB Fast Charge 22.5W + 1 port Type-C Power Delivery 20W. Lampe torche LED puissante 3 modes (Fixe, SOS, Flash). Boîtier antichoc renforcé idéal pour délestages, sorties et voyages en brousse.',
      files: [
        {
          id: 'file_005',
          product_id: 'prod_003',
          file_name: 'powerbank_solar_rugged.jpg',
          file_url: 'https://images.unsplash.com/photo-1609592424368-f9b1f51ee127?auto=format&fit=crop&w=800&q=80',
          file_type: 'image',
          size_bytes: 490000,
          created_at: '2026-02-05T12:00:00.000Z',
        },
      ],
      created_at: '2026-02-05T12:00:00.000Z',
      updated_at: '2026-02-14T08:30:00.000Z',
    },
    {
      id: 'prod_004',
      user_id: 'usr_001',
      page_id: 'page_mada_01',
      name: 'Ring Light Studio 12 Pouces + Trépied 2.1m',
      price: 95000,
      currency: 'Ar',
      stock_status: 'RUPTURE_STOCK',
      stock_quantity: 0,
      category: 'Créateurs & Vidéo',
      description:
        'Anneau lumineux LED 12 pouces (30cm) avec 3 modes d éclairage (Chaud, Neutre, Froid) et 10 niveaux d intensité réglables. Livré avec grand trépied télescopique réglable jusqu à 2.10m, support smartphone rotatif 360° et télécommande Bluetooth pour photos/vidéos TikTok et Lives Facebook.',
      files: [
        {
          id: 'file_006',
          product_id: 'prod_004',
          file_name: 'ringlight_studio_pro.jpg',
          file_url: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=800&q=80',
          file_type: 'image',
          size_bytes: 310000,
          created_at: '2026-02-08T15:00:00.000Z',
        },
      ],
      created_at: '2026-02-08T15:00:00.000Z',
      updated_at: '2026-02-16T16:45:00.000Z',
    },
    {
      id: 'prod_005',
      user_id: 'usr_001',
      page_id: 'page_mada_01',
      name: 'Guide PDF Stratégie E-Commerce Madagascar 2026',
      price: null, // Gratuit
      currency: 'Ar',
      stock_status: 'DISPONIBLE',
      stock_quantity: null,
      category: 'Formations & Guides',
      description:
        'Guide numérique complet offert au format PDF : comment booster ses ventes sur Facebook et Instagram à Madagascar, optimiser les livraisons à Antananarivo et provinces, et fidéliser ses clients via le service client IA.',
      files: [
        {
          id: 'file_007',
          product_id: 'prod_005',
          file_name: 'guide_ecommerce_madagascar_2026.pdf',
          file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          file_type: 'pdf',
          size_bytes: 1800000,
          created_at: '2026-02-10T11:00:00.000Z',
        },
      ],
      created_at: '2026-02-10T11:00:00.000Z',
      updated_at: '2026-02-10T11:00:00.000Z',
    },
  ],

  conversations: [],

  messages: [],

  orders: [],

  facebookComments: [],

  moderationRules: [
    {
      id: 'mod_001',
      keyword_or_pattern: 'http, https, www, .com, .mg, t.me, whatsapp',
      action: 'HIDE',
      category: 'COMPETITOR_LINK',
      is_active: true,
      created_at: '2026-02-01T08:00:00.000Z',
    },
    {
      id: 'mod_002',
      keyword_or_pattern: 'arnaque, voleur, fake, escroc, mpangalatra',
      action: 'ALERT_OPERATOR',
      category: 'INSULT',
      is_active: true,
      created_at: '2026-02-01T08:00:00.000Z',
    },
    {
      id: 'mod_003',
      keyword_or_pattern: 'crypto, forex, investissez, gagnez des millions, 1xbet',
      action: 'HIDE',
      category: 'SPAM',
      is_active: true,
      created_at: '2026-02-01T08:00:00.000Z',
    },
  ],

  scheduledPosts: [],

  notifications: [],

  audienceInsights: [
    { day_of_week: 'Lundi', hour: 12, engagement_score: 82, recommended: true },
    { day_of_week: 'Lundi', hour: 18, engagement_score: 95, recommended: true },
    { day_of_week: 'Mardi', hour: 12, engagement_score: 78, recommended: false },
    { day_of_week: 'Mardi', hour: 19, engagement_score: 92, recommended: true },
    { day_of_week: 'Mercredi', hour: 13, engagement_score: 85, recommended: true },
    { day_of_week: 'Mercredi', hour: 20, engagement_score: 96, recommended: true },
    { day_of_week: 'Jeudi', hour: 12, engagement_score: 80, recommended: false },
    { day_of_week: 'Jeudi', hour: 19, engagement_score: 91, recommended: true },
    { day_of_week: 'Vendredi', hour: 12, engagement_score: 88, recommended: true },
    { day_of_week: 'Vendredi', hour: 18, engagement_score: 98, recommended: true },
    { day_of_week: 'Samedi', hour: 10, engagement_score: 89, recommended: true },
    { day_of_week: 'Samedi', hour: 15, engagement_score: 94, recommended: true },
    { day_of_week: 'Dimanche', hour: 14, engagement_score: 90, recommended: true },
    { day_of_week: 'Dimanche', hour: 20, engagement_score: 97, recommended: true },
  ],

  webhookLogs: [],
};

const STORAGE_FILES = [
  path.join(process.cwd(), 'assistante_storage.json'),
  '/tmp/assistante_storage.json',
];

export function saveDb(): void {
  try {
    const realPages = (db.facebookPages || []).filter(
      (p: any) => !p.is_demo && p.id !== 'page_mada_01' && p.id !== 'page_mada_02' && p.id !== 'page_1'
    );
    const payload = {
      systemConfig: db.systemConfig,
      facebookPages: realPages,
      activePageId: db.activePageId,
      assistantSettings: db.assistantSettings,
      user: db.user,
      products: db.products,
      conversations: db.conversations,
      messages: db.messages,
      orders: db.orders,
      aiApiKeys: db.aiApiKeys,
      facebookComments: db.facebookComments,
      moderationRules: db.moderationRules,
      scheduledPosts: db.scheduledPosts,
      notifications: db.notifications,
      audienceInsights: db.audienceInsights,
      webhookLogs: db.webhookLogs,
    };
    const json = JSON.stringify(payload, null, 2);
    for (const filePath of STORAGE_FILES) {
      try {
        fs.writeFileSync(filePath, json, 'utf-8');
      } catch (err) {
        // Continue to fallback paths
      }
    }
  } catch (err) {
    console.error('[DB SAVE ERROR]', err);
  }
}

export function loadDb(): void {
  try {
    for (const filePath of STORAGE_FILES) {
      try {
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(raw);
          if (data.systemConfig) {
            db.systemConfig = { ...db.systemConfig, ...data.systemConfig };
          }
          if (Array.isArray(data.facebookPages)) {
            db.facebookPages = data.facebookPages.filter(
              (p: any) => !p.is_demo && p.id !== 'page_mada_01' && p.id !== 'page_mada_02' && p.id !== 'page_1'
            );
          }
          if (data.activePageId && data.activePageId !== 'page_mada_01' && data.activePageId !== 'page_mada_02' && data.activePageId !== 'page_1') {
            db.activePageId = data.activePageId;
          } else {
            db.activePageId = db.facebookPages[0]?.id || '';
          }
          if (data.assistantSettings) {
            db.assistantSettings = { ...db.assistantSettings, ...data.assistantSettings };
          }
          if (data.user) {
            db.user = { ...db.user, ...data.user };
          }
          if (Array.isArray(data.products)) {
            db.products = data.products;
          }
          if (Array.isArray(data.conversations)) {
            db.conversations = data.conversations;
          }
          if (Array.isArray(data.messages)) {
            db.messages = data.messages;
          }
          if (Array.isArray(data.orders)) {
            db.orders = data.orders;
          }
          if (Array.isArray(data.aiApiKeys)) {
            db.aiApiKeys = data.aiApiKeys;
          }
          if (Array.isArray(data.facebookComments)) {
            db.facebookComments = data.facebookComments;
          }
          if (Array.isArray(data.moderationRules)) {
            db.moderationRules = data.moderationRules;
          }
          if (Array.isArray(data.scheduledPosts)) {
            db.scheduledPosts = data.scheduledPosts;
          }
          if (Array.isArray(data.notifications)) {
            db.notifications = data.notifications;
          }
          if (Array.isArray(data.audienceInsights)) {
            db.audienceInsights = data.audienceInsights;
          }
          if (Array.isArray(data.webhookLogs)) {
            db.webhookLogs = data.webhookLogs;
          }
          break; // Loaded successfully
        }
      } catch (err) {
        // Try fallback path
      }
    }
  } catch (err) {
    console.error('[DB LOAD ERROR]', err);
  }
}

// Automatically load on module initialization
loadDb();


