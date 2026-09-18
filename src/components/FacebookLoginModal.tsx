import React, { useState } from 'react';
import {
  Facebook,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { auth, facebookProvider, signInWithPopup } from '../lib/firebase.js';
import { FacebookAuthProvider } from 'firebase/auth';
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
  const [appId, setAppId] = useState(initialMetaAppId || localPersistence.getAppId() || '');
  const [userToken, setUserToken] = useState('');
  const [retrievedPages, setRetrievedPages] = useState<any[]>([]);

  if (!isOpen) return null;

  // 1. Firebase Auth Popup Facebook Login
  const handleFirebaseFacebookLogin = async () => {
    setLoading(true);
    setStatus({ type: 'info', message: 'Mifandray amin\'ny Facebook Login (Firebase Auth)...' });
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      const user = result.user;
      const credential = FacebookAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      // Save user to Firestore
      await firestoreService.saveUser({
        id: user.uid,
        name: user.displayName || 'Utilisateur Facebook',
        email: user.email || '',
        avatar_url: user.photoURL || '',
        created_at: new Date().toISOString(),
      });

      if (accessToken) {
        setUserToken(accessToken);
        setStatus({
          type: 'success',
          message: `✅ Tafiditra soa aman-tsara: ${user.displayName} ! Eo am-pikarohana ny Pages-nao...`,
        });
        await fetchUserPagesWithToken(accessToken);
      } else {
        setStatus({
          type: 'success',
          message: `✅ Tafiditra soa aman-tsara: ${user.displayName} !`,
        });
      }
    } catch (err: any) {
      console.error('Facebook login error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setStatus({ type: 'error', message: 'Nakatonao ilay varavarankely Facebook Login.' });
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setStatus({ type: 'error', message: 'Efa misy kaonty hafa mampiasa io adiresy mailaka io.' });
      } else {
        setStatus({
          type: 'info',
          message: `Fanamarihana: ${err.message || 'Mila ampidirina ao amin\'ny Meta App ny Facebook Login URI na mampiasa ny fomba fampidirana mivantana etsy ambany.'}`,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch pages with user access token
  const fetchUserPagesWithToken = async (token: string) => {
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${token}&fields=id,name,category,picture{url},access_token,fan_count`);
      const data = await res.json();
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        const pagesToImport: FacebookPage[] = [];
        for (const item of data.data) {
          const newPage: FacebookPage = {
            id: `fb_${item.id}`,
            user_id: 'usr_fb',
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
          // Save to server
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
        }
        // Save to Firestore
        await firestoreService.savePages(pagesToImport);
        setRetrievedPages(pagesToImport);
        if (onPagesImported) onPagesImported(pagesToImport);
        setStatus({
          type: 'success',
          message: `🎉 Nahomby ! Pages ${pagesToImport.length} no voaray sy nampidirina tao amin'ny Firebase Firestore !`,
        });
      }
    } catch (err: any) {
      console.warn('Error fetching pages with token:', err);
    }
  };

  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToken.trim()) return;
    setLoading(true);
    await fetchUserPagesWithToken(userToken.trim());
    setLoading(false);
  };

  const origin = window.location.origin;
  const directOAuthUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${
    appId || '14312953392459518'
  }&redirect_uri=${encodeURIComponent(
    `${origin}/api/facebook/oauth/callback`
  )}&scope=pages_show_list,pages_read_engagement,pages_manage_posts,pages_messaging,public_profile,email&response_type=code`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-blue-500/40 bg-slate-900 p-6 shadow-2xl space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
            <Facebook className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Se connecter avec Facebook
              <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                <Flame className="h-3 w-3 text-amber-400" />
                Firebase Firestore
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Ampifandraiso ny kaonty Facebook-nao mba hampidirana ho azy ny tena Pages-nao.
            </p>
          </div>
        </div>

        {/* Status Message */}
        {status && (
          <div
            className={`rounded-xl p-3 text-xs flex items-start gap-2.5 ${
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
            <span className="leading-relaxed">{status.message}</span>
          </div>
        )}

        {/* Primary Action: Firebase Facebook Login */}
        <div className="space-y-3">
          <button
            onClick={handleFirebaseFacebookLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-blue-600 py-3.5 px-4 text-sm font-bold text-white shadow-xl shadow-blue-600/30 hover:bg-blue-500 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Facebook className="h-5 w-5 fill-white" />
            )}
            <span>Se connecter avec Facebook (Popup Rapide)</span>
          </button>

          <a
            href={directOAuthUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 px-4 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <span>Na sokafy amin'ny varavarankely Meta OAuth vaovao</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0">
            Na ampidiro ny User Token
          </span>
        </div>

        {/* User Token Direct Input */}
        <form onSubmit={handleManualTokenSubmit} className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            User Access Token na Page Token (Graph API Explorer) :
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="EAA..."
              value={userToken}
              onChange={(e) => setUserToken(e.target.value)}
              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !userToken.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <span>Raiso ny Pages</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-slate-500">
            Azo alaina ao amin'ny <strong>developers.facebook.com/tools/explorer</strong>
          </p>
        </form>

        {/* Firestore Persistence Notice */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-[11px] text-slate-400 flex items-center gap-2">
          <Flame className="h-4 w-4 text-amber-400 shrink-0" />
          <span>
            Voatahiry ao amin'ny <strong>Firebase Firestore Database</strong> ny angon-drakitra rehetra.
          </span>
        </div>
      </div>
    </div>
  );
};
