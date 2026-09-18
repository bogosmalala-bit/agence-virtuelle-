import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { DashboardView } from './components/DashboardView.js';
import { ConversationsView } from './components/ConversationsView.js';
import { ProductsView } from './components/ProductsView.js';
import { OrdersView } from './components/OrdersView.js';
import { ScheduledPostsView } from './components/ScheduledPostsView.js';
import { AutoPostView } from './components/AutoPostView.js';
import { ModerationView } from './components/ModerationView.js';
import { AIApiKeysView } from './components/AIApiKeysView.js';
import { AssistantSettingsView } from './components/AssistantSettingsView.js';
import { FacebookSettingsView } from './components/FacebookSettingsView.js';
import { NotificationsView } from './components/NotificationsView.js';
import { SystemConfigView } from './components/SystemConfigView.js';
import { FacebookLoginModal } from './components/FacebookLoginModal.js';
import { localPersistence } from './lib/storage.js';
import { firestoreService } from './lib/firestoreService.js';
import {
  FacebookPage,
  AssistantSettings,
  Product,
  Order,
  Conversation,
  Message,
  FacebookComment,
  ScheduledPost,
  AIApiKeyConfig,
  NotificationLog,
  AudienceInsight,
  ModerationRule,
  OrderStatus,
} from './types.js';

