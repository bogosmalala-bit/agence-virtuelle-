import React, { useState } from 'react';
import {
  ShieldCheck,
  Filter,
  Plus,
  Trash2,
  AlertTriangle,
  EyeOff,
  Eye,
  MessageSquare,
  Sparkles,
  Send,
  X,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { FacebookComment, ModerationRule } from '../types.js';

interface ModerationViewProps {
  comments: FacebookComment[];
  rules: ModerationRule[];
  onAddRule: (ruleData: any) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onModerateComment: (id: string, action: string, reason?: string) => Promise<void>;
}

export const ModerationView: React.FC<ModerationViewProps> = ({
  comments,
  rules,
  onAddRule,
  onDeleteRule,
  onModerateComment,
}) => {
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('SPAM');
  const [action, setAction] = useState<'HIDE' | 'FLAG' | 'DELETE'>('HIDE');

  const handleAddRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    await onAddRule({
      keyword_or_pattern: keyword.trim(),
      category,
      action,
    });
    setKeyword('');
    setIsRuleModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            Modération Intelligente des Commentaires Facebook
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Filtrage automatique des liens concurrents, spam et insultes avec envoi de réponses privées Messenger en temps réel.
          </p>
        </div>

        <button
          onClick={() => setIsRuleModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Ajouter une Règle de Modération</span>
        </button>
      </div>

      {/* Rules Grid */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Filter className="h-4 w-4 text-blue-400" />
          Règles Actives de Détection & Blocage
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-start justify-between rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs"
            >
              <div>
                <span className="rounded bg-blue-950 px-1.5 py-0.2 text-[10px] font-bold text-blue-300">
                  {rule.category}
                </span>
                <p className="mt-1 font-bold text-white">{rule.keyword_or_pattern}</p>
                <span className="text-[11px] text-slate-400">
                  Action : <strong className="text-amber-400">{rule.action}</strong>
                </span>
              </div>
              <button
                onClick={() => onDeleteRule(rule.id)}
                className="text-slate-500 hover:text-red-400 p-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Moderated Comments Feed */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <h3 className="text-sm font-bold text-white mb-3">
          Historique des Commentaires & Actions de Modération
        </h3>

        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-300">Aucun commentaire pour le moment</p>
              <p className="mt-1 text-[11px] text-slate-500 max-w-sm mx-auto">
                Dès qu'un internaute publie un commentaire sur votre Page Facebook ou lors de la synchronisation en direct, le moteur de modération automatique l'analysera ici.
              </p>
            </div>
          ) : (
            comments.map((cmt) => (
            <div
              key={cmt.id}
              className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <img
                    src={cmt.sender_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80'}
                    alt={cmt.sender_name}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                  <div>
                    <span className="font-bold text-white">{cmt.sender_name}</span>
                    <span className="text-[10px] text-slate-500 ml-2">
                      Sur "{cmt.post_title}" •{' '}
                      {new Date(cmt.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {cmt.status === 'HIDDEN' ? (
                    <span className="flex items-center gap-1 rounded-full bg-red-950 px-2 py-0.5 text-[10px] font-bold text-red-300 border border-red-500/40">
                      <EyeOff className="h-3 w-3" /> Masqué Automatiquement
                    </span>
                  ) : cmt.status === 'PRIVATE_MESSAGE_SENT' ? (
                    <span className="rounded-full bg-blue-950 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/40">
                      Message Privé Envoyé
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
                      Répondu Publiquement
                    </span>
                  )}
                </div>
              </div>

              <p className="bg-slate-900/80 p-2.5 rounded-lg text-slate-200 font-medium">
                "{cmt.message}"
              </p>

              {cmt.moderation_reason && (
                <p className="text-[11px] text-red-400 font-semibold">
                  ⚠️ Motif modération : {cmt.moderation_reason}
                </p>
              )}

              {/* Public reply & Private reply previews */}
              {cmt.reply_text && (
                <div className="rounded-lg bg-blue-950/30 p-2.5 border border-blue-500/20 text-slate-300">
                  <span className="font-bold text-blue-400 block text-[10px] uppercase">
                    Réponse Publique de l'Assistante :
                  </span>
                  <p className="mt-0.5">{cmt.reply_text}</p>
                </div>
              )}

              {cmt.private_reply_text && (
                <div className="rounded-lg bg-indigo-950/30 p-2.5 border border-indigo-500/20 text-slate-300">
                  <span className="font-bold text-indigo-400 block text-[10px] uppercase">
                    Message Privé Messenger Transmis :
                  </span>
                  <p className="mt-0.5">{cmt.private_reply_text}</p>
                </div>
              )}
            </div>
          ))
          )}
        </div>
      </div>

      {/* Add Rule Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Nouvelle Règle de Modération
              </h3>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddRuleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Mots-clés ou Expressions à Filtrer *
                </label>
                <input
                  type="text"
                  placeholder="Ex: boutique concurrente, arnaque, casino, lien whatsapp..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Catégorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="SPAM">Spam & Publicités Externes</option>
                  <option value="COMPETITOR">Concurrents & Liens Détournés</option>
                  <option value="INSULT">Insultes & Propos Inappropriés</option>
                  <option value="CUSTOM">Personnalisé</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Action Automatique</label>
                <select
                  value={action}
                  onChange={(e: any) => setAction(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="HIDE">Masquer le Commentaire (Recommandé)</option>
                  <option value="FLAG">Signaler pour Vérification Manuelle</option>
                  <option value="DELETE">Supprimer le Commentaire</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 font-semibold text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 font-bold text-white hover:bg-emerald-500"
                >
                  Ajouter la Règle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
