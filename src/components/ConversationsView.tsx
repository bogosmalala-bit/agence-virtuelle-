import React, { useState } from 'react';
import {
  MessageSquare,
  Search,
  User,
  Bot,
  UserCheck,
  Send,
  Paperclip,
  Clock,
  Sparkles,
  ShoppingBag,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Video,
  Play,
  CheckCheck,
  RotateCcw,
} from 'lucide-react';
import { Conversation, Message, Product, AssistantSettings } from '../types.js';

interface ConversationsViewProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  products: Product[];
  settings: AssistantSettings | null;
  onSelectConversation: (conv: Conversation) => void;
  onSendMessage: (conversationId: string, text: string) => void;
  onToggleHandoff: (conversationId: string, currentStatus: string) => void;
}

export const ConversationsView: React.FC<ConversationsViewProps> = ({
  conversations,
  activeConversation,
  messages,
  products,
  settings,
  onSelectConversation,
  onSendMessage,
  onToggleHandoff,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BOT_ACTIVE' | 'HANDOFF_HUMAN'>('ALL');
  const [manualInput, setManualInput] = useState('');

  const filteredConversations = conversations.filter((c) => {
    const matchSearch = c.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (filterType === 'ALL') return true;
    return c.status === filterType;
  });

  const handleSendManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim() || !activeConversation) return;
    onSendMessage(activeConversation.id, manualInput.trim());
    setManualInput('');
  };

  const currentProduct = activeConversation?.identified_product_id
    ? products.find((p) => p.id === activeConversation.identified_product_id)
    : null;

  return (
    <div className="flex h-[calc(100vh-6.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl lg:flex-row">
      {/* Left Pane: Conversation List */}
      <div className="flex w-full flex-col border-b border-slate-800 bg-slate-950/60 lg:w-80 lg:border-r lg:border-b-0">
        {/* Search & Filters */}
        <div className="border-b border-slate-800/80 p-3.5 space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-900/80 p-1">
            <button
              onClick={() => setFilterType('ALL')}
              className={`flex-1 rounded-md py-1 text-[11px] font-semibold transition-colors ${
                filterType === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tous ({conversations.length})
            </button>
            <button
              onClick={() => setFilterType('BOT_ACTIVE')}
              className={`flex-1 rounded-md py-1 text-[11px] font-semibold transition-colors ${
                filterType === 'BOT_ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              IA Active
            </button>
            <button
              onClick={() => setFilterType('HANDOFF_HUMAN')}
              className={`flex-1 rounded-md py-1 text-[11px] font-semibold transition-colors ${
                filterType === 'HANDOFF_HUMAN'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Opérateur
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">Aucune conversation trouvée</div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = activeConversation?.id === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  className={`flex cursor-pointer items-start gap-3 p-3.5 transition-colors ${
                    isSelected
                      ? 'bg-blue-950/40 border-l-2 border-blue-500'
                      : 'hover:bg-slate-900/60'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={conv.facebook_profile_pic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80'}
                      alt={conv.customer_name}
                      className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-700"
                    />
                    {conv.status === 'BOT_ACTIVE' ? (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[8px] text-white">
                        ⚡
                      </span>
                    ) : (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] text-white">
                        👤
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-bold text-slate-200">{conv.customer_name}</span>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(conv.updated_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="truncate text-[11px] text-slate-400 mt-0.5">{conv.last_message}</p>

                    <div className="mt-1.5 flex items-center justify-between gap-1">
                      {conv.identified_product_name ? (
                        <span className="truncate rounded bg-slate-900 px-1.5 py-0.2 text-[10px] font-medium text-blue-300">
                          {conv.identified_product_name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Discussion générale</span>
                      )}

                      {conv.status === 'HANDOFF_HUMAN' && (
                        <span className="shrink-0 rounded bg-amber-950 px-1.5 py-0.2 text-[9px] font-bold text-amber-300">
                          Transfert
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Messenger Conversation Thread */}
      {activeConversation ? (
        <div className="flex flex-1 flex-col bg-slate-900/60">
          {/* Thread Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3">
            <div className="flex items-center gap-3">
              <img
                src={activeConversation.facebook_profile_pic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80'}
                alt={activeConversation.customer_name}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-blue-500/40"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white">{activeConversation.customer_name}</h3>
                  <span className="rounded bg-blue-950 px-1.5 py-0.2 text-[10px] font-semibold text-blue-300">
                    Facebook ID: {activeConversation.customer_id}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {currentProduct ? (
                    <span className="text-emerald-400 font-medium">
                      Intéressé par : {currentProduct.name} ({currentProduct.price?.toLocaleString('fr-FR')} Ar)
                    </span>
                  ) : (
                    'Discussion Facebook Messenger'
                  )}
                </p>
              </div>
            </div>

            {/* Handoff Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleHandoff(activeConversation.id, activeConversation.status)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeConversation.status === 'HANDOFF_HUMAN'
                    ? 'border-amber-500/50 bg-amber-950/60 text-amber-300 hover:bg-amber-900/50'
                    : 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/50'
                }`}
              >
                {activeConversation.status === 'HANDOFF_HUMAN' ? (
                  <>
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Mode Opérateur (Réactiver IA ?)</span>
                  </>
                ) : (
                  <>
                    <Bot className="h-3.5 w-3.5" />
                    <span>IA Active (Transférer à l'Humain ?)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Handoff Notice Banner */}
          {activeConversation.status === 'HANDOFF_HUMAN' && (
            <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-950/20 px-4 py-2 text-xs text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>
                <strong>Transfert vers opérateur humain actif :</strong> L'IA a arrêté ses réponses automatiques pour cette discussion afin de vous laisser répondre directement.
              </span>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">
                Aucun message dans cette conversation.
              </div>
            ) : (
              messages.map((msg) => {
                const isCust = msg.sender === 'CUSTOMER';
                const isAi = msg.sender === 'AI_ASSISTANT';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isCust ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                      {isAi && (
                        <span className="flex items-center gap-1 rounded bg-blue-950 px-1.5 py-0.2 text-blue-300 font-bold">
                          <Bot className="h-3 w-3" /> {settings?.name || 'Sarah'} (IA • Slot {msg.api_key_slot || 1})
                        </span>
                      )}
                      {!isCust && !isAi && (
                        <span className="rounded bg-emerald-950 px-1.5 py-0.2 text-emerald-300 font-bold">
                          👤 Opérateur (Vous)
                        </span>
                      )}
                      <span className="font-semibold text-slate-300">{msg.sender_name}</span>
                      <span>•</span>
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div
                      className={`max-w-xl rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-md ${
                        isCust
                          ? 'rounded-tl-none bg-slate-800 text-slate-200 border border-slate-700/60'
                          : isAi
                          ? 'rounded-tr-none bg-blue-600 text-white'
                          : 'rounded-tr-none bg-emerald-600 text-white'
                      }`}
                    >
                      <div className="whitespace-pre-line">{msg.message}</div>

                      {/* Attachments rendering */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2.5 space-y-2 border-t border-white/20 pt-2">
                          {msg.attachments.map((att, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2.5 rounded-lg bg-black/30 p-2 text-[11px]"
                            >
                              {att.type === 'image' ? (
                                <ImageIcon className="h-4 w-4 text-blue-300" />
                              ) : att.type === 'video' ? (
                                <Video className="h-4 w-4 text-purple-300" />
                              ) : (
                                <FileText className="h-4 w-4 text-amber-300" />
                              )}
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-blue-200 truncate flex-1"
                              >
                                {att.name || att.url}
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Manual Operator Reply Box */}
          <form
            onSubmit={handleSendManual}
            className="flex items-center gap-2 border-t border-slate-800 bg-slate-950 p-3"
          >
            <input
              type="text"
              placeholder={
                activeConversation.status === 'HANDOFF_HUMAN'
                  ? 'Répondre manuellement en tant qu\'opérateur...'
                  : 'Envoyer un message manuel (passe la conversation en mode opérateur)...'
              }
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!manualInput.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white transition-all hover:bg-blue-500 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-500">
          <MessageSquare className="h-12 w-12 text-slate-700 mb-3" />
          <p className="text-sm font-semibold text-slate-400">Sélectionnez une conversation</p>
          <p className="text-xs text-slate-600 mt-1">
            Consultez les messages reçus de votre Page Facebook et suivez les réponses de l'IA.
          </p>
        </div>
      )}
    </div>
  );
};
