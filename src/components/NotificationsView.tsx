import React, { useState } from 'react';
import {
  Bell,
  ShoppingBag,
  UserCheck,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  Smartphone,
  Radio,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { NotificationLog, AssistantSettings } from '../types.js';

interface NotificationsViewProps {
  notifications: NotificationLog[];
  settings: AssistantSettings | null;
  onSendTestNotification: () => Promise<void>;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  settings,
  onSendTestNotification,
}) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [isTesting, setIsTesting] = useState(false);

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'ALL') return true;
    return n.type === filter;
  });

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await onSendTestNotification();
    } finally {
      setIsTesting(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'NEW_ORDER':
        return <ShoppingBag className="h-5 w-5 text-emerald-400" />;
      case 'HANDOFF_ALERT':
        return <UserCheck className="h-5 w-5 text-amber-400" />;
      case 'API_QUOTA_ALERT':
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case 'POST_PUBLISHED':
        return <Calendar className="h-5 w-5 text-blue-400" />;
      case 'MODERATION_ACTION':
        return <ShieldCheck className="h-5 w-5 text-indigo-400" />;
      default:
        return <Bell className="h-5 w-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-400" />
            Centre de Notifications & Alertes Opérateur
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Historique des notifications instantanées pour les nouvelles commandes, transferts de discussion et quotas d'API.
          </p>
        </div>

        <button
          onClick={handleTest}
          disabled={isTesting}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 disabled:opacity-50 self-start sm:self-auto"
        >
          <Send className="h-3.5 w-3.5" />
          <span>{isTesting ? 'Envoi...' : 'Tester Alerte Push / SMS'}</span>
        </button>
      </div>

      {/* Channel Status Ribbon */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Firebase Cloud Messaging (FCM)</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                settings?.fcm_enabled
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {settings?.fcm_enabled ? 'Activé' : 'Désactivé'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Envoi de notifications push sur navigateurs et appareils mobiles des opérateurs.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Passerelle SMS Opérateur</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                settings?.sms_enabled
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {settings?.sms_enabled ? 'Activé' : 'Désactivé'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Numéro cible : <span className="text-white font-mono">{settings?.operator_phone || 'Non renseigné'}</span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">In-App Live Alerts</span>
            <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
              Toujours Actif
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Journal de bord temps réel synchronisé avec le dashboard.
          </p>
        </div>
      </div>

      {/* Notifications Filter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'Toutes les Alertes' },
          { id: 'NEW_ORDER', label: 'Commandes' },
          { id: 'HANDOFF_ALERT', label: 'Transferts Humain' },
          { id: 'API_QUOTA_ALERT', label: 'Quotas API IA' },
          { id: 'POST_PUBLISHED', label: 'Publications' },
          { id: 'MODERATION_ACTION', label: 'Modération' },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === btn.id
                ? 'bg-blue-600 text-white'
                : 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifs.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-500">
            <Bell className="mx-auto h-10 w-10 text-slate-700 mb-2" />
            <p className="text-xs font-semibold text-slate-400">Aucune notification enregistrée</p>
          </div>
        ) : (
          filteredNotifs.map((notif) => (
            <div
              key={notif.id}
              className="flex items-start gap-3.5 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition-all hover:border-slate-700"
            >
              <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800 shrink-0">
                {getIconForType(notif.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-white">{notif.title}</h4>
                  <span className="text-[10px] text-slate-500">
                    {new Date(notif.created_at).toLocaleString('fr-FR')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">{notif.message}</p>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="rounded bg-slate-950 px-1.5 py-0.2 font-mono text-slate-400">
                    Canal : {notif.channel}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">Statut : {notif.status}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
