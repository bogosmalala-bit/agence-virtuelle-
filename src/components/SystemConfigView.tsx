import React, { useState, useEffect } from 'react';
import {
  Key,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Radio,
  Send,
  HelpCircle,
  Facebook,
  Bell,
  Smartphone,
  RotateCcw,
} from 'lucide-react';
import { SystemConfig } from '../types.js';
import { localPersistence } from '../lib/storage.js';

interface SystemConfigViewProps {
  onConfigSaved?: () => void;
}

export const SystemConfigView: React.FC<SystemConfigViewProps> = ({ onConfigSaved }) => {
  const [config, setConfig] = useState<SystemConfig>({
    meta_app_id: localPersistence.getAppId() || '',
    meta_app_secret: localPersistence.getAppSecret() || '',
    meta_verify_token: 'assistante_virtuelle_webhook_verify_token',
    firebase_fcm_server_key: '',
    operator_phone_number: '+261 34 00 000 00',
    sms_gateway_api_key: '',
  });

  const [showMetaSecret, setShowMetaSecret] = useState(false);
  const [showFcmKey, setShowFcmKey] = useState(false);
  const [showSmsKey, setShowSmsKey] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingService, setTestingService] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ service: string; message: string } | null>(null);

  useEffect(() => {
    fetch('/api/system/config')
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          const appId = data.meta_app_id || localPersistence.getAppId() || '';
          const appSecret = data.meta_app_secret || localPersistence.getAppSecret() || '';
          if (appId) localPersistence.setAppId(appId);
          if (appSecret) localPersistence.setAppSecret(appSecret);

          setConfig({
            meta_app_id: appId,
            meta_app_secret: appSecret,
            meta_verify_token: data.meta_verify_token || 'assistante_virtuelle_webhook_verify_token',
            firebase_fcm_server_key: data.firebase_fcm_server_key || '',
            operator_phone_number: data.operator_phone_number || '+261 34 00 000 00',
            sms_gateway_api_key: data.sms_gateway_api_key || '',
          });
        }
      })
      .catch((err) => console.error('Erreur chargement config système:', err));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      if (config.meta_app_id) localPersistence.setAppId(config.meta_app_id);
      if (config.meta_app_secret) localPersistence.setAppSecret(config.meta_app_secret);

      const res = await fetch('/api/system/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaveSuccess(true);
        if (onConfigSaved) onConfigSaved();
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestService = async (service: string) => {
    setTestingService(service);
    setTestResult(null);
    try {
      const res = await fetch('/api/system/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service }),
      });
      const data = await res.json();
      setTestResult({ service, message: data.message });
    } catch (err: any) {
      setTestResult({ service, message: `Erreur : ${err.message}` });
    } finally {
      setTestingService(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-400" />
            Configuration des Identifiants & Clés Directes sur le Site
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Renseignez ici directement vos identifiants Meta Facebook, Webhooks, Firebase et SMS sans aucun blocage.
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/70 px-4 py-2 text-xs font-bold text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Identifiants enregistrés et synchronisés en temps réel !</span>
          </div>
        )}
      </div>

      {/* Malagasy & French Quick Note */}
      <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4 text-xs text-blue-200 flex items-start gap-3 shadow-lg">
        <ShieldCheck className="h-5 w-5 shrink-0 text-blue-400 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-white">Fampidirana mivantana ato amin'ny tranonkala (Saisie directe sur le site) :</p>
          <p className="text-[11px] text-blue-300 leading-relaxed">
            Ireo fampahalalana rehetra (Meta App, Secret, Firebase, Numéro de téléphone) dia azonao ovaina sy ampidirina mivantana eto amin'ity takelaka ity. Voatahiry sy mandeha avy hatrany amin'ny fotoana tena izy (en temps réel) ireo rehetra ireo.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: META FACEBOOK GRAPH API */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
                <Facebook className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Meta Facebook App & Graph API</h3>
                <p className="text-[11px] text-slate-400">Identifiants de votre Application Meta for Developers</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleTestService('meta')}
              disabled={testingService === 'meta'}
              className="flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-950/50 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-900/40"
            >
              <Radio className="h-3.5 w-3.5" />
              <span>{testingService === 'meta' ? 'Vérification...' : 'Tester Meta'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
            {/* Meta App ID */}
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                META_APP_ID (ID de l'Application Meta)
              </label>
              <input
                type="text"
                value={config.meta_app_id}
                onChange={(e) => setConfig({ ...config, meta_app_id: e.target.value })}
                placeholder="Ex: 102938475628192"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 font-mono text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Trouvable dans votre console Meta for Developers &gt; Paramètres de base.
              </span>
            </div>

            {/* Meta App Secret */}
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                META_APP_SECRET (Clé Secrète Meta)
              </label>
              <div className="relative">
                <input
                  type={showMetaSecret ? 'text' : 'password'}
                  value={config.meta_app_secret}
                  onChange={(e) => setConfig({ ...config, meta_app_secret: e.target.value })}
                  placeholder="Ex: 9f8e7d6c5b4a3120ef..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 pr-10 font-mono text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowMetaSecret(!showMetaSecret)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showMetaSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Permet la validation cryptographique des webhooks Meta Graph API.
              </span>
            </div>
          </div>

          {/* Meta Verify Token */}
          <div className="text-xs">
            <label className="block font-bold text-slate-300 mb-1">
              META_VERIFY_TOKEN (Jeton de Vérification Webhook)
            </label>
            <input
              type="text"
              value={config.meta_verify_token}
              onChange={(e) => setConfig({ ...config, meta_verify_token: e.target.value })}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 font-mono text-white focus:border-blue-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              À copier tel quel dans Meta Webhooks lors de la configuration du callback.
            </span>
          </div>

          {/* Quick Notice about Facebook Login URLs */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-950/30 p-3 text-[11px] text-blue-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Facebook className="h-4 w-4 text-blue-400 shrink-0" />
              <span>
                Ireo rohy rehetra (<strong>Redirect URIs, Privacy Policy, Terms, Data Deletion</strong>) dia hita sy azo adika mivantana ao amin'ny menu <strong>« Pages & Webhook Meta »</strong>.
              </span>
            </span>
          </div>
        </div>

        {/* SECTION 2: NOTIFICATIONS (FIREBASE FCM & SMS) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Alertes Opérateur (Firebase Push FCM & SMS)</h3>
                <p className="text-[11px] text-slate-400">Diffusion instantanée pour chaque nouvelle commande validée</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTestService('fcm')}
                disabled={testingService === 'fcm'}
                className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-950/50 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-900/40"
              >
                <span>{testingService === 'fcm' ? 'Test FCM...' : 'Tester Push'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleTestService('sms')}
                disabled={testingService === 'sms'}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/50 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-900/40"
              >
                <span>{testingService === 'sms' ? 'Test SMS...' : 'Tester SMS'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
            {/* Operator Phone Number */}
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                OPERATOR_PHONE_NUMBER (Téléphone Opérateur)
              </label>
              <input
                type="text"
                value={config.operator_phone_number}
                onChange={(e) => setConfig({ ...config, operator_phone_number: e.target.value })}
                placeholder="+261 34 00 000 00"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 font-mono text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Numéro mobile recevant les alertes SMS et notifications d'urgence.
              </span>
            </div>

            {/* Firebase Server Key */}
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                FIREBASE_FCM_SERVER_KEY (Clé FCM)
              </label>
              <div className="relative">
                <input
                  type={showFcmKey ? 'text' : 'password'}
                  value={config.firebase_fcm_server_key}
                  onChange={(e) => setConfig({ ...config, firebase_fcm_server_key: e.target.value })}
                  placeholder="AAAA..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 pr-10 font-mono text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowFcmKey(!showFcmKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showFcmKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Clé serveur de messagerie Cloud Messaging Firebase.
              </span>
            </div>

            {/* SMS Gateway Key */}
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                SMS_GATEWAY_API_KEY (Clé Passerelle SMS)
              </label>
              <div className="relative">
                <input
                  type={showSmsKey ? 'text' : 'password'}
                  value={config.sms_gateway_api_key}
                  onChange={(e) => setConfig({ ...config, sms_gateway_api_key: e.target.value })}
                  placeholder="Clé SMS..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 pr-10 font-mono text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSmsKey(!showSmsKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showSmsKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Passerelle SMS locale (Twilio, Orange API ou passerelle personnalisée).
              </span>
            </div>
          </div>
        </div>

        {/* Live Test Feedback Banner */}
        {testResult && (
          <div className="rounded-xl border border-blue-500/40 bg-blue-950/60 p-3.5 text-xs text-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Test en Direct [{testResult.service}] :</strong> {testResult.message}
              </span>
            </div>
            <span className="rounded bg-blue-900 px-2 py-0.5 text-[10px] font-bold text-white">
              En direct
            </span>
          </div>
        )}

        {/* Save Submit Button */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-400">
            Les modifications prennent effet immédiatement en temps réel sans redémarrage.
          </p>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:opacity-95 active:scale-95 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Enregistrement en direct...' : 'Enregistrer sur le Site'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
