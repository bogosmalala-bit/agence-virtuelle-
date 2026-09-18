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
  LogOut,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { FacebookPage } from '../types.js';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  page: FacebookPage | null;
  unreadCount?: number;
  pendingOrdersCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
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
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
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
        { id: 'system-config', label: 'Configuration Clés & Site', icon: Key, tag: 'Direct' },
        { id: 'notifications', label: 'Notifications & Opérateur', icon: Bell },
        { id: 'facebook', label: 'Facebook & Webhooks', icon: Facebook },
      ],
    },
  ];

  const handleItemClick = (id: string) => {
    onNavigate(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <aside
      className={`flex h-screen flex-col border-r border-slate-800 bg-slate-950 text-slate-300 transition-all duration-300 ease-in-out select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div
        className={`flex items-center border-b border-slate-800/80 py-4 ${
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        <div
          onClick={() => onNavigate('dashboard')}
          className="flex cursor-pointer items-center gap-3 overflow-hidden"
          title="ASSISTANTE VIRTUELLE"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
            <Bot className="h-6 w-6" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 transition-opacity duration-200">
              <h1 className="text-xs font-black tracking-tight text-white truncate">
                ASSISTANTE VIRTUELLE
              </h1>
              <p className="text-[10px] font-medium text-blue-400 truncate">
                Meta AI Platform • v2.6
              </p>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle Button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`hidden md:flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white ${
              isCollapsed ? 'mt-2' : ''
            }`}
            title={isCollapsed ? 'Agrandir la barre latérale (Halalahana)' : 'Réduire la barre latérale (Aforitra)'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4 text-blue-400" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="flex md:hidden h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Page Profile Card */}
      {page && (
        <div className={`mx-2 my-2.5 rounded-xl border border-slate-800/80 bg-slate-900/60 p-2.5 ${isCollapsed ? 'text-center' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
            <div className="relative shrink-0">
              <img
                src={page.avatar_url}
                alt={page.page_name}
                className="h-8 w-8 rounded-lg object-cover ring-1 ring-blue-500/30"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{page.page_name}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span>Page Connectée</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4 custom-scrollbar">
        {menuGroups.map((group) => (
          <div key={group.title}>
            {!isCollapsed ? (
              <p className="mb-1 px-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                {group.title}
              </p>
            ) : (
              <div className="my-2 border-t border-slate-800/60" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    onClick={() => handleItemClick(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`group relative flex w-full items-center rounded-xl transition-all ${
                      isCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-2'
                    } ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 font-semibold ring-1 ring-blue-500/30 shadow-sm'
                        : item.highlight
                        ? 'text-indigo-300 hover:bg-indigo-950/40 hover:text-white'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-blue-400'
                            : item.highlight
                            ? 'text-indigo-400'
                            : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                      />
                      {!isCollapsed && <span className="text-xs truncate">{item.label}</span>}
                    </div>

                    {!isCollapsed && (
                      <div className="flex items-center gap-1.5">
                        {item.badge !== undefined && (
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold text-white ${
                              item.badgeColor || 'bg-blue-600'
                            }`}
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
                    )}

                    {/* Collapsed Badge indicator */}
                    {isCollapsed && item.badge !== undefined && (
                      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-slate-950" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Toggle & Logout */}
      <div className="border-t border-slate-800/80 p-2 space-y-1">
        {/* Toggle Expand/Collapse in footer */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`hidden md:flex w-full items-center rounded-lg p-2 text-xs text-slate-400 transition-colors hover:bg-slate-900 hover:text-blue-400 ${
              isCollapsed ? 'justify-center' : 'justify-between px-2.5'
            }`}
            title={isCollapsed ? 'Agrandir (Halalahana)' : 'Réduire (Aforitra)'}
          >
            <div className="flex items-center gap-2">
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4 text-blue-400" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
              {!isCollapsed && <span>{isCollapsed ? 'Agrandir' : 'Réduire la barre'}</span>}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] text-slate-500 font-mono">
                Toggle
              </span>
            )}
          </button>
        )}

        {/* Facebook Link / Logout */}
        <button
          onClick={() => handleItemClick('facebook')}
          title={isCollapsed ? 'Pages & Connexion Facebook' : undefined}
          className={`flex w-full items-center rounded-lg p-2 text-xs text-slate-400 transition-colors hover:bg-red-950/30 hover:text-red-300 ${
            isCollapsed ? 'justify-center' : 'justify-between px-2.5'
          }`}
        >
          <div className="flex items-center gap-2">
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span className="truncate">Déconnexion Page</span>}
          </div>
          {!isCollapsed && <ChevronRight className="h-3.5 w-3.5" />}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Drawer with Backdrop */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          {/* Drawer content */}
          <div className="relative z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
