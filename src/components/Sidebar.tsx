import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  ShoppingBag,
  Calendar,
  Sparkles,
  ShieldCheck,
  Bot,
  Key,
  Bell,
  Facebook,
  PlayCircle,
  LogOut,
  ChevronRight,
  Sliders,
} from 'lucide-react';
import { FacebookPage } from '../types.js';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  page: FacebookPage | null;
  unreadCount?: number;
  pendingOrdersCount?: number;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  badge?: number | string;
  badgeColor?: string;
  tag?: string;
  highlight?: boolean;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  page,
  unreadCount = 0,
  pendingOrdersCount = 0,
}) => {
  const menuGroups: MenuGroup[] = [
    {
      title: 'PRINCIPAL',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        {
          id: 'conversations',
          label: 'Conversations',
          icon: MessageSquare,
          badge: unreadCount > 0 ? unreadCount : undefined,
          badgeColor: 'bg-blue-500',
        },
        { id: 'products', label: 'Produits', icon: Package },
        {
          id: 'orders',
          label: 'Commandes',
          icon: ShoppingBag,
          badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
          badgeColor: 'bg-emerald-500',
        },
      ],
    },
    {
      title: 'PUBLICATIONS & MARKETING',
      items: [
        { id: 'scheduled-posts', label: 'Programmation', icon: Calendar },
        { id: 'auto-post', label: 'Auto-Post IA', icon: Sparkles, tag: 'IA' },
        { id: 'moderation', label: 'Modération IA', icon: ShieldCheck, tag: 'Filtre' },
      ],
    },
    {
      title: 'INTELLIGENCE ARTIFICIELLE',
      items: [
        { id: 'assistant-settings', label: 'Paramètres IA', icon: Bot },
        { id: 'api-keys', label: 'API IA (Rotation)', icon: Key, tag: '5 Slots' },
      ],
    },
    {
      title: 'SYSTÈME & CONNEXION',
      items: [
        { id: 'system-config', label: 'Configuration Clés & Site', icon: Key, tag: 'En direct' },
        { id: 'notifications', label: 'Notifications & Opérateur', icon: Bell },
        { id: 'facebook', label: 'Facebook & Webhooks', icon: Facebook },
      ],
    },
  ];

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-950 text-slate-300">
      {/* Brand Header */}
      <div className="flex items-center gap-3 border-b border-slate-800/80 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
          <Bot className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-sm font-black tracking-tight text-white">ASSISTANTE VIRTUELLE</h1>
          <p className="text-[11px] font-medium text-blue-400">Meta AI Platform • v2.6</p>
        </div>
      </div>

      {/* Page Profile Card */}
      {page && (
        <div className="mx-3 my-3 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
          <div className="flex items-center gap-2.5">
            <img
              src={page.avatar_url}
              alt={page.page_name}
              className="h-8 w-8 rounded-lg object-cover ring-1 ring-blue-500/30"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{page.page_name}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Page Connectée</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {menuGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-1.5 px-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    onClick={() => onNavigate(item.id)}
                    className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 font-semibold ring-1 ring-blue-500/30'
                        : item.highlight
                        ? 'text-indigo-300 hover:bg-indigo-950/40 hover:text-white'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 transition-colors ${
                          isActive
                            ? 'text-blue-400'
                            : item.highlight
                            ? 'text-indigo-400'
                            : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.badge !== undefined && (
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold text-white ${item.badgeColor || 'bg-blue-600'}`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {item.tag && (
                        <span className="rounded bg-slate-800 px-1 py-0.2 text-[9px] font-semibold text-slate-400">
                          {item.tag}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Logout */}
      <div className="border-t border-slate-800/80 p-3">
        <button
          onClick={() => onNavigate('facebook')}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs text-slate-400 transition-colors hover:bg-red-950/30 hover:text-red-300"
        >
          <div className="flex items-center gap-2.5">
            <LogOut className="h-4 w-4" />
            <span>Déconnexion / Déconnecter Page</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
};
