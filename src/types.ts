export type AssistanceType = 'VENTE' | 'TRAVAIL';

export type AIApiKeyStatus = 'ACTIVE' | 'QUOTA_LIMIT' | 'ERROR' | 'TEMPORARILY_DISABLED';

export type ConversationStatus = 'BOT_ACTIVE' | 'HANDOFF_HUMAN' | 'CLOSED';

export type OrderStatus =
  | 'NOUVELLE'
  | 'CONFIRMÉE'
  | 'EN PRÉPARATION'
  | 'EXPÉDIÉE'
  | 'LIVRÉE'
  | 'ANNULÉE';

export type PostStatus = 'PROGRAMMÉE' | 'PUBLIÉE' | 'EN ATTENTE' | 'ERREUR';

export type NotificationChannel = 'PUSH_FCM' | 'SMS' | 'IN_APP' | 'ALL';

export interface User {
  id: string;
  facebook_id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  created_at: string;
}

export interface FacebookPage {
  id: string;
  user_id: string;
  page_id: string;
  page_name: string;
  category?: string;
  avatar_url: string;
  fan_count?: number;
  has_access_token: boolean;
  token_status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'DISCONNECTED';
  token_expires_at?: string;
  status: 'CONNECTED' | 'DISCONNECTED';
  connected_at: string;
}

export interface ProductFile {
  id: string;
  product_id: string;
  file_name: string;
  file_url: string;
  file_type: 'image' | 'video' | 'pdf' | 'document';
  size_bytes?: number;
  created_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  page_id: string;
  name: string;
  price: number | null; // Prix en Ariary (null si gratuit ou sur devis)
  currency: string; // 'Ar'
  stock_status: 'DISPONIBLE' | 'RUPTURE_STOCK' | 'QUANTITE_DISPONIBLE';
  stock_quantity?: number | null;
  description: string;
  files: ProductFile[];
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: 'CUSTOMER' | 'AI_ASSISTANT' | 'HUMAN_OPERATOR';
  sender_name: string;
  message: string;
  attachments?: {
    type: 'image' | 'video' | 'pdf' | 'file';
    url: string;
    name?: string;
  }[];
  ai_model_used?: string;
  api_key_slot?: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  page_id: string;
  customer_id: string;
  customer_name: string;
  facebook_profile_pic?: string;
  last_message: string;
  status: ConversationStatus;
  handoff_reason?: string;
  identified_product_id?: string | null;
  identified_product_name?: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string; // CMD-2026-XXXXX
  user_id: string;
  page_id: string;
  conversation_id?: string;
  customer_name: string; // Nom réel complet
  facebook_name: string; // Nom / ID Facebook
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number; // Ariary (Ar)
  total: number; // Ariary (Ar)
  phone: string;
  // Adresse détaillée
  region: string;
  district: string;
  quartier: string;
  commune?: string;
  landmark: string; // Repère précis
  status: OrderStatus;
  status_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AIApiKeyConfig {
  id: string;
  slot: number; // 1, 2, 3, 4, 5
  name: string;
  model: string; // e.g. 'gemini-3.8-flash', 'gemini-3.1-pro-preview', etc.
  model_description?: string;
  masked_key: string;
  status: AIApiKeyStatus;
  last_used_at?: string;
  request_count: number;
  error_count: number;
  last_error_message?: string;
  last_error_at?: string;
  cooldown_until?: string;
  latency_ms?: number;
}

export interface AssistantSettings {
  id: string;
  page_id: string;
  name: string; // e.g. "Sarah"
  avatar_url?: string;
  is_active: boolean;
  default_model?: string; // 'gemini-3.8-flash' | 'gemini-3.1-pro-preview' | etc.
  assistance_type: AssistanceType; // 'VENTE' | 'TRAVAIL'
  tone: string;
  primary_language: string;
  custom_instructions: string;
  operator_phone: string;
  notification_channel: NotificationChannel;
  fcm_enabled: boolean;
  sms_enabled: boolean;
  auto_handoff_on_frustration: boolean;
  auto_post_enabled: boolean;
  comment_auto_reply_enabled: boolean;
  comment_private_reply_enabled: boolean;
  comment_moderation_enabled: boolean;
}

export interface FacebookComment {
  id: string;
  post_id: string;
  post_title: string;
  comment_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  message: string;
  created_at: string;
  status: 'PENDING' | 'REPLIED' | 'PRIVATE_MESSAGE_SENT' | 'HIDDEN' | 'FLAGGED_SPAM';
  reply_text?: string;
  private_reply_text?: string;
  moderation_flag?: 'SPAM' | 'UNAUTHORIZED_PROMO' | 'INAPPROPRIATE' | 'CLEAN';
  moderation_reason?: string;
}

export interface ModerationRule {
  id: string;
  keyword_or_pattern: string;
  action: 'HIDE' | 'FLAG' | 'ALERT_OPERATOR' | 'DELETE';
  category: 'SPAM' | 'COMPETITOR_LINK' | 'COMPETITOR' | 'INSULT' | 'CUSTOM' | string;
  is_active?: boolean;
  created_at?: string;
}

export interface ScheduledPost {
  id: string;
  user_id: string;
  page_id: string;
  product_id?: string | null;
  product_name?: string | null;
  content: string;
  media_url?: string;
  media_type?: 'IMAGE' | 'VIDEO';
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string; // HH:mm
  status: PostStatus;
  published_at?: string;
  meta_post_id?: string;
  is_ai_generated: boolean;
  created_at: string;
}

export interface NotificationLog {
  id: string;
  type: 'NEW_ORDER' | 'HANDOFF_ALERT' | 'API_QUOTA_ALERT' | 'POST_PUBLISHED' | 'MODERATION_ACTION';
  title: string;
  message: string;
  channel: 'PUSH_FCM' | 'SMS' | 'IN_APP' | 'ALL';
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  related_id?: string;
  created_at: string;
}

export interface AudienceInsight {
  day_of_week: string;
  hour: number;
  peak_time_start?: string;
  peak_time_end?: string;
  engagement_score: number; // 0 - 100
  recommended: boolean;
}

export interface WebhookLog {
  id: string;
  event_type: 'messages' | 'feed_comment' | 'messaging_postbacks' | 'page_mention';
  sender_id: string;
  sender_name?: string;
  payload_summary: string;
  action_taken: string;
  timestamp: string;
  status: 'SUCCESS' | 'IGNORED' | 'ERROR';
}

export interface SystemConfig {
  meta_app_id: string;
  meta_app_secret: string;
  meta_verify_token: string;
  firebase_fcm_server_key: string;
  operator_phone_number: string;
  sms_gateway_api_key: string;
  updated_at?: string;
}
