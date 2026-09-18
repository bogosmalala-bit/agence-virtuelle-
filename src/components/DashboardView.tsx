import React from 'react';
import {
  Bot,
  MessageSquare,
  ShoppingBag,
  Clock,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Play,
  Package,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { FacebookPage, AssistantSettings, Conversation, Order, AIApiKeyConfig } from '../types.js';

interface DashboardViewProps {
  page: FacebookPage | null;
  settings: AssistantSettings | null;
  stats: any;
  conversations: Conversation[];
  orders: Order[];
  apiKeys: AIApiKeyConfig[];
  isSyncing?: boolean;
  onNavigate: (view: string) => void;
  onToggleAi: () => void;
  onSyncFacebook?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  page,
  settings,
  stats,
  conversations,
  orders,
  apiKeys,
  isSyncing = false,
  onNavigate,
  onToggleAi,
  onSyncFacebook,
}) => {
  const activeKey = apiKeys.find((k) => k.status === 'ACTIVE');
  const quotaLimitKeys = apiKeys.filter((k) => k.status === 'QUOTA_LIMIT');

  return (
    <div className="space-y-6">
      {/* Top Banner: Connected Page & Main Assistant Status */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 p-5 md:p-6 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={page?.avatar_url || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=200&h=200&q=80'}
              alt={page?.page_name}
              className="h-14 w-14 rounded-2xl border-2 border-blue-500/50 object-cover shadow-lg"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-white md:text-xl">{page?.page_name || 'Boutique Facebook'}</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Page Connectée
                </span>
                <span className="rounded-full border border-blue-500/30 bg-blue-950/60 px-2 py-0.5 text-[11px] font-semibold text-blue-300">
                  {page?.category || 'Commerce & Vente'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Assistante IA : <span className="font-semibold text-slate-200">{settings?.name || 'Sarah'}</span> • Mode{' '}
                <span className="font-semibold text-blue-400">{settings?.assistance_type || 'VENTE'}</span> • Rotation{' '}
                <span className="font-semibold text-slate-300">{apiKeys.filter((k) => k.status === 'ACTIVE').length} clés actives</span>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onToggleAi}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                settings?.is_active
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Bot className="h-4 w-4" />
              <span>{settings?.is_active ? 'IA ACTIVE (Pause ?)' : 'IA EN PAUSE (Activer)'}</span>
            </button>

            <button
              id="dashboard-sync-meta-btn"
              onClick={onSyncFacebook || (() => onNavigate('system-config'))}
              disabled={isSyncing}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronisation en cours...' : 'Synchro Meta Directe'}</span>
            </button>
          </div>
        </div>

        {/* Quota limit alert banner if any key is currently in cooldown */}
        {quotaLimitKeys.length > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-950/30 px-3.5 py-2 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                <strong>Rotation intelligente active :</strong> {quotaLimitKeys.length} clé(s) ont atteint leur quota temporaire. Le système utilise automatiquement le Slot {activeKey?.slot || 'suivant'}.
              </span>
            </div>
            <button
              onClick={() => onNavigate('api-keys')}
              className="font-semibold text-amber-300 underline hover:text-white"
            >
              Voir le monitoring
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Messages Traités Réels */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Messages Traités</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-white">{stats?.recentMessagesCount ?? 0}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <TrendingUp className="h-3 w-3" />
            <span>Temps réel connecté</span>
          </div>
        </div>

        {/* Commentaires Récents */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Commentaires Facebook</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-white">{stats?.recentCommentsCount ?? 0}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-blue-400 font-medium">
            <ShieldCheck className="h-3 w-3" />
            <span>Réponse & Modération auto</span>
          </div>
        </div>

        {/* Commandes Totales & Revenu */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Commandes Vente</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-white">{stats?.totalOrders ?? orders.length}</p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-300">
            Total : {(stats?.totalRevenue ?? 0).toLocaleString('fr-FR')} Ar
          </p>
        </div>

        {/* Commandes En Attente / Préparation */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">En Attente Livraison</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-300">{stats?.pendingOrders ?? 0}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            {settings?.assistance_type === 'VENTE' ? 'Prise de commande active' : 'Mode Travail (Lecture seule)'}
          </p>
        </div>
      </div>

      {/* Two Column Layout: Recent Conversations & Recent Orders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Conversations */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Dernières Conversations Messenger</h3>
            </div>
            <button
              onClick={() => onNavigate('conversations')}
              className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300"
            >
              <span>Voir tout</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {conversations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-300">Aucun message reçu pour le moment</p>
                <p className="mt-1 text-[11px] text-slate-500 max-w-sm mx-auto">
                  Dès qu'un client vous écrit sur Facebook Messenger ou après synchronisation Meta, les messages apparaîtront ici en direct.
                </p>
              </div>
            ) : (
              conversations.slice(0, 4).map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => onNavigate('conversations')}
                  className="group flex cursor-pointer items-start justify-between rounded-xl border border-slate-800/80 bg-slate-950/50 p-3 transition-all hover:border-blue-500/40 hover:bg-slate-900"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <img
                      src={conv.facebook_profile_pic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80'}
                      alt={conv.customer_name}
                      className="h-9 w-9 rounded-full object-cover shrink-0 ring-1 ring-slate-700"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-bold text-slate-200">{conv.customer_name}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(conv.updated_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="truncate text-xs text-slate-400 mt-0.5">{conv.last_message}</p>
                      {conv.identified_product_name && (
                        <span className="mt-1.5 inline-block rounded bg-blue-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                          🛍️ {conv.identified_product_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="ml-2 shrink-0">
                    {conv.status === 'HANDOFF_HUMAN' ? (
                      <span className="rounded-full bg-amber-950/80 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                        Humain
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                        IA Active
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Dernières Commandes Clients (Ariary)</h3>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300"
            >
              <span>Voir tout</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {orders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center">
                <ShoppingBag className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-300">Aucune commande pour le moment</p>
                <p className="mt-1 text-[11px] text-slate-500 max-w-sm mx-auto">
                  Dès qu'un client confirme une commande (nom, téléphone, adresse à Madagascar), l'IA la validera automatiquement ici en temps réel.
                </p>
              </div>
            ) : (
              orders.slice(0, 4).map((ord) => (
              <div
                key={ord.id}
                onClick={() => onNavigate('orders')}
                className="group flex cursor-pointer items-start justify-between rounded-xl border border-slate-800/80 bg-slate-950/50 p-3 transition-all hover:border-emerald-500/40 hover:bg-slate-900"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-400">{ord.order_number}</span>
                    <span className="text-xs font-semibold text-slate-200">• {ord.customer_name}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-300 font-medium">
                    {ord.quantity}x {ord.product_name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    📍 {ord.quartier}, {ord.district} ({ord.phone})
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="block text-xs font-extrabold text-white">
                    {ord.total.toLocaleString('fr-FR')} Ar
                  </span>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      ord.status === 'NOUVELLE'
                        ? 'bg-blue-950 text-blue-300 border border-blue-500/30'
                        : ord.status === 'CONFIRMÉE'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                        : ord.status === 'EN PRÉPARATION'
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        : ord.status === 'EXPÉDIÉE'
                        ? 'bg-purple-950 text-purple-300 border border-purple-500/30'
                        : ord.status === 'LIVRÉE'
                        ? 'bg-teal-950 text-teal-300 border border-teal-500/30'
                        : 'bg-red-950 text-red-300 border border-red-500/30'
                    }`}
                  >
                    {ord.status}
                  </span>
                </div>
              </div>
            ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Launchpad Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          onClick={() => onNavigate('products')}
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-left transition-all hover:border-slate-700 hover:bg-slate-900"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-200">Gérer Produits</p>
            <p className="text-[11px] text-slate-400">Descriptions & Médias</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('auto-post')}
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-left transition-all hover:border-slate-700 hover:bg-slate-900"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-200">Auto-Post IA</p>
            <p className="text-[11px] text-slate-400">Visuels & Heures pic</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('moderation')}
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-left transition-all hover:border-slate-700 hover:bg-slate-900"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-200">Modération</p>
            <p className="text-[11px] text-slate-400">Filtres anti-spam</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('api-keys')}
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-left transition-all hover:border-slate-700 hover:bg-slate-900"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-200">Rotation Clés IA</p>
            <p className="text-[11px] text-slate-400">5 Slots sécurisés</p>
          </div>
        </button>
      </div>
    </div>
  );
};
