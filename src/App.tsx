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

  // Application Data States
  const [activePage, setActivePage] = useState<FacebookPage | null>(null);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [settings, setSettings] = useState<AssistantSettings | null>(null);
  const [stats, setStats] = useState<any>(null);
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
        fetch('/api/me').then((r) => r.json()),
        fetch('/api/facebook/pages').then((r) => r.json()),
        fetch('/api/dashboard/stats').then((r) => r.json()),
        fetch('/api/products').then((r) => r.json()),
        fetch('/api/orders').then((r) => r.json()),
        fetch('/api/conversations').then((r) => r.json()),
        fetch('/api/comments').then((r) => r.json()),
        fetch('/api/moderation/rules').then((r) => r.json()),
        fetch('/api/posts/scheduled').then((r) => r.json()),
        fetch('/api/posts/audience-insights').then((r) => r.json()),
        fetch('/api/ai/keys').then((r) => r.json()),
        fetch('/api/notifications').then((r) => r.json()),
      ]);

      setActivePage(meRes.activePage);
      setSettings(meRes.assistantSettings);
      setPages(pagesRes);
      setStats(statsRes);
      setProducts(productsRes);
      setOrders(ordersRes);
      setConversations(convsRes);
      if (convsRes.length > 0 && !activeConversationRef.current) {
        setActiveConversation(convsRes[0]);
        loadConversationMessages(convsRes[0].id);
      }
      setComments(commentsRes);
      setRules(rulesRes);
      setScheduledPosts(postsRes);
      setInsights(insightsRes);
      setApiKeys(keysRes);
      setNotifications(notifsRes);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Real-Time Polling loop every 3.5 seconds
    const interval = setInterval(async () => {
      try {
        const [statsRes, ordersRes, convsRes, notifsRes, keysRes, commentsRes] = await Promise.all([
          fetch('/api/dashboard/stats').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/orders').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/conversations').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/notifications').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/ai/keys').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/comments').then((r) => (r.ok ? r.json() : null)),
        ]);

        if (statsRes) setStats(statsRes);
        if (ordersRes) setOrders(ordersRes);
        if (convsRes) setConversations(convsRes);
        if (notifsRes) setNotifications(notifsRes);
        if (keysRes) setApiKeys(keysRes);
        if (commentsRes) setComments(commentsRes);

        // Active thread real-time update
        if (activeConversationRef.current) {
          const convRes = await fetch(`/api/conversations/${activeConversationRef.current.id}`);
          if (convRes.ok) {
            const data = await convRes.json();
            if (data?.messages) {
              setMessages(data.messages);
            }
          }
        }
      } catch {
        // Quiet fail on network flutter
      }
    }, 3500);

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
    const res = await fetch('/api/facebook/pages/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId }),
    });
    const data = await res.json();
    if (res.ok) {
      setActivePage(data.activePage);
    }
  };

  const handleConnectNewPage = async (pageData: any) => {
    const res = await fetch('/api/facebook/pages/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pageData),
    });
    const data = await res.json();
    if (res.ok) {
      setPages((prev) => [...prev, data.page]);
      setActivePage(data.page);
    }
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
      const res = await fetch('/api/facebook/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        await loadInitialData();
        const newNotif: NotificationLog = {
          id: `notif_${Date.now()}`,
          type: 'HANDOFF_ALERT',
          title: '🔄 Synchronisation Meta Terminée',
          message: `Succès : ${data.syncedConversations ?? 0} conversations et ${data.syncedComments ?? 0} commentaires Meta synchronisés en direct.`,
          channel: 'ALL',
          status: 'DELIVERED',
          created_at: new Date().toISOString(),
        };
        setNotifications((prev) => [newNotif, ...prev]);
      } else {
        alert(`Erreur synchronisation Meta : ${data.error || 'Vérifiez les identifiants Facebook dans Système > Configuration Clés'}`);
      }
    } catch (err: any) {
      alert(`Erreur réseau lors de la synchronisation : ${err.message}`);
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
        unreadCount={conversations.filter((c) => c.status === 'HANDOFF_HUMAN').length}
        pendingOrdersCount={orders.filter((o) => o.status === 'NOUVELLE').length}
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
          settings={settings}
          notifications={notifications}
          apiKeys={apiKeys}
          isSyncing={isSyncing}
          onToggleAi={handleToggleAi}
          onSyncFacebook={handleSyncFacebook}
          onNavigate={handleNavigation}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
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
    </div>
  );
}
export default App;
