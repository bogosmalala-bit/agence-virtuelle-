import React, { useState } from 'react';
import {
  Bot,
  Bell,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  Phone,
  Radio,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { FacebookPage, AssistantSettings, NotificationLog, AIApiKeyConfig } from '../types.js';

interface HeaderProps {
  page: FacebookPage | null;
  settings: AssistantSettings | null;
  notifications: NotificationLog[];
  apiKeys: AIApiKeyConfig[];
  isSyncing?: boolean;
  onToggleAi: () => void;
  onSyncFacebook?: () => void;
  onNavigate: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  page,
  settings,
  notifications,
  apiKeys,
  isSyncing = false,
  onToggleAi,
  onSyncFacebook,
  onNavigate,
}) => {
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const activeKey = apiKeys.find((k) => k.status === 'ACTIVE');
  const hasQuotaLimit = apiKeys.some((k) => k.status === 'QUOTA_LIMIT');

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/95 px-4 py-3 backdrop-blur-md md:px-6">
      {/* Left: Connected Page Info & AI Status */}
      <div className="flex items-center gap-3 md:gap-4">
        {page && (
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-950/60 p-1.5 pr-3">
            <img
              src={page.avatar_url}
              alt={page.page_name}
              className="h-8 w-8 rounded-full border border-blue-500/40 object-cover"
            />
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-200">{page.page_name}</span>
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
              </div>
              <span className="text-[11px] text-slate-400">Meta ID: {page.page_id.slice(-6)}</span>
            </div>
          </div>
        )}

        {/* AI Active Toggle */}
        <button
          id="toggle-ai-assistant-btn"
          onClick={onToggleAi}
          className={`group flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
            settings?.is_active
              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40'
              : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              settings?.is_active
                ? 'animate-pulse bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                : 'bg-slate-500'
            }`}
          />
          <span>IA {settings?.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
          <span className="hidden rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 md:inline-block">
            Mode {settings?.assistance_type}
          </span>
        </button>
      </div>

      {/* Right: Actions, Rotation status, Notifications */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Real-Time Live Sync Indicator */}
        <div
          onClick={() => onNavigate('system-config')}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-2.5 py-1 text-[11px] font-bold text-emerald-300 transition-colors hover:bg-emerald-900/40"
          title="Toutes les opérations et webhooks sont synchronisés en temps réel"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span className="hidden md:inline">Temps Réel Actif</span>
          <span className="md:hidden">Direct</span>
        </div>

        {/* Key Rotation Badge */}
        <button
          onClick={() => onNavigate('api-keys')}
          className="hidden items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-700 lg:flex"
        >
          <Layers className="h-3.5 w-3.5 text-blue-400" />
          <span>Slot {activeKey ? activeKey.slot : '1'}</span>
          {hasQuotaLimit && (
            <span className="flex h-2 w-2 rounded-full bg-amber-400" title="Rotation active" />
          )}
        </button>

        {/* Real Meta Graph API Sync Button */}
        <button
          id="sync-meta-live-btn"
          onClick={onSyncFacebook}
          disabled={isSyncing}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-95 disabled:opacity-50"
          title="Synchroniser les vraies conversations, messages et commentaires Meta Facebook"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isSyncing ? 'Synchro Meta...' : 'Synchro Facebook'}</span>
          <span className="sm:hidden">{isSyncing ? 'Synchro...' : 'Synchro'}</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            id="notifications-bell-btn"
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/60 text-slate-300 transition-colors hover:border-slate-700 hover:text-white"
          >
            <Bell className="h-4 w-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-2xl shadow-black/80 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-bold text-slate-200">Centre de Notifications (FCM / Opérateur)</span>
                </div>
                <button
                  onClick={() => {
                    setShowNotifMenu(false);
                    onNavigate('notifications');
                  }}
                  className="text-[11px] text-blue-400 hover:underline"
                >
                  Tout voir
                </button>
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-500">Aucune notification récente</p>
                ) : (
                  notifications.slice(0, 5).map((notif) => (
                    <div
                      key={notif.id}
                      className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-2.5 text-xs transition-colors hover:border-slate-700"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-semibold text-slate-200">{notif.title}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(notif.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-400 text-[11px] leading-relaxed">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
