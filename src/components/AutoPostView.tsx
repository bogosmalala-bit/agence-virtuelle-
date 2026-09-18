import React, { useState } from 'react';
import {
  Sparkles,
  Clock,
  Send,
  Calendar,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Palette,
  Sliders,
} from 'lucide-react';
import { Product, AudienceInsight } from '../types.js';

interface AutoPostViewProps {
  products: Product[];
  insights: AudienceInsight[];
  onSchedulePost: (postData: any) => Promise<void>;
  onPublishNowDirect: (postData: any) => Promise<void>;
}

export const AutoPostView: React.FC<AutoPostViewProps> = ({
  products,
  insights,
  onSchedulePost,
  onPublishNowDirect,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [toneStyle, setToneStyle] = useState('Accrocheur, chaleureux avec emojis et appel à l\'action clair');
  const [targetAudience, setTargetAudience] = useState('Clients à Madagascar (Antananarivo & provinces)');
  const [isGenerating, setIsGenerating] = useState(false);

  // AI Generated Result State
  const [generatedResult, setGeneratedResult] = useState<{
    post_text: string;
    visual_headline: string;
    visual_subline: string;
    visual_badge: string;
    recommended_hour: string;
    product: Product;
    default_image?: string;
  } | null>(null);

  const [customScheduledDate, setCustomScheduledDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [customScheduledTime, setCustomScheduledTime] = useState('18:30');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setSuccessNotice(null);
    try {
      const res = await fetch('/api/posts/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProductId,
          tone_style: toneStyle,
          audience_target: targetAudience,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedResult({
          post_text: data.generated.post_text,
          visual_headline: data.generated.visual_headline || data.product.name,
          visual_subline: data.generated.visual_subline || 'Qualité premium & Livraison rapide',
          visual_badge: data.generated.visual_badge || `${data.product.price?.toLocaleString('fr-FR')} Ar`,
          recommended_hour: data.generated.recommended_hour || '18:30',
          product: data.product,
          default_image: data.default_image,
        });
        setCustomScheduledTime(data.generated.recommended_hour || '18:30');
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScheduleFromAI = async () => {
    if (!generatedResult) return;
    try {
      await onSchedulePost({
        content: generatedResult.post_text,
        product_id: generatedResult.product.id,
        product_name: generatedResult.product.name,
        media_url: generatedResult.default_image,
        media_type: 'IMAGE',
        scheduled_date: customScheduledDate,
        scheduled_time: customScheduledTime,
        is_ai_generated: true,
      });
      setSuccessNotice('Publication programmée avec succès pour diffusion automatique !');
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          Auto-Post IA & Recommandations d'Audience
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Générez en un clic des publications percutantes basées sur les fiches produits réelles et les heures de forte affluence.
        </p>
      </div>

      {/* Audience Peak Hours Heatmap / Insights */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Heures de Forte Affluence Facebook (Madagascar)</h3>
          </div>
          <span className="rounded-full bg-emerald-950 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
            Insights Optimisés
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {insights.map((ins, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-3 text-center transition-all ${
                ins.engagement_score >= 90
                  ? 'border-emerald-500/50 bg-emerald-950/30 shadow-sm shadow-emerald-500/10'
                  : 'border-slate-800 bg-slate-950/60'
              }`}
            >
              <span className="block text-xs font-bold text-slate-200">{ins.day_of_week}</span>
              <span className="mt-1 block font-mono text-xs font-extrabold text-blue-400">
                {ins.peak_time_start} - {ins.peak_time_end}
              </span>
              <div className="mt-2 flex items-center justify-center gap-1">
                <div className="h-1.5 w-12 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400"
                    style={{ width: `${ins.engagement_score}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-400">{ins.engagement_score}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Generator Setup & Live Visual Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Setup controls */}
        <div className="lg:col-span-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Paramètres de Création IA</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              1. Choisir le Produit du Catalogue *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.price?.toLocaleString('fr-FR')} Ar
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              2. Style & Tonalité du Post
            </label>
            <select
              value={toneStyle}
              onChange={(e) => setToneStyle(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="Accrocheur, chaleureux avec emojis et appel à l'action clair">
                🔥 Vendeur & Accrocheur (Emojis & Conversion)
              </option>
              <option value="Élégant, premium et axé sur les avantages concrets">
                💎 Élégant & Premium (Qualité & Confiance)
              </option>
              <option value="Offre spéciale, urgence et stock limité">
                ⚡ Flash Promo / Quantité Limitée (Urgence)
              </option>
              <option value="Court, direct avec question pour générer des commentaires">
                💬 Engagement & Commentaires (Question ouverte)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              3. Cible Visée
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Ex: Antananarivo, Tamatave, Majunga..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            id="generate-ai-post-btn"
            onClick={handleGenerateAI}
            disabled={isGenerating || products.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:opacity-95 active:scale-98 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Génération en cours par l'IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Générer la Publication & le Visuel</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Generated Output & Visual Mockup */}
        <div className="lg:col-span-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Aperçu Visuel & Texte Prêt à Poster</h3>
            </div>
            {generatedResult && (
              <span className="rounded bg-indigo-950 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                Heure suggérée : {generatedResult.recommended_hour}
              </span>
            )}
          </div>

          {generatedResult ? (
            <div className="space-y-4">
              {/* Visual Card Mockup (Affiche Graphique) */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 shadow-xl">
                <div className="flex items-center gap-4">
                  {generatedResult.default_image && (
                    <img
                      src={generatedResult.default_image}
                      alt="Visual"
                      className="h-28 w-28 rounded-xl object-cover ring-2 ring-blue-500/40"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="rounded bg-blue-600/30 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-400/30">
                      OFFRE EXCLUSIVE
                    </span>
                    <h4 className="mt-1.5 text-sm font-black text-white truncate">
                      {generatedResult.visual_headline}
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {generatedResult.visual_subline}
                    </p>
                    <div className="mt-2 inline-block rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-black text-slate-950 shadow-md">
                      {generatedResult.visual_badge}
                    </div>
                  </div>
                </div>
              </div>

              {/* Editable Post Copy */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Texte du Post Facebook :
                </label>
                <textarea
                  rows={6}
                  value={generatedResult.post_text}
                  onChange={(e) =>
                    setGeneratedResult({ ...generatedResult, post_text: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Date & Time Picker for Schedule */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Date de diffusion
                  </label>
                  <input
                    type="date"
                    value={customScheduledDate}
                    onChange={(e) => setCustomScheduledDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Heure optimale
                  </label>
                  <input
                    type="time"
                    value={customScheduledTime}
                    onChange={(e) => setCustomScheduledTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {successNotice && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{successNotice}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleScheduleFromAI}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Programmer pour cette Heure</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-500">
              <Sparkles className="h-10 w-10 text-slate-700 mb-2" />
              <p className="text-xs font-semibold text-slate-400">Aucun post généré pour l'instant</p>
              <p className="text-[11px] text-slate-600 mt-1">
                Sélectionnez un produit à gauche et cliquez sur "Générer la Publication" pour démarrer l'IA.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