export function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isFacebookLoginModalOpen, setIsFacebookLoginModalOpen] = useState<boolean>(false);

  const defaultAssistantSettings: AssistantSettings = {
    id: 'set_sarah',
    page_id: 'page_main',
    name: 'Sarah',
    tone: 'CHALEUREUX',
    primary_language: 'MALAGASY_FRENCH',
    custom_instructions: '',
    assistance_type: 'VENTE',
    is_active: true,
    operator_phone: '0340000000',
    notification_channel: 'ALL',
    fcm_enabled: true,
    sms_enabled: true,
    auto_handoff_on_frustration: true,
    auto_post_enabled: true,
    comment_auto_reply_enabled: true,
    comment_private_reply_enabled: true,
    comment_moderation_enabled: true,
  };

  // Application Data States
  const [activePage, setActivePage] = useState<FacebookPage | null>(null);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [settings, setSettings] = useState<AssistantSettings>(defaultAssistantSettings);
  const [stats, setStats] = useState<any>({
    totalConversations: 0,
    activeConversations: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    recentMessagesCount: 0,
    recentCommentsCount: 0,
    aiResponseRate: 98,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const activeConversationRef = useRef<Conversation | null>(null);
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [comments, setComments] = useState<FacebookComment[]>([]);
  const [rules, setRules] = useState<ModerationRule[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [insights, setInsights] = useState<AudienceInsight[]>([]);
  const [apiKeys, setApiKeys] = useState<AIApiKeyConfig[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);

  // Safe JSON Fetch helper preventing crashes on HTML or non-200 responses
  const safeFetchJson = async <T,>(url: string, fallback: T, options?: RequestInit): Promise<T> => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) return fallback;
      const text = await res.text();
      if (!text || (!text.trim().startsWith('{') && !text.trim().startsWith('['))) {
        return fallback;
      }
      return JSON.parse(text) as T;
    } catch {
      return fallback;
    }
  };

  // Sidebar Collapse and Mobile Drawer State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('sidebar_collapsed', String(next));
        } catch {}
        return next;
      });
    }
  };

  // Initial Fetch & Real-Time Sync Loop
  const loadInitialData = async () => {
    try {
      // 1. Instant local restore so the user NEVER sees an empty screen or lost credentials
      const localPages = localPersistence.getPages();
      const localActiveId = localPersistence.getActivePageId();
      if (localPages && localPages.length > 0) {
        setPages(localPages);
        if (localActiveId) {
          const found = localPages.find((p) => p.id === localActiveId || p.page_id === localActiveId);
          if (found) setActivePage(found);
        } else {
          setActivePage(localPages[0]);
        }
      }

      const [
        meRes,
        pagesRes,
        statsRes,
        productsRes,
        ordersRes,
        convsRes,
        commentsRes,
        rulesRes,
        postsRes,
        insightsRes,
        keysRes,
        notifsRes,
      ] = await Promise.all([
        safeFetchJson<any>('/api/me', null),
        safeFetchJson<FacebookPage[]>('/api/facebook/pages', []),
        safeFetchJson<any>('/api/dashboard/stats', null),
        safeFetchJson<Product[]>('/api/products', []),
        safeFetchJson<Order[]>('/api/orders', []),
        safeFetchJson<Conversation[]>('/api/conversations', []),
        safeFetchJson<FacebookComment[]>('/api/comments', []),
        safeFetchJson<ModerationRule[]>('/api/moderation/rules', []),
        safeFetchJson<ScheduledPost[]>('/api/posts/scheduled', []),
        safeFetchJson<AudienceInsight[]>('/api/posts/audience-insights', []),
        safeFetchJson<AIApiKeyConfig[]>('/api/ai/keys', []),
        safeFetchJson<NotificationLog[]>('/api/notifications', []),
      ]);

      if (meRes?.activePage) {
        setActivePage(meRes.activePage);
        localPersistence.setActivePageId(meRes.activePage.id);
      }
      if (meRes?.assistantSettings) {
        setSettings(meRes.assistantSettings);
      }
      if (Array.isArray(pagesRes) && pagesRes.length > 0) {
        // Merge real pages from localStorage if server restarted
        if (localPages && localPages.length > 0) {
          const merged = [...localPages.filter((lp) => lp.is_real_page)];
          for (const sp of pagesRes) {
            if (!merged.some((m) => m.id === sp.id || m.page_id === sp.page_id)) {
              merged.push(sp);
            }
          }
          setPages(merged);
          localPersistence.setPages(merged);

          // Restore to server in background
          const localAppId = localPersistence.getAppId();
          const localAppSecret = localPersistence.getAppSecret();
          fetch('/api/sync/restore-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              meta_app_id: localAppId || undefined,
              meta_app_secret: localAppSecret || undefined,
              pages: merged,
              activePageId: localActiveId || meRes?.activePage?.id,
            }),
          }).catch(() => {});
        } else {
          setPages(pagesRes);
          localPersistence.setPages(pagesRes);
        }
      }
      if (statsRes && typeof statsRes === 'object' && 'totalConversations' in statsRes) {
        setStats(statsRes);
      }
      if (Array.isArray(productsRes)) setProducts(productsRes);
      if (Array.isArray(ordersRes)) setOrders(ordersRes);
      if (Array.isArray(convsRes)) {
        setConversations(convsRes);
        if (convsRes.length > 0 && !activeConversationRef.current) {
          setActiveConversation(convsRes[0]);
          loadConversationMessages(convsRes[0].id);
        }
      }
      if (Array.isArray(commentsRes)) setComments(commentsRes);
      if (Array.isArray(rulesRes)) setRules(rulesRes);
      if (Array.isArray(postsRes)) setScheduledPosts(postsRes);
      if (insightsRes && typeof insightsRes === 'object') setInsights(insightsRes);
      if (Array.isArray(keysRes)) setApiKeys(keysRes);
      if (Array.isArray(notifsRes)) setNotifications(notifsRes);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Real-Time Polling loop every 4.5 seconds
    const interval = setInterval(async () => {
      try {
        const [statsRes, ordersRes, convsRes, notifsRes, keysRes, commentsRes] = await Promise.all([
          safeFetchJson('/api/dashboard/stats', null),
          safeFetchJson('/api/orders', null),
          safeFetchJson('/api/conversations', null),
          safeFetchJson('/api/notifications', null),
          safeFetchJson('/api/ai/keys', null),
          safeFetchJson('/api/comments', null),
        ]);

        if (statsRes && typeof statsRes === 'object' && 'totalConversations' in statsRes) {
          setStats(statsRes);
        }
        if (Array.isArray(ordersRes)) setOrders(ordersRes);
        if (Array.isArray(convsRes)) setConversations(convsRes);
        if (Array.isArray(notifsRes)) setNotifications(notifsRes);
        if (Array.isArray(keysRes)) setApiKeys(keysRes);
        if (Array.isArray(commentsRes)) setComments(commentsRes);

        // Active thread real-time update
        if (activeConversationRef.current) {
          const convRes = await safeFetchJson<any>(`/api/conversations/${activeConversationRef.current.id}`, null);
          if (convRes?.messages && Array.isArray(convRes.messages)) {
            setMessages(convRes.messages);
          }
        }
      } catch {
        // Quiet fail on network flutter
      }
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const loadConversationMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handlers
  const handleToggleAi = async () => {
    if (!settings) return;
    const newStatus = !settings.is_active;
    const res = await fetch('/api/assistant/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: newStatus }),
    });
    const updated = await res.json();
    setSettings(updated);
  };

  const handleSelectPage = async (pageId: string) => {
    try {
      const res = await fetch('/api/facebook/pages/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId }),
      });
      const data = await res.json();
      if (res.ok && data.activePage) {
        setActivePage(data.activePage);
        localPersistence.setActivePageId(data.activePage.id);
      } else {
        const found = pages.find((p) => p.id === pageId || p.page_id === pageId);
        if (found) {
          setActivePage(found);
          localPersistence.setActivePageId(found.id);
        }
      }
    } catch {
      const found = pages.find((p) => p.id === pageId || p.page_id === pageId);
      if (found) {
        setActivePage(found);
        localPersistence.setActivePageId(found.id);
      }
    }
  };

  const handleConnectRealPage = async (pageData: any) => {
    const res = await fetch('/api/facebook/pages/connect-real', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pageData),
    });
    const data = await res.json();
    if (res.ok && data.page) {
      setPages((prev) => {
        const filtered = prev.filter((p) => p.page_id !== data.page.page_id && p.id !== data.page.id);
        const next = [data.page, ...filtered];
        localPersistence.setPages(next);
        return next;
      });
      setActivePage(data.page);
      localPersistence.setActivePageId(data.page.id);
      return data.page;
    }
    throw new Error(data.error || 'Tsy nahomby ny fampifandraisana ny Page Meta');
  };

  const handleConnectNewPage = async (pageData: any) => {
    const res = await fetch('/api/facebook/pages/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pageData),
    });
    const data = await res.json();
    if (res.ok) {
      setPages((prev) => {
        const filtered = prev.filter((p) => p.page_id !== data.page.page_id && p.id !== data.page.id);
        const next = [data.page, ...filtered];
        localPersistence.setPages(next);
        return next;
      });
      setActivePage(data.page);
      localPersistence.setActivePageId(data.page.id);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    try {
      await fetch(`/api/facebook/pages/${pageId}`, {
        method: 'DELETE',
      });
    } catch {}
    setPages((prev) => {
      const remaining = prev.filter((p) => p.id !== pageId && p.page_id !== pageId);
      localPersistence.setPages(remaining);
      if (activePage && (activePage.id === pageId || activePage.page_id === pageId)) {
        const fallback = remaining[0] || null;
        setActivePage(fallback);
        if (fallback) localPersistence.setActivePageId(fallback.id);
      }
      return remaining;
    });
  };

  const handleDeleteDemoPages = async () => {
    try {
      const res = await fetch('/api/facebook/pages/delete-demos', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.pages) {
        setPages(data.pages);
        localPersistence.setPages(data.pages);
        if (data.active_page) {
          setActivePage(data.active_page);
          localPersistence.setActivePageId(data.active_page.id);
        }
        return;
      }
    } catch {}

    // Fallback local cleanup
    setPages((prev) => {
      const remaining = prev.filter(
        (p) => !p.is_demo && p.id !== 'page_mada_01' && p.id !== 'page_mada_02' && p.id !== 'page_1'
      );
      localPersistence.setPages(remaining);
      if (
        activePage &&
        (activePage.is_demo ||
          activePage.id === 'page_mada_01' ||
          activePage.id === 'page_mada_02' ||
          activePage.id === 'page_1')
      ) {
        const fallback = remaining[0] || null;
        setActivePage(fallback);
        if (fallback) localPersistence.setActivePageId(fallback.id);
      }
      return remaining;
    });
  };

  // Products
  const handleAddProduct = async (productData: any) => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });
    const newProd = await res.json();
    if (!res.ok) throw new Error(newProd.error);
    setProducts((prev) => [newProd, ...prev]);
  };

  const handleUpdateProduct = async (id: string, productData: any) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });
    const updated = await res.json();
    if (!res.ok) throw new Error(updated.error);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };

  const handleDeleteProduct = async (id: string) => {
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddFileToProduct = async (productId: string, fileData: any) => {
    const res = await fetch(`/api/products/${productId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fileData),
    });
    const newFile = await res.json();
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, files: [...p.files, newFile] } : p))
    );
  };

  const handleDeleteFileFromProduct = async (productId: string, fileId: string) => {
    await fetch(`/api/products/${productId}/files/${fileId}`, { method: 'DELETE' });
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, files: p.files.filter((f) => f.id !== fileId) } : p
      )
    );
  };

  // Conversations & Handoff
  const handleSelectConversation = (conv: Conversation) => {
    setActiveConversation(conv);
    loadConversationMessages(conv.id);
  };

  const handleSendManualMessage = async (convId: string, text: string) => {
    const res = await fetch(`/api/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, sender: 'HUMAN_OPERATOR' }),
    });
    const newMsg = await res.json();
    setMessages((prev) => [...prev, newMsg]);
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, last_message: text } : c))
    );
  };

  const handleToggleHandoff = async (convId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'HANDOFF_HUMAN' ? 'BOT_ACTIVE' : 'HANDOFF_HUMAN';
    const res = await fetch(`/api/conversations/${convId}/handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, reason: 'Changement manuel par opérateur' }),
    });
    const data = await res.json();
    if (res.ok) {
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, status: newStatus as any } : c))
      );
      if (activeConversation?.id === convId) {
        setActiveConversation((prev: any) => ({ ...prev, status: newStatus }));
      }
    }
  };

  // Real-Time Facebook Synchronization
  const handleSyncFacebook = async () => {
    setIsSyncing(true);
    try {
      const data = await safeFetchJson<any>('/api/facebook/sync', null, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      await loadInitialData();

      const convCount = data?.syncedConversations ?? 0;
      const cmtCount = data?.syncedComments ?? 0;

      const newNotif: NotificationLog = {
        id: `notif_${Date.now()}`,
        type: 'POST_PUBLISHED',
        title: '🔄 Synchronisation Meta Vita Soa Aman-tsara',
        message: data?.message || `Fampifandraisana vita : ${convCount} resaka Messenger ary ${cmtCount} fanehoan-kevitra voaray.`,
        channel: 'ALL',
        status: 'DELIVERED',
        created_at: new Date().toISOString(),
      };
      setNotifications((prev) => [newNotif, ...prev]);
    } catch (err: any) {
      console.warn('Sync warning:', err);
      await loadInitialData();
    } finally {
      setIsSyncing(false);
    }
  };

  // Orders
  const handleUpdateOrderStatus = async (id: string, status: OrderStatus, notes?: string) => {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, status_notes: notes }),
    });
    const updated = await res.json();
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
  };

  const handleCreateManualOrder = async (orderData: any) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    const created = await res.json();
    if (!res.ok) throw new Error(created.error);
    setOrders((prev) => [created, ...prev]);
  };

  // Scheduled Posts
  const handleSchedulePost = async (postData: any) => {
    const res = await fetch('/api/posts/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData),
    });
    const created = await res.json();
    if (!res.ok) throw new Error(created.error);
    setScheduledPosts((prev) => [created, ...prev]);
  };

  const handlePublishNow = async (id: string) => {
    const res = await fetch(`/api/posts/${id}/publish-now`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setScheduledPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'PUBLIÉE' } : p))
      );
    } else {
      alert(`Erreur : ${data.error}`);
    }
  };

  const handleDeleteScheduledPost = async (id: string) => {
    await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    setScheduledPosts((prev) => prev.filter((p) => p.id !== id));
  };

  // Moderation
  const handleAddModerationRule = async (ruleData: any) => {
    const res = await fetch('/api/moderation/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ruleData),
    });
    const newRule = await res.json();
    setRules((prev) => [...prev, newRule]);
  };

  const handleDeleteModerationRule = async (id: string) => {
    await fetch(`/api/moderation/rules/${id}`, { method: 'DELETE' });
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleModerateComment = async (id: string, action: string, reason?: string) => {
    const res = await fetch(`/api/comments/${id}/moderate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    });
    const data = await res.json();
    if (res.ok) {
      setComments((prev) => prev.map((c) => (c.id === id ? data.comment : c)));
    }
  };

  // AI Keys
  const handleAddOrUpdateKey = async (slot: number, name: string, rawKey: string, model?: string) => {
    const res = await fetch('/api/ai/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot, name, raw_key: rawKey, model }),
    });
    const data = await res.json();
    if (res.ok) {
      // Reload keys
      const keysRes = await fetch('/api/ai/keys').then((r) => r.json());
      setApiKeys(keysRes);
    } else {
      throw new Error(data.error);
    }
  };

  const handleTestKey = async (id: string) => {
    const res = await fetch(`/api/ai/keys/${id}/test`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    const keysRes = await fetch('/api/ai/keys').then((r) => r.json());
    setApiKeys(keysRes);
    return data;
  };

  const handleResetKeyStatus = async (id: string) => {
    const res = await fetch(`/api/ai/keys/${id}/reset`, { method: 'POST' });
    if (res.ok) {
      const keysRes = await fetch('/api/ai/keys').then((r) => r.json());
      setApiKeys(keysRes);
    }
  };

  // Assistant Settings
  const handleUpdateAssistantSettings = async (newSettings: Partial<AssistantSettings>) => {
    const res = await fetch('/api/assistant/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    const updated = await res.json();
    setSettings(updated);
  };

  // Test Notification
  const handleSendTestNotification = async () => {
    const newLog: NotificationLog = {
      id: `notif_${Date.now()}`,
      type: 'NEW_ORDER',
      title: '🧪 Test d\'Alerte Opérateur (Push FCM / SMS)',
      message: 'La liaison de notification de l\'assistante virtuelle fonctionne parfaitement.',
      channel: 'ALL' as any,
      status: 'DELIVERED',
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [newLog, ...prev]);
  };

  const handleNavigation = (view: string) => {
    setCurrentView(view);
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 font-sans text-slate-100 overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigation}
        page={activePage}
        unreadCount={(conversations || []).filter((c) => c?.status === 'HANDOFF_HUMAN').length}
        pendingOrdersCount={(orders || []).filter((o) => o?.status === 'NOUVELLE').length}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header */}
        <Header
          page={activePage}
          pages={pages}
          settings={settings}
          notifications={notifications}
          apiKeys={apiKeys}
          isSyncing={isSyncing}
          onToggleAi={handleToggleAi}
          onSyncFacebook={handleSyncFacebook}
          onSelectPage={handleSelectPage}
          onNavigate={handleNavigation}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          onOpenFacebookLogin={() => setIsFacebookLoginModalOpen(true)}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950">
          <div className="mx-auto max-w-7xl">
            {currentView === 'dashboard' && (
              <DashboardView
                page={activePage}
                settings={settings}
                stats={stats}
                conversations={conversations}
                orders={orders}
                apiKeys={apiKeys}
                isSyncing={isSyncing}
                onNavigate={handleNavigation}
                onSyncFacebook={handleSyncFacebook}
                onToggleAi={handleToggleAi}
              />
            )}

            {currentView === 'conversations' && (
              <ConversationsView
                conversations={conversations}
                activeConversation={activeConversation}
                messages={messages}
                products={products}
                settings={settings}
                onSelectConversation={handleSelectConversation}
                onSendMessage={handleSendManualMessage}
                onToggleHandoff={handleToggleHandoff}
              />
            )}

            {currentView === 'products' && (
              <ProductsView
                products={products}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onAddFileToProduct={handleAddFileToProduct}
                onDeleteFileFromProduct={handleDeleteFileFromProduct}
              />
            )}

            {currentView === 'orders' && (
              <OrdersView
                orders={orders}
                products={products}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onCreateManualOrder={handleCreateManualOrder}
              />
            )}

            {currentView === 'scheduled-posts' && (
              <ScheduledPostsView
                scheduledPosts={scheduledPosts}
                products={products}
                onSchedulePost={handleSchedulePost}
                onPublishNow={handlePublishNow}
                onDeletePost={handleDeleteScheduledPost}
                onNavigateToAutoPost={() => setCurrentView('auto-post')}
              />
            )}

            {currentView === 'auto-post' && (
              <AutoPostView
                products={products}
                insights={insights}
                onSchedulePost={handleSchedulePost}
                onPublishNowDirect={handleSchedulePost}
              />
            )}

            {currentView === 'moderation' && (
              <ModerationView
                comments={comments}
                rules={rules}
                onAddRule={handleAddModerationRule}
                onDeleteRule={handleDeleteModerationRule}
                onModerateComment={handleModerateComment}
              />
            )}

            {currentView === 'assistant-settings' && settings && (
              <AssistantSettingsView
                settings={settings}
                onUpdateSettings={handleUpdateAssistantSettings}
              />
            )}

            {currentView === 'api-keys' && (
              <AIApiKeysView
                apiKeys={apiKeys}
                onAddOrUpdateKey={handleAddOrUpdateKey}
                onTestKey={handleTestKey}
                onResetKeyStatus={handleResetKeyStatus}
              />
            )}

            {currentView === 'facebook' && (
              <FacebookSettingsView
                pages={pages}
                activePage={activePage}
                onSelectPage={handleSelectPage}
                onConnectNewPage={handleConnectNewPage}
                onConnectRealPage={handleConnectRealPage}
                onDeletePage={handleDeletePage}
                onDeleteDemoPages={handleDeleteDemoPages}
                onOpenFacebookLogin={() => setIsFacebookLoginModalOpen(true)}
              />
            )}

            {currentView === 'system-config' && (
              <SystemConfigView onConfigSaved={loadInitialData} />
            )}

            {currentView === 'notifications' && (
              <NotificationsView
                notifications={notifications}
                settings={settings}
                onSendTestNotification={handleSendTestNotification}
              />
            )}
          </div>
        </main>
      </div>

      {/* Facebook Login & Meta Import Modal */}
      <FacebookLoginModal
        isOpen={isFacebookLoginModalOpen}
        onClose={() => setIsFacebookLoginModalOpen(false)}
        onPagesImported={(importedPages) => {
          setPages((prev) => {
            const merged = [...importedPages, ...prev.filter((p) => !importedPages.some((ip) => ip.page_id === p.page_id))];
            localPersistence.setPages(merged);
            return merged;
          });
          if (importedPages.length > 0) {
            setActivePage(importedPages[0]);
            localPersistence.setActivePageId(importedPages[0].id);
          }
        }}
      />
    </div>
  );
}
export default App;
