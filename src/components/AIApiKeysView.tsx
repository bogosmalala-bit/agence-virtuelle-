import React, { useState } from 'react';
import {
  Layers,
  Key,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Activity,
  ShieldCheck,
  RotateCcw,
  X,
  Play,
  Cpu,
  Eye,
  Mic,
  Sparkles,
} from 'lucide-react';
import { AIApiKeyConfig } from '../types.js';

export const AVAILABLE_GEMINI_MODELS = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    role: 'Vente & Messenger (Recommandé)',
    description: 'Modèle haute performance ultra-réactif pour l\'accueil, les commandes 7 champs et la négociation.',
    badgeColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-500/30',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    role: 'Raisonnement & Devis Avancés',
    description: 'Modèle de raisonnement complexe pour les devis sur mesure, calculs et cas clients délicats.',
    badgeColor: 'text-indigo-400 bg-indigo-950/80 border-indigo-500/30',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    role: 'Vitesse Éclair & FAQ',
    description: 'Modèle ultra-rapide à latence minimale pour réponses instantanées et questions fréquentes.',
    badgeColor: 'text-amber-400 bg-amber-950/80 border-amber-500/30',
  },
  {
    id: 'gemini-3.1-flash-image',
    name: 'Gemini 3.1 Flash Image',
    role: 'Vision & Multimodal',
    description: 'Inspection visuelle de photos de produits, reçus Mobile Money et captures d\'écran.',
    badgeColor: 'text-pink-400 bg-pink-950/80 border-pink-500/30',
  },
  {
    id: 'gemini-3.5-transcribe',
    name: 'Gemini 3.5 Transcribe',
    role: 'Audio & Messages Vocaux',
    description: 'Transcription et compréhension des messages vocaux Messenger des clients.',
    badgeColor: 'text-cyan-400 bg-cyan-950/80 border-cyan-500/30',
  },
];

interface AIApiKeysViewProps {
  apiKeys: AIApiKeyConfig[];
  onAddOrUpdateKey: (slot: number, name: string, rawKey: string, model?: string) => Promise<void>;
  onTestKey: (id: string) => Promise<{ success: boolean; message: string; slotUsed: number; modelUsed?: string }>;
  onResetKeyStatus: (id: string) => Promise<void>;
}

