import React, { useState } from 'react';
import {
  Bot,
  Sliders,
  Shield,
  Phone,
  Bell,
  CheckCircle2,
  Sparkles,
  Save,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  Cpu,
  Zap,
  Eye,
  Mic,
  Activity,
} from 'lucide-react';
import { AssistantSettings } from '../types.js';

interface AssistantSettingsViewProps {
  settings: AssistantSettings;
  onUpdateSettings: (newSettings: Partial<AssistantSettings>) => Promise<void>;
}

export const AssistantSettingsView: React.FC<AssistantSettingsViewProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [name, setName] = useState(settings.name);
  const [defaultModel, setDefaultModel] = useState(settings.default_model || 'gemini-3.8-flash');
  const [tone, setTone] = useState(settings.tone);
  const [language, setLanguage] = useState(settings.primary_language);
  const [assistanceType, setAssistanceType] = useState(settings.assistance_type);
  const [customInstructions, setCustomInstructions] = useState(settings.custom_instructions);
  const [operatorPhone, setOperatorPhone] = useState(settings.operator_phone || '');
  const [fcmEnabled, setFcmEnabled] = useState(settings.fcm_enabled);
  const [smsEnabled, setSmsEnabled] = useState(settings.sms_enabled);
  const [isActive, setIsActive] = useState(settings.is_active);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await onUpdateSettings({
        name,
        default_model: defaultModel,
        tone,
        primary_language: language,
        assistance_type: assistanceType,
        custom_instructions: customInstructions,
        operator_phone: operatorPhone,
        fcm_enabled: fcmEnabled,
        sms_enabled: smsEnabled,
        is_active: isActive,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-400" />
            Paramètres & Intelligence de l'Assistante IA
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configurez la personnalité, le mode opérationnel (VENTE ou TRAVAIL) et les règles d'or strictes de votre assistante.
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/60 px-3.5 py-1.5 text-xs font-bold text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Paramètres enregistrés avec succès !</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Main Status & Identity Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-400" />
              Identité & Activation Globale
            </h3>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-800 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full"></div>
              <span className="ml-2 text-xs font-bold text-slate-300">
                {isActive ? 'IA Activée' : 'IA en Pause'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Nom de l'Assistante Virtuelle *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Tonalité de Communication
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Professionnel, courtois et chaleureux">
                  Professionnel & Chaleureux
                </option>
                <option value="Amical, enthousiaste et dynamique">
                  Amical & Enthousiaste
                </option>
                <option value="Direct, précis et commercial">
                  Direct & Commercial
                </option>
                <option value="Élégant et sobre">Élégant & Sobre</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Langue Principale
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Français (avec adaptation Malagasy si le client s'exprime en Malagasy)">
                  Français + Malagasy naturel
                </option>
                <option value="Français exclusivement">Français exclusivement</option>
                <option value="Malagasy officiel">Malagasy officiel</option>
              </select>
            </div>
          </div>
        </div>

        {/* 5 Models Gemini Par Défaut Selector Card */}
        <div className="rounded-2xl border border-blue-500/30 bg-slate-900/90 p-5 space-y-4 shadow-xl shadow-blue-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3 gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-400" />
                Moteur IA Gemini Par Défaut (5 Modèles Intégrés)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Safidio ny maodely Gemini tianao hampiasain'ny mpanampy anao amin'ny fifampiresahana Messenger sy fivarotana.
              </p>
            </div>
            <span className="self-start sm:self-auto rounded-full bg-blue-950 px-2.5 py-0.5 text-[11px] font-bold text-blue-300 border border-blue-500/30">
              5 Modèles Disponibles
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Model 1: gemini-3.8-flash */}
            <div
              onClick={() => setDefaultModel('gemini-3.8-flash')}
              className={`cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                defaultModel === 'gemini-3.8-flash'
                  ? 'border-blue-500 bg-blue-950/30 shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
                  : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                    <Zap className="h-3 w-3" /> Recommandé
                  </span>
                  <input
                    type="radio"
                    name="geminiModel"
                    checked={defaultModel === 'gemini-3.8-flash'}
                    onChange={() => setDefaultModel('gemini-3.8-flash')}
                    className="h-3.5 w-3.5 text-blue-500"
                  />
                </div>
                <h4 className="font-bold text-xs text-white">Gemini 3.8 Flash</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  <strong>Vente & Messenger</strong> : Réponse ultra-rapide, accueil client fluide, excellente négociation de prix et prise de commandes 7 champs.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                <span>Modèle : gemini-3.8-flash</span>
                <span className="text-emerald-400 font-semibold">Par Défaut</span>
              </div>
            </div>

            {/* Model 2: gemini-3.1-pro-preview */}
            <div
              onClick={() => setDefaultModel('gemini-3.1-pro-preview')}
              className={`cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                defaultModel === 'gemini-3.1-pro-preview'
                  ? 'border-blue-500 bg-blue-950/30 shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
                  : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-400">
                    <Cpu className="h-3 w-3" /> Raisonnement
                  </span>
                  <input
                    type="radio"
                    name="geminiModel"
                    checked={defaultModel === 'gemini-3.1-pro-preview'}
                    onChange={() => setDefaultModel('gemini-3.1-pro-preview')}
                    className="h-3.5 w-3.5 text-blue-500"
                  />
                </div>
                <h4 className="font-bold text-xs text-white">Gemini 3.1 Pro</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  <strong>Raisonnement Avancé</strong> : Analyse détaillée, calculs précis de devis, argumentaires de vente poussés et gestion des cas clients délicats.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                <span>Modèle : gemini-3.1-pro-preview</span>
                <span className="text-indigo-400 font-semibold">Expert</span>
              </div>
            </div>

            {/* Model 3: gemini-3.1-flash-lite */}
            <div
              onClick={() => setDefaultModel('gemini-3.1-flash-lite')}
              className={`cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                defaultModel === 'gemini-3.1-flash-lite'
                  ? 'border-blue-500 bg-blue-950/30 shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
                  : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                    <Activity className="h-3 w-3" /> Ultra-Rapide
                  </span>
                  <input
                    type="radio"
                    name="geminiModel"
                    checked={defaultModel === 'gemini-3.1-flash-lite'}
                    onChange={() => setDefaultModel('gemini-3.1-flash-lite')}
                    className="h-3.5 w-3.5 text-blue-500"
                  />
                </div>
                <h4 className="font-bold text-xs text-white">Gemini 3.1 Flash-Lite</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  <strong>Latence Minimale</strong> : Réponses instantanées en quelques millisecondes pour les questions fréquentes, salutations et tarifs.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                <span>Modèle : gemini-3.1-flash-lite</span>
                <span className="text-amber-400 font-semibold">Éclair</span>
              </div>
            </div>

            {/* Model 4: gemini-3.1-flash-image */}
            <div
              onClick={() => setDefaultModel('gemini-3.1-flash-image')}
              className={`cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                defaultModel === 'gemini-3.1-flash-image'
                  ? 'border-blue-500 bg-blue-950/30 shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
                  : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-pink-400">
                    <Eye className="h-3 w-3" /> Vision & Image
                  </span>
                  <input
                    type="radio"
                    name="geminiModel"
                    checked={defaultModel === 'gemini-3.1-flash-image'}
                    onChange={() => setDefaultModel('gemini-3.1-flash-image')}
                    className="h-3.5 w-3.5 text-blue-500"
                  />
                </div>
                <h4 className="font-bold text-xs text-white">Gemini 3.1 Flash Image</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  <strong>Vision & Multimodal</strong> : Analyse des photos d'articles envoyées par les clients, détection de captures d'écran et reçus Mobile Money.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                <span>Modèle : gemini-3.1-flash-image</span>
                <span className="text-pink-400 font-semibold">Multimodal</span>
              </div>
            </div>

            {/* Model 5: gemini-3.5-transcribe */}
            <div
              onClick={() => setDefaultModel('gemini-3.5-transcribe')}
              className={`cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                defaultModel === 'gemini-3.5-transcribe'
                  ? 'border-blue-500 bg-blue-950/30 shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
                  : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-cyan-400">
                    <Mic className="h-3 w-3" /> Audio & Vocaux
                  </span>
                  <input
                    type="radio"
                    name="geminiModel"
                    checked={defaultModel === 'gemini-3.5-transcribe'}
                    onChange={() => setDefaultModel('gemini-3.5-transcribe')}
                    className="h-3.5 w-3.5 text-blue-500"
                  />
                </div>
                <h4 className="font-bold text-xs text-white">Gemini 3.5 Transcribe</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  <strong>Audio & Messages Vocaux</strong> : Spécialisé pour transcrire et comprendre les notes vocales envoyées sur Messenger par les clients.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                <span>Modèle : gemini-3.5-transcribe</span>
                <span className="text-cyan-400 font-semibold">Audio</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mode d'Assistance Card (VENTE vs TRAVAIL) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            Mode d'Assistance Opérationnel (VENTE vs TRAVAIL)
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Mode VENTE */}
            <div
              onClick={() => setAssistanceType('VENTE')}
              className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                assistanceType === 'VENTE'
                  ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-500/10'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-emerald-950 px-2.5 py-0.5 text-xs font-black text-emerald-400 border border-emerald-500/40">
                  MODE VENTE (Recommandé)
                </span>
                <input
                  type="radio"
                  name="mode"
                  checked={assistanceType === 'VENTE'}
                  onChange={() => setAssistanceType('VENTE')}
                  className="h-4 w-4 text-emerald-500"
                />
              </div>
              <p className="mt-3 text-xs text-slate-300 font-semibold leading-relaxed">
                L'assistante répond aux questions, conseille les produits et <strong>PREND LES COMMANDES</strong> en collectant obligatoirement les 7 champs clés (Nom réel, Nom Facebook, Produit, Quantité, Téléphone, Total en Ar, Adresse précise avec Repère).
              </p>
            </div>

            {/* Mode TRAVAIL */}
            <div
              onClick={() => setAssistanceType('TRAVAIL')}
              className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                assistanceType === 'TRAVAIL'
                  ? 'border-blue-500 bg-blue-950/20 shadow-lg shadow-blue-500/10'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-blue-950 px-2.5 py-0.5 text-xs font-black text-blue-400 border border-blue-500/40">
                  MODE TRAVAIL (Informationnel)
                </span>
                <input
                  type="radio"
                  name="mode"
                  checked={assistanceType === 'TRAVAIL'}
                  onChange={() => setAssistanceType('TRAVAIL')}
                  className="h-4 w-4 text-blue-500"
                />
              </div>
              <p className="mt-3 text-xs text-slate-300 font-semibold leading-relaxed">
                L'assistante explique les produits/services et répond aux questions techniques, mais a <strong>INTERDICTION STRICTE DE PRENDRE DES COMMANDES</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Custom Rules & Golden Directives Editor */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-400" />
              Consignes & Directives Spécifiques pour l'IA
            </h3>
            <span className="text-[11px] text-slate-400">
              Injectées dans le prompt système de chaque requête
            </span>
          </div>

          <div>
            <textarea
              rows={4}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Ex: Préciser que la livraison à Antananarivo se fait sous 24h ouvrées. Ne jamais promettre de remise sans accord de l'administrateur..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none leading-relaxed"
            />
          </div>

          <div className="rounded-xl bg-slate-950 p-3 text-[11px] text-slate-400 space-y-1 border border-slate-800">
            <p className="font-bold text-slate-300">Règles fondamentales appliquées par défaut :</p>
            <p>✓ Ne JAMAIS inventer un produit, prix en Ariary ou niveau de stock absent de la fiche.</p>
            <p>✓ Partager les visuels / fichiers médias sur demande explicite du client.</p>
            <p>✓ Proposer un transfert opérateur en cas de demande complexe ou litige.</p>
          </div>
        </div>

        {/* Operator Phone & Notifications Config */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Bell className="h-4 w-4 text-purple-400" />
            Alertes Opérateur (Firebase Push FCM & SMS)
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Numéro de Téléphone de l'Opérateur
              </label>
              <input
                type="tel"
                value={operatorPhone}
                onChange={(e) => setOperatorPhone(e.target.value)}
                placeholder="Ex: 034 00 123 45"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fcmEnabled}
                  onChange={(e) => setFcmEnabled(e.target.checked)}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-300">
                  Activer Push Notifications (Firebase FCM)
                </span>
              </label>
              <span className="text-[10px] text-slate-500 mt-1">
                Alertes immédiates pour nouvelles commandes & transferts
              </span>
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsEnabled}
                  onChange={(e) => setSmsEnabled(e.target.checked)}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-300">
                  Activer Alertes SMS (Passerelle SMS)
                </span>
              </label>
              <span className="text-[10px] text-slate-500 mt-1">
                Envoi de SMS direct sur le téléphone opérateur
              </span>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-95 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Enregistrement en cours...' : 'Enregistrer tous les Paramètres'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
