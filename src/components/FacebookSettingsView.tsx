import React, { useState, useEffect } from 'react';
import {
  Facebook,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  ShieldCheck,
  Zap,
  Globe,
  Plus,
  Key,
  FileText,
  Lock,
  Share2,
  Sparkles,
  Info,
  Trash2,
  Flame,
  Activity,
  Send,
  Terminal,
  Cpu,
  Wifi,
  XCircle,
  Check,
} from 'lucide-react';
import { FacebookPage } from '../types.js';
import { localPersistence } from '../lib/storage.js';

interface FacebookSettingsViewProps {
  pages: FacebookPage[];
  activePage: FacebookPage | null;
  onSelectPage: (pageId: string) => Promise<void>;
  onConnectNewPage: (pageData: any) => Promise<void>;
  onConnectRealPage?: (pageData: any) => Promise<any>;
  onDeletePage?: (pageId: string) => Promise<void>;
  onDeleteDemoPages?: () => Promise<void>;
  onOpenFacebookLogin?: () => void;
}

export const FacebookSettingsView: React.FC<FacebookSettingsViewProps> = ({
  pages,
  activePage,
  onSelectPage,
  onConnectNewPage,
  onConnectRealPage,
  onDeletePage,
  onDeleteDemoPages,
  onOpenFacebookLogin,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [newPageId, setNewPageId] = useState('');
  const [newPageName, setNewPageName] = useState('');
  const [newPageToken, setNewPageToken] = useState('');
  const [newPageCat, setNewPageCat] = useState('Commerce & Vente');
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);
  const [isDeletingDemos, setIsDeletingDemos] = useState<boolean>(false);
  const [oauthReturnSuccess, setOauthReturnSuccess] = useState<string | null>(null);
  const [metaAppId, setMetaAppId] = useState<string>(() => localPersistence.getAppId());
  const [appIdInput, setAppIdInput] = useState<string>(() => localPersistence.getAppId());
  const [appSecretInput, setAppSecretInput] = useState<string>(() => localPersistence.getAppSecret());
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [isSavingAppConfig, setIsSavingAppConfig] = useState<boolean>(false);
  const [appConfigStatus, setAppConfigStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<'vercel' | 'current' | 'custom'>('vercel');
  const [customDomainInput, setCustomDomainInput] = useState<string>('https://agence-virtuelle.vercel.app');

  // Diagnostic & Live Messenger Test Suite State
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [isRunningDiag, setIsRunningDiag] = useState<boolean>(false);
  const [isSubscribingWebhook, setIsSubscribingWebhook] = useState<boolean>(false);
  const [subscribeStatus, setSubscribeStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testRecipientId, setTestRecipientId] = useState<string>('');
  const [testMessageText, setTestMessageText] = useState<string>('');
  const [isSendingTestMsg, setIsSendingTestMsg] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://agence-virtuelle.vercel.app';
  
  const effectiveOrigin = selectedDomain === 'vercel'
    ? 'https://agence-virtuelle.vercel.app'
    : selectedDomain === 'current'
    ? currentOrigin
    : (customDomainInput.trim() || 'https://agence-virtuelle.vercel.app');

  let effectiveHost = 'agence-virtuelle.vercel.app';
  try {
    effectiveHost = new URL(effectiveOrigin).hostname;
  } catch {}

  // Firebase Built-in OAuth Handler (Already authorized in Firebase!)
  const firebaseAuthHandlerUri = 'https://project-223f4dee-65dd-4c9e-8cc.firebaseapp.com/__/auth/handler';

  // Meta Developer Required URLs computed with effective domain
  const popupCallbackUri = `${effectiveOrigin}/oauth-popup-callback.html`;
  const oauthRedirectUri = `${effectiveOrigin}/api/auth/facebook/callback`;
  const oauthRedirectUriAlt = `${effectiveOrigin}/auth/facebook/callback`;
  const siteUrl = `${effectiveOrigin}/`;
  const privacyPolicyUrl = `${effectiveOrigin}/privacy-policy`;
  const termsUrl = `${effectiveOrigin}/terms`;
  const dataDeletionCallbackUrl = `${effectiveOrigin}/api/facebook/data-deletion`;
  const dataDeletionInstructionsUrl = `${effectiveOrigin}/data-deletion`;
  const deauthorizeCallbackUrl = `${effectiveOrigin}/api/facebook/deauthorize`;
  const webhookUrl = `${effectiveOrigin}/api/webhooks/facebook`;
  const verifyToken = 'assistante_virtuelle_webhook_verify_token';

  const requiredScopes = [
    'pages_messaging',
    'pages_manage_metadata',
    'pages_read_engagement',
    'pages_manage_posts',
    'pages_read_user_content',
    'public_profile',
    'email',
  ];

  useEffect(() => {
    // 1. Detect OAuth return from Meta
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('meta_connected') === 'true') {
        const pName = params.get('page_name') || 'Page Facebook';
        setOauthReturnSuccess(`Tafiditra soa aman-tsara ny Page Meta "${pName}" !`);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    // 2. Load from localStorage first so user never loses credentials
    const savedAppId = localPersistence.getAppId();
    const savedAppSecret = localPersistence.getAppSecret();
    if (savedAppId) {
      setMetaAppId(savedAppId);
      setAppIdInput(savedAppId);
    }
    if (savedAppSecret) {
      setAppSecretInput(savedAppSecret);
    }

    // 3. Fetch from backend system config and sync
    fetch('/api/system/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          if (data.meta_app_id) {
            setMetaAppId(data.meta_app_id);
            setAppIdInput(data.meta_app_id);
            localPersistence.setAppId(data.meta_app_id);
          } else if (savedAppId) {
            // Re-sync savedAppId to server
            fetch('/api/system/config', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                meta_app_id: savedAppId,
                meta_app_secret: savedAppSecret || undefined,
              }),
            }).catch(() => {});
          }
          if (data.meta_app_secret) {
            setAppSecretInput(data.meta_app_secret);
            localPersistence.setAppSecret(data.meta_app_secret);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveAppConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = appIdInput.trim();
    if (!cleanId) {
      setAppConfigStatus({
        type: 'error',
        text: 'Azafady ampidiro ny laharana Identifiant de l’application (App ID).',
      });
      return;
    }

    // Facebook App IDs are strictly numeric and typically 15-16 digits
    const isDigitsOnly = /^\d+$/.test(cleanId);
    if (!isDigitsOnly || cleanId.length < 8) {
      setAppConfigStatus({
        type: 'error',
        text: 'Ny App ID Facebook dia tsy maintsy tarehimarika (chiffres) 15 na 16 isa avy ao amin\'ny developers.facebook.com.',
      });
      return;
    }

    setIsSavingAppConfig(true);
    setAppConfigStatus(null);
    try {
      const cleanSecret = appSecretInput.trim();
      // Store in localStorage immediately
      localPersistence.setAppId(cleanId);
      if (cleanSecret) {
        localPersistence.setAppSecret(cleanSecret);
      }

      const res = await fetch('/api/system/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meta_app_id: cleanId,
          meta_app_secret: cleanSecret || undefined,
        }),
      });

      if (res.ok) {
        setMetaAppId(cleanId);
        setAppConfigStatus({
          type: 'success',
          text: `Voatahiry soa aman-tsara ny App ID (${cleanId}) sy ny App Secret ! Tsy hiala intsony na averina velomina aza ny pejy.`,
        });
        setTimeout(() => setAppConfigStatus(null), 5000);
      } else {
        setAppConfigStatus({
          type: 'error',
          text: 'Nisy olana teo am-pitehirizana. Andramo indray azafady.',
        });
      }
    } catch (err: any) {
      setAppConfigStatus({
        type: 'error',
        text: `Fahadisoana: ${err.message}`,
      });
    } finally {
      setIsSavingAppConfig(false);
    }
  };

  const handleRunDiagnostic = async () => {
    setIsRunningDiag(true);
    try {
      const res = await fetch('/api/facebook/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_id: activePage?.id || activePage?.page_id }),
      });
      const data = await res.json();
      setDiagnosticData(data);
    } catch (err: any) {
      setDiagnosticData({
        overall_status: 'ERROR',
        diagnostic_messages: [`Tsy afaka nanao diagnostic: ${err.message}`],
      });
    } finally {
      setIsRunningDiag(false);
    }
  };

  const handleEnableSandbox = async () => {
    try {
      const res = await fetch('/api/facebook/pages/enable-sandbox', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubscribeStatus({ type: 'success', text: data.message });
        handleRunDiagnostic();
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleForceSubscribeWebhook = async () => {
    setIsSubscribingWebhook(true);
    setSubscribeStatus(null);
    try {
      const res = await fetch('/api/facebook/subscribe-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_id: activePage?.id || activePage?.page_id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubscribeStatus({
          type: 'success',
          text: data.message || 'Voasoratra soa aman-tsara amin\'ny Webhook Meta ny Page !',
        });
        handleRunDiagnostic();
      } else {
        setSubscribeStatus({
          type: 'error',
          text: data.error || 'Nisy olana teo am-pandefasana ny famandrihana Webhook.',
        });
      }
    } catch (err: any) {
      setSubscribeStatus({
        type: 'error',
        text: `Fahadisoana: ${err.message}`,
      });
    } finally {
      setIsSubscribingWebhook(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipientId.trim()) return;
    setIsSendingTestMsg(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/facebook/test-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_id: activePage?.id || activePage?.page_id,
          recipient_id: testRecipientId.trim(),
          message: testMessageText.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          type: 'success',
          text: `Tafalefa soa aman-tsara any amin'ny Messenger (ID: ${data.message_id}) !`,
        });
      } else {
        setTestResult({
          type: 'error',
          text: `Tsy nahomby: ${data.error || 'Erreur Meta'}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        type: 'error',
        text: `Fahadisoana: ${err.message}`,
      });
    } finally {
      setIsSendingTestMsg(false);
    }
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAllLinks = () => {
    const fullSummary = `=== LIENS & CONFIGURATION FACEBOOK LOGIN / META DEVELOPERS ===
Site URL (URL du site web) : ${siteUrl}
App Domain (Domaine de l'application) : ${effectiveHost}

0. IDENTIFIANT DE L'APPLICATION (APP ID) :
${metaAppId || appIdInput || '(Tsy mbola voarakitra)'}

1. FACEBOOK LOGIN > PARAMÈTRES (SETTINGS) :
- URI de redirection OAuth valides (Apetaho ao amin'ny Meta) :
  ${popupCallbackUri}
  ${oauthRedirectUri}
  ${firebaseAuthHandlerUri}
  ${oauthRedirectUriAlt}
- URL de rappel de désautorisation :
  ${deauthorizeCallbackUrl}

2. PARAMÈTRES > GÉNÉRAL (BASIC SETTINGS) :
- Domaine de l'application (App Domain) :
  ${effectiveHost}
- URL du site web (Site URL) :
  ${siteUrl}
- URL de la Politique de Confidentialité :
  ${privacyPolicyUrl}
- URL des Conditions d'Utilisation :
  ${termsUrl}
- URL de suppression des données utilisateur (Data Deletion) :
  ${dataDeletionCallbackUrl}
- URL d'instructions de suppression des données :
  ${dataDeletionInstructionsUrl}

3. WEBHOOKS > PAGE :
- Callback URL :
  ${webhookUrl}
- Verify Token :
  ${verifyToken}
- Champs abonnés recommandés :
  messages, messaging_postbacks, feed

4. PERMISSIONS / SCOPES NÉCESSAIRES :
  ${requiredScopes.join(', ')}
`;
    navigator.clipboard.writeText(fullSummary);
    setCopiedField('all_links');
    setTimeout(() => setCopiedField(null), 2500);
  };

  const isAppIdValid = metaAppId && /^\d+$/.test(metaAppId) && metaAppId.length >= 8;

  const directOAuthUrl = isAppIdValid
    ? `https://www.facebook.com/v20.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(
        oauthRedirectUri
      )}&scope=${encodeURIComponent(requiredScopes.join(','))}&response_type=code&state=meta_oauth_connect`
    : '#';

  const handleStartOAuth = (e: React.MouseEvent) => {
    if (!isAppIdValid) {
      e.preventDefault();
      setAppConfigStatus({
        type: 'error',
        text: 'Azafady ampidiro ary tahirizo eo ambony aloha ny tena App ID Meta-nao (tarehimarika 15-16 isa) vao manomboka ny Facebook Login.',
      });
      const inputEl = document.getElementById('meta-app-id-input');
      if (inputEl) {
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        inputEl.focus();
      }
    }
  };

  const handleConnectPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageName.trim() && !newPageId.trim()) return;
    setIsConnecting(true);
    try {
      if (onConnectRealPage) {
        await onConnectRealPage({
          page_id: newPageId.trim(),
          page_name: newPageName.trim(),
          category: newPageCat.trim() || 'Commerce & Services',
          page_access_token: newPageToken.trim() || undefined,
        });
      } else {
        await onConnectNewPage({
          page_id: newPageId.trim() || undefined,
          page_name: newPageName.trim() || 'Page Facebook Réelle',
          category: newPageCat.trim() || 'Commerce & Services',
          page_access_token: newPageToken.trim() || undefined,
        });
      }
      setNewPageName('');
      setNewPageId('');
      setNewPageToken('');
      setAppConfigStatus({
        type: 'success',
        text: 'Tafiditra soa aman-tsara ny Page Réelle ary voafidy ho Page miasa amin\'ny rafitra !',
      });
      setTimeout(() => setAppConfigStatus(null), 5000);
    } catch (err: any) {
      setAppConfigStatus({
        type: 'error',
        text: `Fahadisoana: ${err?.message || 'Tsy voafandray ny Page'}`,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDeletePageItem = async (pageId: string, pageName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Tena hofafanao ve ny Page "${pageName}" ?`)) {
      setDeletingPageId(pageId);
      try {
        if (onDeletePage) {
          await onDeletePage(pageId);
        }
      } finally {
        setDeletingPageId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* OAuth Success Banner from Meta redirect */}
      {oauthReturnSuccess && (
        <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/60 p-4 shadow-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">🎉 Fifandraisana Meta Facebook Tafita Soa Aman-tsara !</h4>
              <p className="text-xs text-emerald-300/90 mt-0.5">{oauthReturnSuccess}</p>
            </div>
          </div>
          <button
            onClick={() => setOauthReturnSuccess(null)}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-400 hover:text-white"
          >
            Akatony
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-500" />
            Rohy rehetra ilaina amin'ny Facebook Login & Meta Graph API
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ireo rohy (URLs) sy mari-pamantarana rehetra takian'ny Meta for Developers (developers.facebook.com) mba hampandeha 100% ny Facebook Login sy ny Messenger.
          </p>
        </div>

        <button
          onClick={copyAllLinks}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 self-start sm:self-auto"
        >
          <Copy className="h-4 w-4" />
          <span>{copiedField === 'all_links' ? 'Voadika avokoa !' : 'Adikao daholo ireo Rohy (Copier Tout)'}</span>
        </button>
      </div>

      {/* Domain Switcher Selector */}
      <div className="rounded-2xl border border-blue-500/40 bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-bold text-white">Safidio ny Domaine hampiasaina amin'ny Rohy Meta :</span>
          </div>
          <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
            Active: {effectiveOrigin}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSelectedDomain('vercel')}
            className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
              selectedDomain === 'vercel'
                ? 'border-blue-500 bg-blue-600/20 text-white shadow-md shadow-blue-500/10'
                : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div>
              <span className="font-bold flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-blue-400" />
                Domaine Vercel Production
              </span>
              <span className="text-[11px] text-blue-300 block font-mono mt-0.5">https://agence-virtuelle.vercel.app</span>
            </div>
            {selectedDomain === 'vercel' && <CheckCircle2 className="h-4 w-4 text-blue-400" />}
          </button>

          <button
            type="button"
            onClick={() => setSelectedDomain('current')}
            className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
              selectedDomain === 'current'
                ? 'border-blue-500 bg-blue-600/20 text-white shadow-md shadow-blue-500/10'
                : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div>
              <span className="font-bold flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-purple-400" />
                Domaine Preview / Dev
              </span>
              <span className="text-[11px] text-slate-400 block font-mono mt-0.5 truncate max-w-[240px]">{currentOrigin}</span>
            </div>
            {selectedDomain === 'current' && <CheckCircle2 className="h-4 w-4 text-blue-400" />}
          </button>
        </div>
      </div>

      {/* Featured Card: Facebook Login & Firebase Database */}
      <div className="rounded-2xl border-2 border-blue-500/50 bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1877F2] text-white shadow-lg shadow-blue-600/40 shrink-0">
              <Facebook className="h-7 w-7 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Facebook Login (Meta OAuth & Firebase)</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                  <Flame className="h-3 w-3 text-amber-400" />
                  Firebase Firestore Actif
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Tsindrio ny bokotra <strong>"Se connecter avec Facebook"</strong> mba hidirana sy hampidirana avy hatrany ny Pages Facebook-nao.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenFacebookLogin ? onOpenFacebookLogin : () => {}}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] px-5 py-3 text-xs font-bold text-white shadow-xl shadow-blue-600/40 transition-all active:scale-95 whitespace-nowrap self-start sm:self-auto cursor-pointer"
          >
            <Facebook className="h-4 w-4 fill-white" />
            <span>Se connecter avec Facebook</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-2.5">
            <span className="text-slate-400 block text-[10px]">🔥 Base de données :</span>
            <span className="font-bold text-amber-400">Firebase Firestore (Cloud)</span>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-2.5">
            <span className="text-slate-400 block text-[10px]">🔒 Fiarovana :</span>
            <span className="font-bold text-emerald-400">OAuth 2.0 & Graph API v20.0</span>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-2.5">
            <span className="text-slate-400 block text-[10px]">⚡ Fampifandraisana :</span>
            <span className="font-bold text-blue-400">Popup & Token Direct</span>
          </div>
        </div>
      </div>

      {/* Diagnostic & Live Messenger Test Center */}
      <div className="rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-br from-slate-900 via-cyan-950/30 to-slate-900 p-5 space-y-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-cyan-500/20 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/20">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🔍 Diagnostic & Fanaraha-maso ny IA Messenger</span>
                <span className="rounded-full bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                  Live Test
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Jereo amin'ny tsindry 1 monja raha mandray hafatra sy mamaly tsara ny Assistante IA amin'ny Messenger.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunDiagnostic}
              disabled={isRunningDiag}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${isRunningDiag ? 'animate-spin' : ''}`} />
              <span>{isRunningDiag ? 'Eo am-panamarinana...' : 'Manao Diagnostic Ankehitriny'}</span>
            </button>
            <button
              onClick={handleEnableSandbox}
              className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 px-3.5 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-600/30 transition-all active:scale-95 cursor-pointer"
              title="Active avy hatrany ny Token Test & Sandbox mba tsy hisian'ny olana"
            >
              <Zap className="h-4 w-4" />
              <span>⚡ Mode Test & Token</span>
            </button>
            <button
              onClick={handleForceSubscribeWebhook}
              disabled={isSubscribingWebhook}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/50 hover:bg-cyan-900/50 px-3.5 py-2.5 text-xs font-bold text-cyan-300 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Abonner la Page Facebook aux Webhooks Meta"
            >
              <Zap className={`h-4 w-4 text-cyan-400 ${isSubscribingWebhook ? 'animate-pulse' : ''}`} />
              <span>{isSubscribingWebhook ? 'Eo am-pandefasana...' : 'Abonner au Webhook'}</span>
            </button>
          </div>
        </div>

        {/* Subscribe status banner if any */}
        {subscribeStatus && (
          <div
            className={`rounded-xl p-3 text-xs flex items-center gap-2.5 border ${
              subscribeStatus.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            {subscribeStatus.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{subscribeStatus.text}</span>
          </div>
        )}

        {/* Diagnostic Results Panel */}
        {diagnosticData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Page Status */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">1. Page Facebook</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-xs font-bold text-white truncate">
                  {diagnosticData.page?.page_name || 'Aucune Page'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  ID: {diagnosticData.page?.page_id || diagnosticData.page?.id || 'N/A'}
                </div>
              </div>

              {/* 2. Token Status */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2. Token Meta</span>
                  {diagnosticData.token?.meta_api_valid ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  )}
                </div>
                <div className="text-xs font-bold text-white">
                  {diagnosticData.token?.meta_api_valid
                    ? 'Valide sur Graph API'
                    : diagnosticData.token?.present
                    ? 'Présent (Non vérifié)'
                    : 'Manquant'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {diagnosticData.token?.token_preview || 'Tsy misy Token'}
                </div>
              </div>

              {/* 3. Webhook Subscribed */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">3. Webhook Subscribed</span>
                  {diagnosticData.webhook_subscription?.subscribed_apps_valid ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  )}
                </div>
                <div className="text-xs font-bold text-white">
                  {diagnosticData.webhook_subscription?.subscribed_apps_valid
                    ? 'Abonné aux Messages'
                    : 'Non Abonné'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  Fields: {diagnosticData.webhook_subscription?.subscribed_fields?.join(', ') || 'N/A'}
                </div>
              </div>

              {/* 4. AI Engine */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">4. Moteur IA Gemini</span>
                  {diagnosticData.ai_engine?.status === 'READY' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-400" />
                  )}
                </div>
                <div className="text-xs font-bold text-white">
                  {diagnosticData.ai_engine?.status === 'READY'
                    ? `Opérationnel (${diagnosticData.ai_engine?.test_latency_ms}ms)`
                    : 'Erreur'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {diagnosticData.assistant_settings?.is_active
                    ? `IA Active (${diagnosticData.assistant_settings?.name})`
                    : '⚠️ IA Désactivée'}
                </div>
              </div>
            </div>

            {/* Diagnostic Alert Messages */}
            {diagnosticData.diagnostic_messages?.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 p-3 text-xs text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Torohevitra sy fanitsiana tokony hatao :
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-amber-200/90">
                  {diagnosticData.diagnostic_messages.map((msg: string, idx: number) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-cyan-500/30 bg-cyan-950/20 p-4 text-center">
            <p className="text-xs text-slate-300">
              Tsindrio ny bokotra <strong>"Manao Diagnostic Ankehitriny"</strong> eo ambony mba hanamarinana avy hatrany ny Token, ny Webhook ary ny fiasan'ny IA.
            </p>
          </div>
        )}

        {/* Live Messenger Test Message Form */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white">
              Handefa Hafatra Andrana mivantana any amin'ny Messenger (Test d'envoi en direct)
            </h4>
          </div>
          <p className="text-[11px] text-slate-400">
            Ampidiro ny PSID (Page-Scoped ID) an'ny mpampiasa Facebook iray efa nandefa hafatra tamin'ny Page mba handefasana hafatra andrana mivantana.
          </p>

          <form onSubmit={handleSendTestMessage} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              value={testRecipientId}
              onChange={(e) => setTestRecipientId(e.target.value)}
              placeholder="PSID Recipient ID (ex: 839201948572019)"
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            <input
              type="text"
              value={testMessageText}
              onChange={(e) => setTestMessageText(e.target.value)}
              placeholder="Hafatra andrana (Optionnel)"
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSendingTestMsg || !testRecipientId.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-600/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSendingTestMsg ? 'Eo am-pandefasana...' : 'Alefaso ny Hafatra Test'}</span>
            </button>
          </form>

          {testResult && (
            <div
              className={`rounded-xl p-3 text-xs flex items-center gap-2 border ${
                testResult.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}
            >
              {testResult.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              )}
              <span>{testResult.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* Section 0: Meta App ID & Secret Configuration */}
      <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs">
                0
              </span>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                Ny App ID Meta Facebook-nao (Identifiant d'application)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Ity no laharana 15 na 16 isa ao amin'ny <strong>developers.facebook.com</strong> (Tableau de bord na Paramètres &gt; Général). Tsy maintsy marina io vao afaka manao Facebook Login.
            </p>
          </div>

          <div>
            {isAppIdValid ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>App ID Vonona ({metaAppId})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-[11px] font-bold text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Mila ampidirina ny App ID</span>
              </span>
            )}
          </div>
        </div>

        {/* Feedback Message */}
        {appConfigStatus && (
          <div
            className={`rounded-xl p-3 text-xs flex items-start gap-2 ${
              appConfigStatus.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {appConfigStatus.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            )}
            <span>{appConfigStatus.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveAppConfig} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Identifiant de l’application (App ID) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="meta-app-id-input"
                  type="text"
                  placeholder="oh: 14312953392459518..."
                  value={appIdInput}
                  onChange={(e) => setAppIdInput(e.target.value)}
                  className={`w-full rounded-xl border bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none ${
                    isAppIdValid
                      ? 'border-emerald-500/50 focus:border-emerald-500'
                      : 'border-slate-800 focus:border-indigo-500'
                  }`}
                  required
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Laharana tokana 15-16 isa hita eo ambony havia ao amin'ny developers.facebook.com
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">
                  Clé secrète de l’application (App Secret)
                </label>
                <span className="text-[10px] text-slate-500">(Fiarovana fanampiny)</span>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showSecret ? 'text' : 'password'}
                  placeholder="Clé secrète ao amin'ny Paramètres > Général"
                  value={appSecretInput}
                  onChange={(e) => setAppSecretInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 pr-10 text-xs font-mono text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 text-slate-400 hover:text-white"
                >
                  <Key className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Hita ao amin'ny Paramètres &gt; Général ao amin'ny Facebook Developers
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-1 gap-2">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span>
                Raha vao manindry "Tahirizo" ianao dia havaozina ho azy ny rohy Facebook Login rehetra.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSavingAppConfig}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap self-start sm:self-auto"
            >
              {isSavingAppConfig ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Eo am-pitehirizana...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Tahirizo ny App ID</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Mini Guide Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-[11px] text-slate-400 space-y-1.5">
          <p className="font-bold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Aiza marina no ahitana io App ID io ao amin'ny Facebook Developers ?
          </p>
          <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
            <li>Sokafy ny tranokala <strong>https://developers.facebook.com/apps</strong></li>
            <li>Kitiho ny Application-nao (ilay namboarinao ho an'ny chatbot)</li>
            <li>Jereo eo amin'ny lohateny ambony havia eo akaikin'ny anaran'ny App na sokafy ny <strong>Paramètres &gt; Général</strong></li>
            <li>Adikao ilay laharana eo amin'ny <strong>Identifiant de l'application (App ID)</strong> dia apetaho eto ambony ary tsindrio <strong>Tahirizo</strong>.</li>
          </ol>
        </div>
      </div>

      {/* Primary Highlights Card: Facebook Login Required Links */}
      <div className="rounded-2xl border border-blue-500/30 bg-slate-900/90 p-5 space-y-5 shadow-xl shadow-blue-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3 gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="h-4 w-4 text-blue-400" />
              1. Rohy ao amin'ny "Facebook Login &gt; Paramètres (Settings)"
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Ampidiro ao amin'ny Meta App-nao ao amin'ny fizarana <strong>Facebook Login &gt; Paramètres</strong> ireto rohy ireto:
            </p>
          </div>
          <span className="self-start sm:self-auto rounded-full bg-blue-950 px-2.5 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/30">
            OAuth 2.0 Redirects
          </span>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* Popup Fast Callback URI */}
          <div className="rounded-xl border border-blue-500/50 bg-blue-950/30 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-blue-300 flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-blue-400" />
                <span>URI de redirection Popup Facebook Login (Tonga dia miasa) :</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/40 font-bold">
                  Direct Popup
                </span>
              </label>
              <span className="text-[10px] text-blue-300/80 font-semibold">Valid OAuth Redirect URI</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={popupCallbackUri}
                className="flex-1 rounded-xl border border-blue-500/40 bg-slate-950 px-3.5 py-2 text-blue-200 font-mono text-xs focus:outline-none select-all font-bold"
              />
              <button
                onClick={() => copyToClipboard(popupCallbackUri, 'popup_callback')}
                className="flex items-center gap-1 rounded-xl border border-blue-500/50 bg-blue-600/30 px-3 py-2 text-xs font-bold text-blue-200 hover:bg-blue-600/50 hover:text-white cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copiedField === 'popup_callback' ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
          </div>

          {/* CRITICAL Firebase OAuth Handler URI */}
          <div className="rounded-xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-amber-300 flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-amber-400" />
                <span>URI de redirection Firebase Auth (Handler Firebase) :</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40 font-bold">
                  Firebase OAuth Handler
                </span>
              </label>
              <span className="text-[10px] text-amber-300/80 font-semibold">Tsy maintsy ampidirina ao amin'ny Meta</span>
            </div>
            <p className="text-[11px] text-slate-300">
              💡 <strong>Nahoana no tena ilaina ity rohy ity ?</strong> Rehefa manao Facebook Login amin'ny Firebase ianao, ity rohy ity no ampiasain'ny Firebase handraisana ny connexion. <em>(Efa nahazo alalana ho azy ao amin'ny Firebase ity, ka tsy mila manova na inona na inona ao amin'ny Firebase Console ianao !)</em>
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={firebaseAuthHandlerUri}
                className="flex-1 rounded-xl border border-amber-500/40 bg-slate-950 px-3.5 py-2 text-amber-300 font-mono text-xs focus:outline-none select-all font-bold"
              />
              <button
                onClick={() => copyToClipboard(firebaseAuthHandlerUri, 'firebase_handler')}
                className="flex items-center gap-1 rounded-xl border border-amber-500/50 bg-amber-600/30 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-600/50 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copiedField === 'firebase_handler' ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
          </div>

          {/* Valid OAuth Redirect URI #1 (Vercel / Selected Domain) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-300 flex items-center gap-1.5">
                <span>URI de redirection OAuth valides ({selectedDomain === 'vercel' ? 'Vercel Production' : 'App'}) :</span>
                <span className="text-[10px] text-emerald-400 font-semibold">(Callback API)</span>
              </label>
              <span className="text-[10px] text-slate-500">Valid OAuth Redirect URIs</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={oauthRedirectUri}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-blue-300 font-mono text-xs focus:outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(oauthRedirectUri, 'oauth_primary')}
                className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copiedField === 'oauth_primary' ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
          </div>

          {/* Valid OAuth Redirect URI #2 (Alternative fallback) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-300 flex items-center gap-1.5">
                <span>URI de redirection alternative (Fallback) :</span>
              </label>
              <span className="text-[10px] text-slate-500">Ho an'ny fiarovana fanampiny</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={oauthRedirectUriAlt}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-slate-300 font-mono text-xs focus:outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(oauthRedirectUriAlt, 'oauth_alt')}
                className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copiedField === 'oauth_alt' ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
          </div>

          {/* Deauthorize Callback URL */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-300">
                URL de rappel de désautorisation (Deauthorize Callback URL) :
              </label>
              <span className="text-[10px] text-slate-500">Deauthorize callback</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={deauthorizeCallbackUrl}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-slate-300 font-mono text-xs focus:outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(deauthorizeCallbackUrl, 'deauth')}
                className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copiedField === 'deauth' ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Basic Settings / Paramètres Généraux */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3 gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-400" />
              2. Rohy ao amin'ny "Paramètres &gt; Général (Settings &gt; Basic)"
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Ireo rohy takian'ny Meta tsy maintsy fenoina mba hivoahan'ny App amin'ny Mode Live / Production:
            </p>
          </div>
          <span className="self-start sm:self-auto rounded-full bg-emerald-950 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
            Conformité Légale Meta
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* App Domain */}
          <div>
            <label className="block font-bold text-slate-300 mb-1">
              Domaine de l'application (App Domain) :
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={effectiveHost}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-300 font-mono text-xs focus:outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(effectiveHost, 'host')}
                className="rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Site URL */}
          <div>
            <label className="block font-bold text-slate-300 mb-1">
              URL du site web (Plateforme Web / Site URL) :
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={siteUrl}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-300 font-mono text-xs focus:outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(siteUrl, 'site_url')}
                className="rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Privacy Policy URL */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-300">
                Politique de Confidentialité (Privacy Policy URL) :
              </label>
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <span>Hizaha</span> <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={privacyPolicyUrl}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-emerald-300 font-mono text-xs focus:outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(privacyPolicyUrl, 'privacy')}
                className="rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Terms of Service URL */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-300">
                Conditions d'Utilisation (Terms of Service URL) :
              </label>
              <a
                href="/terms"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <span>Hizaha</span> <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={termsUrl}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-emerald-300 font-mono text-xs focus:outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(termsUrl, 'terms')}
                className="rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* User Data Deletion Callback URL */}
          <div>
            <label className="block font-bold text-slate-300 mb-1">
              Suppression des données (Data Deletion Callback) :
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={dataDeletionCallbackUrl}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-300 font-mono text-xs focus:outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(dataDeletionCallbackUrl, 'data_del_cb')}
                className="rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* User Data Deletion Instructions URL */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-300">
                Instructions de suppression (Data Deletion Instructions) :
              </label>
              <a
                href="/data-deletion"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <span>Hizaha</span> <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={dataDeletionInstructionsUrl}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-300 font-mono text-xs focus:outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(dataDeletionInstructionsUrl, 'data_del_inst')}
                className="rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Webhooks Meta for Real-time Messaging */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="h-4 w-4 text-purple-400" />
            3. Rohy ao amin'ny "Webhooks &gt; Page" (Meta for Developers)
          </h3>
          <span className="rounded-full bg-purple-950 px-2.5 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30">
            Fandraisana Hafatra Mivantana
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Mba handraisana avy hatrany ny hafatra Messenger sy ny commentaires avy amin'ny mpanjifa amin'ny fotoana tena izy :
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1">
              URL de Rappel Webhook (Callback URL) :
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-purple-300 font-mono text-xs focus:outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(webhookUrl, 'wh_url')}
                className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copiedField === 'wh_url' ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">
              Jeton de Vérification (Verify Token) :
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={verifyToken}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-purple-300 font-mono text-xs focus:outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(verifyToken, 'wh_token')}
                className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copiedField === 'wh_token' ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Required Subscribed Fields */}
        <div className="rounded-xl bg-slate-950 p-3.5 text-xs text-slate-300 border border-slate-800">
          <span className="font-bold text-white block mb-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Ireo Champs Webhook 3 tsy maintsy marihina (cocher) ao amin'ny Meta :
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
            <div className="rounded-lg bg-slate-900 p-2 border border-slate-800/80">
              <code className="text-blue-400 font-bold block">messages</code>
              <span className="text-slate-400 text-[10px]">Hafatra rehetra amin'ny Messenger</span>
            </div>
            <div className="rounded-lg bg-slate-900 p-2 border border-slate-800/80">
              <code className="text-blue-400 font-bold block">messaging_postbacks</code>
              <span className="text-slate-400 text-[10px]">Boutons sy fipihana amin'ny chat</span>
            </div>
            <div className="rounded-lg bg-slate-900 p-2 border border-slate-800/80">
              <code className="text-blue-400 font-bold block">feed</code>
              <span className="text-slate-400 text-[10px]">Commentaires amin'ny publication</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Permissions & Scopes nécessaires */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          4. Ireo Fahazoan-dalana (Permissions / Scopes) ilaina ao amin'ny Meta
        </h3>
        <p className="text-xs text-slate-400">
          Rehefa mampiditra ny Facebook Login ianao, ireto no permissions takiana mba hahafahan'ny AI mamaly sy mandray kaomandy :
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {requiredScopes.map((scope) => (
            <span
              key={scope}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] font-mono font-medium text-blue-300"
            >
              ✓ {scope}
            </span>
          ))}
        </div>
      </div>

      {/* Section 5: Direct Facebook Login OAuth Dialog Tester */}
      <div className="rounded-2xl border border-blue-500/40 bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs">
                5
              </span>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Facebook className="h-4 w-4 text-blue-400" />
                Fitsapana mivantana ny Facebook Login (Lien Direct OAuth)
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Tsindrio ity bokotra ity mba hanombohana ny fifandraisana Facebook Login amin'ny alalan'ny Meta Graph API.
            </p>
          </div>

          <a
            href={isAppIdValid ? directOAuthUrl : '#meta-app-id-input'}
            onClick={handleStartOAuth}
            target={isAppIdValid ? '_blank' : '_self'}
            rel="noreferrer"
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all self-start sm:self-auto whitespace-nowrap active:scale-95 ${
              isAppIdValid
                ? 'bg-blue-600 shadow-blue-600/30 hover:bg-blue-500 cursor-pointer'
                : 'bg-amber-600/80 hover:bg-amber-600 cursor-pointer'
            }`}
          >
            <Facebook className="h-4 w-4" />
            <span>{isAppIdValid ? 'Manomboka Facebook Login' : 'Ampidiro aloha ny App ID'}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Status notice */}
        {!isAppIdValid ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-bold">Mila ampidirina aloha ny App ID Meta-nao :</p>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                Raha tsy misy App ID marina (tarehimarika 15 na 16 isa) dia mampiseho <em>"Identifiant d'application invalide"</em> ny Facebook. Apetaho eo amin'ny <strong>fizarana 0 eo ambony</strong> ny App ID avy ao amin'ny developers.facebook.com dia tsindrio "Tahirizo".
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>App ID ampiasaina : <strong className="font-mono text-white">{metaAppId}</strong> (v20.0 Meta Graph API)</span>
          </div>
        )}

        <div className="pt-2">
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
            Rohy mivantana (URL de dialogue OAuth complet) :
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={isAppIdValid ? directOAuthUrl : '(Mila ampidirina ny App ID eo amin\'ny fizarana 0)'}
              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-400 font-mono text-[11px] focus:outline-none select-all"
            />
            {isAppIdValid && (
              <button
                onClick={() => copyToClipboard(directOAuthUrl, 'direct_oauth')}
                className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Connected Page Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3 gap-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Page Facebook Miasa Ankehitriny (Page Active)
          </h3>
          {activePage && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                (activePage.is_real || activePage.is_real_page || (activePage.id !== 'page_mada_01' && activePage.id !== 'page_mada_02')) && !activePage.is_demo
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${(activePage.is_real || activePage.is_real_page || (activePage.id !== 'page_mada_01' && activePage.id !== 'page_mada_02')) && !activePage.is_demo ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {(activePage.is_real || activePage.is_real_page || (activePage.id !== 'page_mada_01' && activePage.id !== 'page_mada_02')) && !activePage.is_demo ? 'Page Réelle Meta' : 'Page Démo'}
            </span>
          )}
        </div>

        {activePage ? (
          <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3.5">
              <img
                src={activePage.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                alt={activePage.page_name}
                className="h-12 w-12 rounded-xl object-cover ring-2 ring-blue-500/40"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">{activePage.page_name}</h4>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      (activePage.is_real || activePage.is_real_page || (activePage.id !== 'page_mada_01' && activePage.id !== 'page_mada_02')) && !activePage.is_demo
                        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                        : 'bg-amber-900/40 text-amber-300 border border-amber-700/40'
                    }`}
                  >
                    {(activePage.is_real || activePage.is_real_page || (activePage.id !== 'page_mada_01' && activePage.id !== 'page_mada_02')) && !activePage.is_demo ? '✅ Page Réelle' : '⚠️ Démo'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                  <span className="font-mono text-slate-300">ID: {activePage.page_id}</span>
                  <span>•</span>
                  <span>Sokajy: {activePage.category || 'Commerce & Vente'}</span>
                  {activePage.fan_count !== undefined && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">{activePage.fan_count.toLocaleString()} mpanaraka</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Mifandray amin'ny Webhook
                </span>
                <span className="text-[11px] text-slate-500">
                  Mandray hafatra sy kaomandy mivantana
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center">
            <p className="text-xs text-slate-400">Tsy mbola misy Page voasafidy ho miasa. Safidio na ampidiro eto ambany ny Page Facebook-nao.</p>
          </div>
        )}

        {/* Page Switcher */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
            <label className="block text-xs font-bold text-slate-300">
              Lisitr'ireo Pages voarakitra ao amin'ny rafitra ({pages.length}) :
            </label>
            {pages.some((p) => p.is_demo || p.id === 'page_mada_01' || p.id === 'page_mada_02' || p.id === 'page_1') && (
              <button
                onClick={async () => {
                  if (window.confirm('Tena hofafanao ve ny Pages Démo rehetra mba tsy hisy afa-tsy ny tena Page Réelle-nao ?')) {
                    setIsDeletingDemos(true);
                    try {
                      if (onDeleteDemoPages) {
                        await onDeleteDemoPages();
                      } else {
                        // Delete individually
                        const demoPages = pages.filter((p) => p.is_demo || p.id === 'page_mada_01' || p.id === 'page_mada_02' || p.id === 'page_1');
                        for (const dp of demoPages) {
                          if (onDeletePage) await onDeletePage(dp.id);
                        }
                      }
                      setAppConfigStatus({
                        type: 'success',
                        text: 'Voafafa soa aman-tsara ny Pages Démo rehetra !',
                      });
                      setTimeout(() => setAppConfigStatus(null), 4000);
                    } finally {
                      setIsDeletingDemos(false);
                    }
                  }
                }}
                disabled={isDeletingDemos}
                className="text-[11px] text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/60 border border-red-900/50 rounded-lg px-2.5 py-1 flex items-center gap-1.5 font-medium transition-all self-start sm:self-auto"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeletingDemos ? 'Eo am-pamafana...' : 'Fafao ny Page Démo Rehetra (Tena Page Réelle ihany)'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pages.map((p) => {
              const isSelected = activePage?.id === p.id || activePage?.page_id === p.page_id;
              const isReal = (p.is_real === true || p.is_real_page === true || (p.id !== 'page_mada_01' && p.id !== 'page_mada_02' && p.id !== 'page_1')) && !p.is_demo;
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectPage(p.id)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500 shadow-md shadow-blue-900/20'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={p.page_name}
                      className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-white truncate">{p.page_name}</p>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                            isReal
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                          }`}
                        >
                          {isReal ? 'Réelle' : 'Démo'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        ID: <span className="font-mono text-slate-300">{p.page_id}</span> • {p.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {isSelected ? (
                      <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                        Miasa
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300 group-hover:bg-slate-700">
                        Hisafidy
                      </span>
                    )}

                    <button
                      onClick={(e) => handleDeletePageItem(p.id, p.page_name, e)}
                      disabled={deletingPageId === p.id}
                      title="Fafao ity page ity"
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Connect Another / Real Facebook Page Form */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-400" />
            Fampidirana Page Facebook Réelle (Mivantana na amin'ny Token)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Raha tsy mandalo amin'ny bokotra "Connecter amin'ny Facebook Login" ianao, na te hampiditra mivantana ny tena Page-nao, fenoy eto ny mombamomba azy. Hahazo avy hatrany ny hafatra sy ny fanehoan-kevitra ny AI.
          </p>
        </div>

        <form onSubmit={handleConnectPage} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Laharana Page ID Meta (Tarehimarika Identifiant de la Page) *
              </label>
              <input
                type="text"
                placeholder="oh: 109283746592019"
                value={newPageId}
                onChange={(e) => setNewPageId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Azo ao amin'ny pejy Facebook-nao &gt; À propos &gt; Transparence de la page.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Anaran'ny Page Facebook (Nom officiel) *
              </label>
              <input
                type="text"
                placeholder="oh: Boutique Andry Madagascar..."
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Ny tena anaran'ny Page-nao ao amin'ny Facebook.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Page Access Token Meta <span className="text-emerald-400 font-normal">(Voaray ho azy amin'ny Facebook Login)</span>
              </label>
              <input
                type="password"
                placeholder="Token nalaina ho azy na ampidiro eto..."
                value={newPageToken}
                onChange={(e) => setNewPageToken(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Averina ampahatsiahivina: nalaina ho azy avy ao amin'ny Facebook Login ny Token fa tsy voatery ho soratana tanana.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Sokajy (Catégorie de la page)
              </label>
              <input
                type="text"
                placeholder="oh: Commerce, Vêtements, Tech, Restaurant..."
                value={newPageCat}
                onChange={(e) => setNewPageCat(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Ampahafantaro ny AI ny karazan'asa ataon'ny pejy.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={isConnecting}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 disabled:opacity-50"
            >
              <Facebook className="h-4 w-4" />
              <span>{isConnecting ? 'Mampifandray amin\'ny Meta...' : 'Ampidiro & Hamafiso ny Page Réelle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
