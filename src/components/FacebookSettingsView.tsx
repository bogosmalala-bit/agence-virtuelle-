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
      .then((r) => r.json())
      .then((data) => {
        if (data?.meta_app_id) {
          setMetaAppId(data.meta_app_id);
        }
      })
      .catch(() => {});
  }, []);

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAllLinks = () => {
    const fullSummary = `=== LIENS & CONFIGURATION FACEBOOK LOGIN / META DEVELOPERS ===
Site URL (URL du site web) : ${siteUrl}
App Domain (Domaine de l'application) : ${host}

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

  const directOAuthUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${
    metaAppId || 'VOTRE_APP_ID'
  }&redirect_uri=${encodeURIComponent(oauthRedirectUri)}&scope=${encodeURIComponent(
    requiredScopes.join(',')
  )}&response_type=code&state=meta_oauth_connect`;

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
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Facebook className="h-4 w-4 text-blue-400" />
              5. Fitsapana mivantana ny Facebook Login (Lien Direct OAuth)
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Tsindrio ity bokotra ity na adikao ny rohy mivantana hahafahana manokatra ny varavarankely ofisialin'ny Facebook Login.
            </p>
          </div>

          <a
            href={directOAuthUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 self-start sm:self-auto whitespace-nowrap"
          >
            <Facebook className="h-4 w-4" />
            <span>Manomboka Facebook Login</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="pt-2">
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
            Rohy mivantana (URL de dialogue OAuth complet) :
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={directOAuthUrl}
              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-400 font-mono text-[11px] focus:outline-none select-all"
            />
            <button
              onClick={() => copyToClipboard(directOAuthUrl, 'direct_oauth')}
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
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