export const AIApiKeysView: React.FC<AIApiKeysViewProps> = ({
  apiKeys,
  onAddOrUpdateKey,
  onTestKey,
  onResetKeyStatus,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const [keyName, setKeyName] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [rawKeyInput, setRawKeyInput] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openAddKeyModal = (slotNumber?: number) => {
    const s = slotNumber || 1;
    const existing = apiKeys.find((k) => k.slot === s);
    setSelectedSlot(s);
    setKeyName(existing?.name || `Gemini Slot ${s}`);
    setSelectedModel(existing?.model || AVAILABLE_GEMINI_MODELS[s - 1]?.id || 'gemini-3.8-flash');
    setRawKeyInput('');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawKeyInput.trim()) {
      setErrorMsg('Veuillez renseigner la clé API.');
      return;
    }

    try {
      await onAddOrUpdateKey(selectedSlot, keyName.trim(), rawKeyInput.trim(), selectedModel);
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleRunDiagnostic = async (keyConfig: AIApiKeyConfig) => {
    setTestingId(keyConfig.id);
    setTestResult(null);
    try {
      const res = await onTestKey(keyConfig.id);
      setTestResult({ id: keyConfig.id, message: res.message });
    } catch (err: any) {
      setTestResult({ id: keyConfig.id, message: `Échec : ${err.message}` });
    } finally {
      setTestingId(null);
    }
  };

  // Ensure 5 slots are represented
  const allSlots = [1, 2, 3, 4, 5].map((slotNum) => {
    const existing = apiKeys.find((k) => k.slot === slotNum);
    const defaultMeta = AVAILABLE_GEMINI_MODELS[slotNum - 1];
    return (
      existing || {
        id: `key_slot_${slotNum}`,
        slot: slotNum,
        name: `${defaultMeta.name} (Slot ${slotNum})`,
        model: defaultMeta.id,
        model_description: defaultMeta.description,
        masked_key: 'AIzaSy... (Système Intégré)',
        status: 'ACTIVE' as const,
        request_count: 0,
        error_count: 0,
      }
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-400" />
            IA Gemini par Défaut (5 Modèles Intégrés & Rotation)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            5 maodely Gemini samy hafa efa tafiditra par défaut avy amintsika, vonona hiasa ho an'ny fivarotana sy ny Messenger.
          </p>
        </div>

        <button
          onClick={() => openAddKeyModal()}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Personnaliser une Clé / Modèle</span>
        </button>
      </div>

      {/* 5 Models Explanation Banner */}
      <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 p-4 text-xs text-blue-200">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-blue-400 mt-0.5" />
          <div className="space-y-1.5">
            <h3 className="font-bold text-white text-sm">
              Ireo Modely Gemini 5 Tafiditra Par Défaut :
            </h3>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Miasa avy hatrany amin'ny alalan'ny motera Gemini ao amin'ny backend. Misy fihodinana (rotation automatique) raha sendra mahatratra fetran'ny fangatahana (quota/rate limit) ny iray.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-2">
              {AVAILABLE_GEMINI_MODELS.map((m, idx) => (
                <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-950/80 p-2.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-white">
                    <span>Slot #{idx + 1}</span>
                    <span className="text-emerald-400">ACTIF</span>
                  </div>
                  <div className="font-bold text-xs text-blue-300 mt-1">{m.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{m.role}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5 Slots Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allSlots.map((keySlot) => {
          const isSlotActive = keySlot.status === 'ACTIVE';
          const isQuota = keySlot.status === 'QUOTA_LIMIT';
          const isError = keySlot.status === 'ERROR';
          const meta = AVAILABLE_GEMINI_MODELS.find((m) => m.id === keySlot.model) || AVAILABLE_GEMINI_MODELS[keySlot.slot - 1] || AVAILABLE_GEMINI_MODELS[0];

          return (
            <div
              key={keySlot.slot}
              className={`flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                isSlotActive
                  ? 'border-emerald-500/40 bg-slate-900/90 shadow-lg shadow-emerald-500/5'
                  : isQuota
                  ? 'border-amber-500/50 bg-amber-950/20'
                  : isError
                  ? 'border-red-500/50 bg-red-950/20'
                  : 'border-slate-800 bg-slate-950/60 opacity-80'
              }`}
            >
              <div>
                {/* Header: Slot Badge & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-white">
                      #{keySlot.slot}
                    </span>
                    <div>
                      <h3 className="font-bold text-xs text-white truncate max-w-[150px]">
                        {keySlot.name}
                      </h3>
                      <span className="text-[10px] text-slate-400">{meta?.role}</span>
                    </div>
                  </div>

                  <div>
                    {isSlotActive ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
                        <CheckCircle2 className="h-3 w-3" /> ACTIF
                      </span>
                    ) : isQuota ? (
                      <span className="flex items-center gap-1 rounded-full bg-amber-950 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/40">
                        <Clock className="h-3 w-3" /> QUOTA REPOS
                      </span>
                    ) : isError ? (
                      <span className="flex items-center gap-1 rounded-full bg-red-950 px-2 py-0.5 text-[10px] font-bold text-red-300 border border-red-500/40">
                        <AlertTriangle className="h-3 w-3" /> ERREUR
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                        EN ATTENTE
                      </span>
                    )}
                  </div>
                </div>

                {/* Model ID Badge & Description */}
                <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-blue-300">
                    <Cpu className="h-3.5 w-3.5 text-blue-400" />
                    <span>{keySlot.model || meta.id}</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">
                    {keySlot.masked_key || 'Système Intégré'}
                  </span>
                </div>

                <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                  {keySlot.model_description || meta?.description}
                </p>

                {/* Metrics */}
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-3 text-center">
                  <div className="rounded-lg bg-slate-950/60 p-2">
                    <span className="block text-[10px] text-slate-500">Requêtes</span>
                    <span className="text-xs font-bold text-white">{keySlot.request_count}</span>
                  </div>
                  <div className="rounded-lg bg-slate-950/60 p-2">
                    <span className="block text-[10px] text-slate-500">Erreurs</span>
                    <span className="text-xs font-bold text-red-400">{keySlot.error_count}</span>
                  </div>
                  <div className="rounded-lg bg-slate-950/60 p-2">
                    <span className="block text-[10px] text-slate-500">Latence</span>
                    <span className="text-xs font-bold text-blue-400">
                      {keySlot.latency_ms ? `${keySlot.latency_ms}ms` : '—'}
                    </span>
                  </div>
                </div>

                {/* Diagnostic Test result box */}
                {testResult && testResult.id === keySlot.id && (
                  <div className="mt-2 rounded-lg bg-blue-950/40 p-2.5 border border-blue-500/30 text-[11px] text-blue-200">
                    <div className="font-bold text-emerald-400 flex items-center gap-1 mb-0.5">
                      <CheckCircle2 className="h-3 w-3" /> Test du modèle réussi :
                    </div>
                    {testResult.message}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3">
                <button
                  onClick={() => openAddKeyModal(keySlot.slot)}
                  className="text-[11px] font-semibold text-blue-400 hover:text-blue-300"
                >
                  Configurer / Clé
                </button>

                <div className="flex items-center gap-2">
                  {isQuota && (
                    <button
                      onClick={() => onResetKeyStatus(keySlot.id)}
                      className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-950/40 px-2 py-1 text-[10px] font-semibold text-amber-300 hover:bg-amber-900/60"
                      title="Forcer la réactivation du slot immédiatement"
                    >
                      <RotateCcw className="h-3 w-3" /> Réactiver
                    </button>
                  )}

                  <button
                    onClick={() => handleRunDiagnostic(keySlot)}
                    disabled={testingId === keySlot.id}
                    className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    {testingId === keySlot.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    <span>Tester</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Update Key Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="h-4 w-4 text-blue-400" />
                Configurer le Slot #{selectedSlot} & Modèle Gemini
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-3 rounded-xl border border-red-500/30 bg-red-950/40 p-2.5 text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveKey} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Numéro de Slot de Rotation
                </label>
                <select
                  value={selectedSlot}
                  onChange={(e) => {
                    const s = Number(e.target.value);
                    setSelectedSlot(s);
                    setSelectedModel(AVAILABLE_GEMINI_MODELS[s - 1]?.id || 'gemini-3.8-flash');
                  }}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  {[1, 2, 3, 4, 5].map((s) => (
                    <option key={s} value={s}>
                      Slot #{s} {s === 1 ? '(Priorité Principale)' : `(Failover #${s})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Modèle Gemini Assigné à ce Slot
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  {AVAILABLE_GEMINI_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Nom d'identification du Slot
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Clé API Gemini Personnalisée (Stockée de manière chiffrée sur le serveur) *
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={rawKeyInput}
                  onChange={(e) => setRawKeyInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none font-mono"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  La clé ne sera jamais transmise en clair au navigateur web.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 font-semibold text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 font-bold text-white hover:bg-blue-500"
                >
                  Enregistrer dans le Pool
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
