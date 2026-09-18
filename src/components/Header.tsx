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
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Facebook,
  Flame,
} from 'lucide-react';
import { FacebookPage, AssistantSettings, NotificationLog, AIApiKeyConfig } from '../types.js';

interface HeaderProps {
  page: FacebookPage | null;
  pages?: FacebookPage[];
  settings: AssistantSettings | null;
  notifications: NotificationLog[];
  apiKeys: AIApiKeyConfig[];
  isSyncing?: boolean;
  onToggleAi: () => void;
  onSyncFacebook?: () => void;
  onSelectPage?: (pageId: string) => void;
  onNavigate: (view: string) => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenFacebookLogin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  page,
  pages = [],
  settings,
  notifications,
  apiKeys,
  isSyncing = false,
  onToggleAi,
  onSyncFacebook,
  onSelectPage,
  onNavigate,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenFacebookLogin,
}) => {
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showPageMenu, setShowPageMenu] = useState(false);
  const activeKey = apiKeys.find((k) => k.status === 'ACTIVE');
  const hasQuotaLimit = apiKeys.some((k) => k.status === 'QUOTA_LIMIT');

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/95 px-3 py-3 backdrop-blur-md md:px-6">
      {/* Left: Sidebar Toggle, Connected Page Info & AI Status */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Toggle Sidebar Button */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/80 text-slate-300 hover:bg-slate-800 hover:text-white transition-all shadow-sm"
            title={isSidebarCollapsed ? 'Agrandir la barre latérale (Halalahana)' : 'Réduire la barre latérale (Aforitra)'}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4 text-blue-400" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        )}

        {page && (
          <div className="relative">
            <button
              onClick={() => setShowPageMenu(!showPageMenu)}
              className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-950/70 p-1.5 pr-2.5 hover:border-slate-700 hover:bg-slate-900 transition-all text-left"
              title="Kitiho raha hanova ny Page Facebook miasa"
            >
              <img
                src={page.avatar_url}
                alt={page.page_name}
                className="h-8 w-8 rounded-full border border-blue-500/40 object-cover shrink-0"
              />
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-100 max-w-[140px] truncate">
                    {page.page_name}
                  </span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      page.status === 'CONNECTED' ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-amber-500'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {page.is_real_page ? (
                    <span className="rounded bg-blue-500/20 px-1.5 py-0.2 text-[9px] font-bold text-blue-400">
                      Page Réelle Meta
                    </span>
                  ) : (
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-amber-300">
                      Démo
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono">ID: {page.page_id.slice(-6)}</span>
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
            </button>

            {/* Page Dropdown Menu */}
            {showPageMenu && (
              <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-slate-800 bg-slate-900/98 p-2 shadow-2xl backdrop-blur-xl z-50">
                <div className="px-2.5 py-1.5 border-b border-slate-800/80 mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Pages Facebook voarakitra
                  </span>
                  <button
                    onClick={() => {
                      setShowPageMenu(false);
                      onNavigate('facebook');
                    }}
                    className="text-[10px] font-semibold text-blue-400 hover:text-blue-300"
                  >
                    + Hitantana
                  </button>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {pages.map((p) => {
                    const isSelected = p.id === page.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          if (onSelectPage) onSelectPage(p.id);
                          setShowPageMenu(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 rounded-xl p-2 text-left transition-all ${
                          isSelected
                            ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                            : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={p.avatar_url}
                            alt={p.page_name}
                            className="h-7 w-7 rounded-full object-cover shrink-0 border border-slate-700"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate text-white">{p.page_name}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {p.is_real_page ? 'Page Réelle Meta' : 'Page Démo'} • ID: {p.page_id}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="shrink-0 rounded-full bg-blue-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                            Actif
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setShowPageMenu(false);
                      onNavigate('facebook');
                    }}
                    className="w-full text-center py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-bold text-xs transition-all"
                  >
                    Ampifandraiso ny Page Meta Réelle-nao →
                  </button>
                </div>
              </div>
            )}
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

        {/* Firebase Firestore Indicator */}
        <div
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/20 px-2.5 py-1 text-[11px] font-semibold text-amber-300"
          title="Base de données Firebase Firestore active et connectée"
        >
          <Flame className="h-3.5 w-3.5 text-amber-400" />
          <span>Firestore</span>
        </div>

        {/* Facebook Login Action Button */}
        <button
          onClick={onOpenFacebookLogin ? onOpenFacebookLogin : () => onNavigate('facebook')}
          className="flex items-center gap-1.5 rounded-lg bg-[#1877F2] hover:bg-[#166fe5] px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-blue-600/30 transition-all active:scale-95"
          title="Se connecter avec Facebook / Meta OAuth"
        >
          <Facebook className="h-3.5 w-3.5 fill-white" />
          <span className="hidden sm:inline">Facebook Login</span>
          <span className="sm:hidden">Login</span>
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
