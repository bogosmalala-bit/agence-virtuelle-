import { db } from './db.js';
import { Order, OrderStatus, Product } from '../src/types.js';
import { sendPushNotification } from './notificationService.js';

export interface OrderInput {
  customer_name: string;
  facebook_name: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price?: number;
  phone: string;
  region: string;
  district: string;
  quartier: string;
  commune?: string;
  landmark: string;
  conversation_id?: string;
  status_notes?: string;
}

export function validateOrderInput(input: Partial<OrderInput>): {
  isValid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  if (!input.customer_name || input.customer_name.trim().length < 2) {
    missingFields.push('Nom complet réel du client');
  }
  if (!input.product_name || input.product_name.trim().length < 2) {
    missingFields.push('Nom du produit');
  }
  if (!input.quantity || input.quantity <= 0) {
    missingFields.push('Quantité');
  }
  if (!input.phone || input.phone.trim().length < 8) {
    missingFields.push('Numéro de téléphone joignable');
  }
  if (!input.region || input.region.trim().length < 2) {
    missingFields.push('Région (ex: Analamanga, Atsinanana)');
  }
  if (!input.district || input.district.trim().length < 2) {
    missingFields.push('District / Ville');
  }
  if (!input.quartier || input.quartier.trim().length < 2) {
    missingFields.push('Quartier');
  }
  if (!input.landmark || input.landmark.trim().length < 3) {
    missingFields.push('Repère précis (ex: Près pharmacie X, en face école Y)');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

export async function createOrder(input: OrderInput): Promise<Order> {
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const currentYear = new Date().getFullYear();
  const orderNumber = `CMD-${currentYear}-${randomSuffix}`;

  // Find product if possible
  let product: Product | undefined;
  if (input.product_id) {
    product = db.products.find((p) => p.id === input.product_id);
  }
  if (!product) {
    product = db.products.find(
      (p) => p.name.toLowerCase().includes(input.product_name.toLowerCase()) || input.product_name.toLowerCase().includes(p.name.toLowerCase())
    );
  }

  const unitPrice = input.unit_price ?? (product?.price || 0);
  const total = unitPrice * (input.quantity || 1);

  const newOrder: Order = {
    id: `ord_${Date.now()}`,
    order_number: orderNumber,
    user_id: db.user.id,
    page_id: db.activePageId,
    conversation_id: input.conversation_id,
    customer_name: input.customer_name.trim(),
    facebook_name: input.facebook_name || input.customer_name,
    product_id: product?.id || input.product_id || 'prod_custom',
    product_name: product?.name || input.product_name,
    quantity: input.quantity || 1,
    unit_price: unitPrice,
    total: total,
    phone: input.phone.trim(),
    region: input.region.trim(),
    district: input.district.trim(),
    quartier: input.quartier.trim(),
    commune: input.commune?.trim() || undefined,
    landmark: input.landmark.trim(),
    status: 'NOUVELLE',
    status_notes: input.status_notes || 'Commande prise automatiquement par l\'assistante IA.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.orders.unshift(newOrder);

  // Update stock if tracked
  if (product && product.stock_status === 'DISPONIBLE' && typeof product.stock_quantity === 'number') {
    product.stock_quantity = Math.max(0, product.stock_quantity - newOrder.quantity);
    if (product.stock_quantity === 0) {
      product.stock_status = 'RUPTURE_STOCK';
    }
  }

  // Trigger Operator Notification (Firebase FCM + In-App Notification)
  const notifTitle = '🛍️ Nouvelle Commande Reçue !';
  const notifMessage = `Nouvelle commande reçue — Produit : ${newOrder.product_name} — Quantité : ${newOrder.quantity} — Total : ${newOrder.total.toLocaleString('fr-FR')} Ar — Client : ${newOrder.customer_name} (${newOrder.phone})`;

  await sendPushNotification({
    title: notifTitle,
    message: notifMessage,
    type: 'NEW_ORDER',
    related_id: newOrder.id,
  });

  return newOrder;
}
