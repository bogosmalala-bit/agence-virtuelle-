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
} from 'lucide-react';
import { FacebookPage } from '../types.js';

interface FacebookSettingsViewProps {
  pages: FacebookPage[];
  activePage: FacebookPage | null;
  onSelectPage: (pageId: string) => Promise<void>;
  onConnectNewPage: (pageData: any) => Promise<void>;
}

export const FacebookSettingsView: React.FC<FacebookSettingsViewProps> = ({
  pages,
  activePage,
  onSelectPage,
  onConnectNewPage,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageCat, setNewPageCat] = useState('Commerce & Vente');
  const [metaAppId, setMetaAppId] = useState<string>('');
  const [appIdInput, setAppIdInput] = useState<string>('');
  const [appSecretInput, setAppSecretInput] = useState<string>('');
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [isSavingAppConfig, setIsSavingAppConfig] = useState<boolean>(false);
  const [appConfigStatus, setAppConfigStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://votre-domaine.com';
  const host = typeof window !== 'undefined' ? window.location.hostname : 'votre-domaine.com';

  // Meta Developer Required URLs
  const oauthRedirectUri = `${origin}/api/auth/facebook/callback`;
  const oauthRedirectUriAlt = `${origin}/auth/facebook/callback`;
  const siteUrl = `${origin}/`;
  const privacyPolicyUrl = `${origin}/privacy-policy`;
  const termsUrl = `${origin}/terms`;
  const dataDeletionCallbackUrl = `${origin}/api/facebook/data-deletion`;
  const dataDeletionInstructionsUrl = `${origin}/data-deletion`;
  const deauthorizeCallbackUrl = `${origin}/api/facebook/deauthorize`;
  const webhookUrl = `${origin}/api/webhooks/facebook`;
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
    fetch('/api/system/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          if (data.meta_app_id) {
            setMetaAppId(data.meta_app_id);
            setAppIdInput(data.meta_app_id);
          }
          if (data.meta_app_secret) {
            setAppSecretInput(data.meta_app_secret);
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
      const res = await fetch('/api/system/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meta_app_id: cleanId,
          meta_app_secret: appSecretInput.trim() || undefined,
        }),
      });

      if (res.ok) {
        setMetaAppId(cleanId);
        setAppConfigStatus({
          type: 'success',
          text: `Voatahiry soa aman-tsara ny App ID (${cleanId}) ! Vonona hanaovana Facebook Login izao.`,
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

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAllLinks = () => {
    const fullSummary = `=== LIENS & CONFIGURATION FACEBOOK LOGIN / META DEVELOPERS ===
Site URL (URL du site web) : ${siteUrl}
App Domain (Domaine de l'application) : ${host}

0. IDENTIFIANT DE L'APPLICATION (APP ID) :
${metaAppId || appIdInput || '(Tsy mbola voarakitra)'}

1. FACEBOOK LOGIN > PARAMÈTRES (SETTINGS) :
- URI de redirection OAuth valides :
  ${oauthRedirectUri}
  ${oauthRedirectUriAlt}
- URL de rappel de désautorisation :
  ${deauthorizeCallbackUrl}

2. PARAMÈTRES > GÉNÉRAL (BASIC SETTINGS) :
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
    if (!newPageName.trim()) return;
    setIsConnecting(true);
    try {
      await onConnectNewPage({
        page_name: newPageName.trim(),
        category: newPageCat,
      });
      setNewPageName('');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
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
          {/* Valid OAuth Redirect URI #1 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-300 flex items-center gap-1.5">
                <span>URI de redirection OAuth valides (Valid OAuth Redirect URI) :</span>
                <span className="text-[10px] text-emerald-400 font-semibold">(Fototra / Principal)</span>
              </label>
              <span className="text-[10px] text-slate-500">Ampidiro ao amin'ny Valid OAuth Redirect URIs</span>
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
                value={host}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-300 font-mono text-xs focus:outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(host, 'host')}
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
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Page Facebook Miasa Ankehitriny (Active)
        </h3>

        {activePage && (
          <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3.5">
              <img
                src={activePage.avatar_url}
                alt={activePage.page_name}
                className="h-12 w-12 rounded-xl object-cover ring-2 ring-blue-500/40"
              />
              <div>
                <h4 className="text-sm font-bold text-white">{activePage.page_name}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span>ID Meta : {activePage.page_id}</span>
                  <span>•</span>
                  <span>Catégorie : {activePage.category}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Token Valide (Graph API v20.0)
                </span>
                <span className="text-[11px] text-slate-500">
                  Mifandray sy voaaro amin'ny serveur
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Page Switcher */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            Hisafidy Page hafa efa voarakitra :
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pages.map((p) => {
              const isSelected = activePage?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectPage(p.id)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-950/30 ring-1 ring-blue-500'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={p.avatar_url}
                      alt={p.page_name}
                      className="h-8 w-8 rounded-lg object-cover"
                    />
                    <div>
                      <p className="text-xs font-bold text-white">{p.page_name}</p>
                      <span className="text-[10px] text-slate-400">{p.category}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      Miasa
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Connect Another Facebook Page Form */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Plus className="h-4 w-4 text-blue-400" />
          Mampiditra Page Facebook Vaovao
        </h3>
        <p className="text-xs text-slate-400">
          Ampidiro eto ny anaran'ny Page tianao hampidirina ao amin'ny rafitra mba hahafahan'ny AI mandray ny hafatra sy ny kaomandy.
        </p>

        <form onSubmit={handleConnectPage} className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2">
          <input
            type="text"
            placeholder="Anaran'ny Page Facebook..."
            value={newPageName}
            onChange={(e) => setNewPageName(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            required
          />
          <input
            type="text"
            placeholder="Sokajy (oh: Boutik, Vêtements, Tech)"
            value={newPageCat}
            onChange={(e) => setNewPageCat(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isConnecting}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500"
          >
            <Facebook className="h-4 w-4" />
            <span>Mampifandray ny Page</span>
          </button>
        </form>
      </div>
    </div>
  );
};
