import React, { useState, useEffect } from 'react';
import {
  Facebook,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  ExternalLink,
  Flame,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  HelpCircle,
  Copy,
} from 'lucide-react';
import { firestoreService } from '../lib/firestoreService.js';
import { localPersistence } from '../lib/storage.js';
import { FacebookPage } from '../types.js';

interface FacebookLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPagesImported?: (pages: FacebookPage[]) => void;
  metaAppId?: string;
}

export const FacebookLoginModal: React.FC<FacebookLoginModalProps> = ({
  isOpen,
  onClose,
  onPagesImported,
  metaAppId: initialMetaAppId,
}) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [appId, setAppId] = useState(() => initialMetaAppId || localPersistence.getAppId() || '');
  const [userToken, setUserToken] = useState('');
  const [retrievedPages, setRetrievedPages] = useState<FacebookPage[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const saved = localPersistence.getAppId();
    if (saved && !appId) setAppId(saved);
  }, []);

  // Listen for popup callback message
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!event.data) return;
      if (event.data.type === 'FB_OAUTH_TOKEN' && event.data.accessToken) {
        setStatus({ type: 'info', message: 'Tafiditra ny alalana Facebook ! Eo am-pandraisana ny mombamomba anao sy ny Pages...' });
        setLoading(true);
        await handleSuccessfulToken(event.data.accessToken);
        setLoading(false);
      } else if (event.data.type === 'FB_OAUTH_ERROR') {
        setStatus({ type: 'error', message: `Tsy nahomby ny fidirana Facebook : ${event.data.error}` });
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [appId]);

  if (!isOpen) return null;

  const effectiveOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://agence-virtuelle.vercel.app';
  const popupCallbackUrl = `${effectiveOrigin}/oauth-popup-callback.html`;

  const cleanAppId = appId.trim();
  const isAppIdValid = cleanAppId && /^\d+$/.test(cleanAppId) && cleanAppId.length >= 8;

  // Process token, retrieve profile + pages, save to Firestore
  const handleSuccessfulToken = async (token: string) => {
    try {
      // 1. Fetch user profile
      const userRes = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,email,picture{url}&access_token=${token}`);
      const userData = await userRes.json();
      
      const userName = userData.name || 'Mpampiasa Facebook';
      const userAvatar = userData.picture?.data?.url || '';
      const userId = userData.id || 'usr_fb';
      const userEmail = userData.email || '';

      // Save user to Firebase Firestore
      try {
        await firestoreService.saveUser({
          id: userId,
          name: userName,
          email: userEmail,
          avatar_url: userAvatar,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Firestore saveUser error:', err);
      }

      // 2. Fetch Pages (me/accounts)
      const pagesRes = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${token}&fields=id,name,category,picture{url},access_token,fan_count`);
      const pagesData = await pagesRes.json();

      if (pagesData.error) {
        throw new Error(pagesData.error.message || 'Erreur Graph API');
      }

      if (pagesData.data && Array.isArray(pagesData.data) && pagesData.data.length > 0) {
        const pagesToImport: FacebookPage[] = [];

        for (const item of pagesData.data) {
          const newPage: FacebookPage = {
            id: `fb_${item.id}`,
            user_id: userId,
            page_id: item.id,
            page_name: item.name,
            category: item.category || 'Commerce & Services',
            avatar_url: item.picture?.data?.url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            fan_count: item.fan_count || 0,
            has_access_token: !!item.access_token,
            token_status: 'VALID',
            token_expires_at: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
            status: 'CONNECTED',
            connected_at: new Date().toISOString(),
            is_real_page: true,
            is_real: true,
            is_demo: false,
          };
          pagesToImport.push(newPage);

          // Save to server API
          try {
            await fetch('/api/facebook/pages/connect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                page_id: item.id,
                page_name: item.name,
                category: item.category,
                avatar_url: newPage.avatar_url,
                page_access_token: item.access_token,
              }),
            });
          } catch (e) {
            console.warn('Server page connect error:', e);
          }
        }

        // Save to Firebase Firestore Database
        try {
          await firestoreService.savePages(pagesToImport);
        } catch (err) {
          console.warn('Firestore savePages error:', err);
        }

        setRetrievedPages(pagesToImport);
        if (onPagesImported) onPagesImported(pagesToImport);

        setStatus({
          type: 'success',
          message: `🎉 Nahomby ! Voaray soa aman-tsara i "${userName}" ary Pages miisa ${pagesToImport.length} no voatahiry ao amin'ny Firebase Firestore !`,
        });
      } else {
        setStatus({
          type: 'info',
          message: `✅ Tafiditra i "${userName}", saingy tsy mbola misy Page Facebook nofehezinao (Administrateur). Azonao atao ny mamorona Page vaovao ao amin'ny Facebook.`,
        });
      }
    } catch (err: any) {
      console.error('Error in handleSuccessfulToken:', err);
      setStatus({
        type: 'error',
        message: `Erreur: ${err.message || 'Tsy nahazoana ny Pages Facebook'}`,
      });
    }
  };

  // Launch Direct Meta Popup
  const handleLaunchMetaPopup = () => {
    if (!isAppIdValid) {
      setStatus({
        type: 'error',
        message: "Azafady ampidiro eo amin'ny boaty App ID ny tena App ID Meta Facebook-nao (15 na 16 isa) vao manindry Facebook Login.",
      });
      return;
    }

    // Save app ID locally
    localPersistence.setAppId(cleanAppId);

    setLoading(true);
    setStatus({ type: 'info', message: "Manokatra ny varavarankely Facebook Login..." });

    const scopes = 'pages_show_list,pages_read_engagement,pages_manage_posts,pages_messaging,public_profile,email';
    const oauthUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${cleanAppId}&redirect_uri=${encodeURIComponent(
      popupCallbackUrl
    )}&scope=${encodeURIComponent(scopes)}&response_type=token`;

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      oauthUrl,
      'FacebookLoginPopup',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      setStatus({
        type: 'error',
        message: "Nosakanan'ny navigateur-nao ny popup. Azafady avelao hisokatra ny popup na ampiasao ilay rohy etsy ambany.",
      });
      setLoading(false);
      return;
    }

    // Fallback polling in case postMessage is blocked across domains
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        setLoading(false);
      }
    }, 1000);
  };

  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToken.trim()) return;
    setLoading(true);
    setStatus({ type: 'info', message: "Eo am-pikarohana ny Pages amin'ny alalan'ilay Token..." });
    await handleSuccessfulToken(userToken.trim());
    setLoading(false);
  };

  const explorerUrl = `https://developers.facebook.com/tools/explorer/?app_id=${cleanAppId || ''}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-blue-500/40 bg-slate-900 p-6 shadow-2xl space-y-5 text-slate-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1877F2] text-white shadow-lg shadow-blue-600/40">
            <Facebook className="h-7 w-7 fill-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Facebook Login & Fampidirana Pages
              <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                <Flame className="h-3 w-3 text-amber-400" />
                Firebase Firestore
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Ampidiro mivantana ny tena Pages Facebook-nao amin'ny alalan'ny Meta Graph API.
            </p>
          </div>
        </div>

        {/* Status Message */}
        {status && (
          <div
            className={`rounded-xl p-3.5 text-xs flex items-start gap-2.5 ${
              status.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : status.type === 'error'
                ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                : 'bg-blue-500/10 border border-blue-500/30 text-blue-300'
            }`}
          >
            {status.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : status.type === 'error' ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            ) : (
              <RefreshCw className="h-4 w-4 shrink-0 text-blue-400 animate-spin mt-0.5" />
            )}
            <span className="leading-relaxed font-medium">{status.message}</span>
          </div>
        )}

        {/* Step 1: Meta App ID */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-blue-400" />
              <span>1. Ny Meta App ID-nao (developers.facebook.com) :</span>
            </label>
            <span className="text-[10px] text-slate-500 font-mono">15-16 isa</span>
          </div>
          <input
            type="text"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            placeholder="Ohatra: 14312953392459518"
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
          />
          <p className="text-[11px] text-slate-400">
            Adikao ao amin'ny <strong>developers.facebook.com &gt; Ny App-nao</strong> ny App ID dia apetaho eto.
          </p>
        </div>

        {/* Step 2: Primary One-Click Login Button */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleLaunchMetaPopup}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] py-3.5 px-4 text-sm font-bold text-white shadow-xl shadow-blue-600/30 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Facebook className="h-5 w-5 fill-white" />
            )}
            <span>Se connecter avec Facebook (Popup Direct Meta)</span>
          </button>
          
          <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Tsy mila alalana manokana ao amin'ny Firebase Console
            </span>
            <span className="text-slate-500 font-mono text-[10px]">Graph API v20.0</span>
          </div>
        </div>

        {/* Callback URI Copy Helper */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300">
              Rohy Callback takiana ao amin'ny Meta Facebook Login :
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(popupCallbackUrl);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
            >
              <Copy className="h-3 w-3" />
              <span>{copiedLink ? 'Voadika !' : 'Adikao'}</span>
            </button>
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-blue-300 select-all break-all">
            {popupCallbackUrl}
          </div>
          <p className="text-[10px] text-slate-500">
            Apetaho ao amin'ny <strong>Meta &gt; Facebook Login &gt; Paramètres &gt; URI de redirection OAuth valides</strong> io rohy io.
          </p>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0">
            Na ampidiro ny User Access Token (Explorer)
          </span>
        </div>

        {/* Alternative Method: User Access Token */}
        <form onSubmit={handleManualTokenSubmit} className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              User Access Token (Graph API Explorer) :
            </label>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              <span>Sokafy ny Graph API Explorer</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="EAA..."
              value={userToken}
              onChange={(e) => setUserToken(e.target.value)}
              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !userToken.trim()}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>Ampidiro</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-slate-500">
            Ao amin'ny Explorer: safidio ny App-nao &gt; kitiho ny <strong>"Generate Access Token"</strong> &gt; mariho ny <code>pages_show_list, pages_messaging, pages_read_engagement</code> &gt; apetaho eto.
          </p>
        </form>

        {/* Retrieved Pages Feedback */}
        {retrievedPages.length > 0 && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-3.5 space-y-2">
            <span className="text-xs font-bold text-emerald-300 block">
              Pages voatahiry ao amin'ny Firebase Firestore ({retrievedPages.length}) :
            </span>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {retrievedPages.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="font-semibold text-white">{p.page_name}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">ID: {p.page_id}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Database Persistence Confirmation */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-[11px] text-slate-400 flex items-center gap-2.5">
          <Flame className="h-4 w-4 text-amber-400 shrink-0" />
          <span>
            Voatahiry maharitra ao amin'ny <strong>Firebase Firestore Database</strong> ny kaonty sy ny Pages rehetra.
          </span>
        </div>
      </div>
    </div>
  );
};
