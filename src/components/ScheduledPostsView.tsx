import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Send,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ExternalLink,
  X,
  Play,
} from 'lucide-react';
import { ScheduledPost, Product } from '../types.js';

interface ScheduledPostsViewProps {
  scheduledPosts: ScheduledPost[];
  products: Product[];
  onSchedulePost: (postData: any) => Promise<void>;
  onPublishNow: (id: string) => Promise<void>;
  onDeletePost: (id: string) => Promise<void>;
  onNavigateToAutoPost: () => void;
}

export const ScheduledPostsView: React.FC<ScheduledPostsViewProps> = ({
  scheduledPosts,
  products,
  onSchedulePost,
  onPublishNow,
  onDeletePost,
  onNavigateToAutoPost,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState('');
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [scheduledTime, setScheduledTime] = useState('18:30');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleProductSelect = (id: string) => {
    setProductId(id);
    const prod = products.find((p) => p.id === id);
    if (prod) {
      setProductName(prod.name);
      const img = prod.files.find((f) => f.file_type === 'image');
      if (img) setMediaUrl(img.file_url);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMsg('Le texte de la publication est obligatoire.');
      return;
    }

    try {
      await onSchedulePost({
        content: content.trim(),
        product_id: productId || null,
        product_name: productName || null,
        media_url: mediaUrl || undefined,
        media_type: 'IMAGE',
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
      });
      setIsModalOpen(false);
      setContent('');
      setMediaUrl('');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-400" />
            Programmation des Publications Facebook
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Planifiez à l'avance vos posts de produits aux heures de grande affluence de votre communauté.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onNavigateToAutoPost}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-950/60 px-3.5 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-900/50"
          >
            <Sparkles className="h-4 w-4" />
            <span>Générateur Auto-Post IA</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            <span>Programmer un Post</span>
          </button>
        </div>
      </div>

      {/* Posts Timeline List */}
      <div className="space-y-4">
        {scheduledPosts.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-500">
            <Calendar className="mx-auto h-12 w-12 text-slate-700 mb-3" />
            <p className="text-sm font-semibold text-slate-400">Aucune publication programmée</p>
            <p className="text-xs text-slate-600 mt-1">
              Utilisez le bouton "Programmer un Post" ou le "Générateur Auto-Post IA" pour créer votre premier contenu.
            </p>
          </div>
        ) : (
          scheduledPosts.map((post) => (
            <div
              key={post.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition-all hover:border-slate-700 md:flex-row md:items-start"
            >
              {/* Media Thumbnail */}
              <div className="h-32 w-full shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 md:w-48">
                {post.media_url ? (
                  <img
                    src={post.media_url}
                    alt="Post media"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-600">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
              </div>

              {/* Post Details */}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        post.status === 'PUBLIÉE'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : post.status === 'PROGRAMMÉE'
                          ? 'bg-blue-950 text-blue-300 border border-blue-500/40'
                          : 'bg-red-950 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {post.status}
                    </span>
                    {post.is_ai_generated && (
                      <span className="flex items-center gap-1 rounded bg-indigo-950 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                        <Sparkles className="h-3 w-3" /> Conçu par l'IA
                      </span>
                    )}
                    {post.product_name && (
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                        🛍️ {post.product_name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    <span>
                      {post.scheduled_date} à {post.scheduled_time}
                    </span>
                  </div>
                </div>

                <p className="whitespace-pre-line text-xs text-slate-300 leading-relaxed">
                  {post.content}
                </p>

                {post.published_at && (
                  <p className="text-[11px] text-emerald-400 font-medium">
                    ✓ Publié sur votre Page Meta le{' '}
                    {new Date(post.published_at).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end md:self-start shrink-0">
                {post.status === 'PROGRAMMÉE' && (
                  <button
                    onClick={() => onPublishNow(post.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Publier Maintenant</span>
                  </button>
                )}
                <button
                  onClick={() => onDeletePost(post.id)}
                  className="rounded-lg border border-red-900/30 bg-red-950/20 p-2 text-red-400 hover:bg-red-950/40"
                  title="Supprimer la programmation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Manual Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-400" />
                Programmer une Publication Facebook
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreatePost} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Associer un Produit du Catalogue (Optionnel)
                </label>
                <select
                  value={productId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Aucun produit spécifique --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.price?.toLocaleString('fr-FR')} Ar)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Texte de la Publication *
                </label>
                <textarea
                  rows={5}
                  placeholder="Écrivez votre texte de vente, accroche, emojis, prix en Ariary et appel à l'action..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  URL du Visuel / Photo attachée (Optionnel)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Date de Diffusion</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Heure de Diffusion</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 font-semibold text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500"
                >
                  Enregistrer la Programmation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
