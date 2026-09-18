import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Video,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  Sparkles,
  Info,
} from 'lucide-react';
import { Product, ProductFile } from '../types.js';

interface ProductsViewProps {
  products: Product[];
  onAddProduct: (product: any) => Promise<void>;
  onUpdateProduct: (id: string, product: any) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onAddFileToProduct: (productId: string, file: any) => Promise<void>;
  onDeleteFileFromProduct: (productId: string, fileId: string) => Promise<void>;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddFileToProduct,
  onDeleteFileFromProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [stockStatus, setStockStatus] = useState<'DISPONIBLE' | 'RUPTURE_STOCK' | 'QUANTITE_DISPONIBLE'>('DISPONIBLE');
  const [stockQuantity, setStockQuantity] = useState<string>('');
  const [category, setCategory] = useState('Général');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Media Attachment Sub-form in Modal
  const [mediaList, setMediaList] = useState<Omit<ProductFile, 'id' | 'created_at'>[]>([]);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaName, setNewMediaName] = useState('');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video' | 'pdf' | 'document'>('image');

  const categories = Array.from(new Set(products.map((p) => p.category || 'Général')));

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (selectedCategory === 'ALL') return true;
    return p.category === selectedCategory;
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setDescription('');
    setPrice('');
    setStockStatus('DISPONIBLE');
    setStockQuantity('');
    setCategory('Général');
    setMediaList([]);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description);
    setPrice(p.price !== null ? String(p.price) : '');
    setStockStatus(p.stock_status);
    setStockQuantity(p.stock_quantity !== null && p.stock_quantity !== undefined ? String(p.stock_quantity) : '');
    setCategory(p.category || 'Général');
    setMediaList(p.files.map((f) => ({ product_id: p.id, file_name: f.file_name, file_url: f.file_url, file_type: f.file_type, size_bytes: f.size_bytes })));
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleAddMediaToDraft = () => {
    if (!newMediaUrl.trim() || !newMediaName.trim()) return;
    setMediaList((prev) => [
      ...prev,
      {
        product_id: editingProduct?.id || 'draft',
        file_name: newMediaName.trim(),
        file_url: newMediaUrl.trim(),
        file_type: newMediaType,
        size_bytes: 500000,
      },
    ]);
    setNewMediaName('');
    setNewMediaUrl('');
  };

  const handleRemoveMediaFromDraft = (idx: number) => {
    setMediaList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Le nom du produit est obligatoire.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('La description du produit est obligatoire afin que l\'IA puisse renseigner précisément les clients.');
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      price: price ? Number(price) : null,
      stock_status: stockStatus,
      stock_quantity: stockQuantity ? Number(stockQuantity) : null,
      category: category.trim(),
      files: mediaList,
    };

    try {
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, payload);
      } else {
        await onAddProduct(payload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Une erreur est survenue.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-400" />
            Catalogue des Produits & Médias
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Base de connaissances officielle utilisée par l'assistante IA pour répondre aux clients et prendre les commandes.
          </p>
        </div>

        <button
          id="add-product-btn"
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 active:scale-95 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Ajouter un Produit</span>
        </button>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher par nom, mot-clé ou description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            Toutes Catégories ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((p) => {
          const mainImage = p.files.find((f) => f.file_type === 'image');
          return (
            <div
              key={p.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition-all hover:border-blue-500/30 hover:shadow-xl"
            >
              <div>
                {/* Image / Media Preview Header */}
                <div className="relative mb-3 h-40 w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                  {mainImage ? (
                    <img
                      src={mainImage.file_url}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-slate-600">
                      <ImageIcon className="h-10 w-10 mb-1" />
                      <span className="text-[11px]">Aucun visuel attaché</span>
                    </div>
                  )}

                  {/* Stock Status Badge */}
                  <div className="absolute top-2 left-2">
                    {p.stock_status === 'DISPONIBLE' ? (
                      <span className="rounded-full bg-emerald-950/90 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40 backdrop-blur-sm">
                        Disponible {p.stock_quantity !== null && `(${p.stock_quantity})`}
                      </span>
                    ) : p.stock_status === 'RUPTURE_STOCK' ? (
                      <span className="rounded-full bg-red-950/90 px-2.5 py-0.5 text-[10px] font-bold text-red-300 border border-red-500/40 backdrop-blur-sm">
                        Rupture de Stock
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-950/90 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/40 backdrop-blur-sm">
                        Limité ({p.stock_quantity} restants)
                      </span>
                    )}
                  </div>

                  {/* Category Pill */}
                  <div className="absolute top-2 right-2">
                    <span className="rounded-md bg-slate-900/90 px-2 py-0.5 text-[10px] font-semibold text-slate-300 border border-slate-700">
                      {p.category}
                    </span>
                  </div>
                </div>

                {/* Title & Price */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">{p.name}</h3>
                  <span className="text-xs font-extrabold text-blue-400 whitespace-nowrap">
                    {p.price !== null ? `${p.price.toLocaleString('fr-FR')} Ar` : 'Sur devis'}
                  </span>
                </div>

                {/* Description */}
                <p className="mt-2 text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {p.description}
                </p>

                {/* Attached Files List */}
                {p.files.length > 0 && (
                  <div className="mt-3 space-y-1 rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-[11px]">
                    <span className="font-semibold text-slate-400 text-[10px] uppercase">
                      Fichiers connus par l'IA ({p.files.length}) :
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {p.files.map((file) => (
                        <a
                          key={file.id}
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-blue-300 hover:text-white border border-slate-800"
                        >
                          {file.file_type === 'image' ? (
                            <ImageIcon className="h-3 w-3 text-blue-400" />
                          ) : file.file_type === 'video' ? (
                            <Video className="h-3 w-3 text-purple-400" />
                          ) : (
                            <FileText className="h-3 w-3 text-amber-400" />
                          )}
                          <span className="truncate max-w-[120px]">{file.file_name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-800/80 pt-3">
                <button
                  onClick={() => openEditModal(p)}
                  className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-700 hover:text-white"
                >
                  <Edit2 className="h-3.5 w-3.5 text-blue-400" />
                  <span>Modifier</span>
                </button>
                <button
                  onClick={() => onDeleteProduct(p.id)}
                  className="flex items-center gap-1 rounded-lg border border-red-900/30 bg-red-950/20 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Supprimer</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-400" />
                {editingProduct ? 'Modifier le Produit' : 'Nouveau Produit au Catalogue'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Product Name (Obligatoire) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nom du Produit <span className="text-red-400">* (Obligatoire)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Écouteurs Sans Fil Pro ANC Bluetooth 5.3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Description (Obligatoire pour l'IA) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">
                    Description Détaillée <span className="text-red-400">* (Obligatoire pour l'IA)</span>
                  </label>
                  <span className="text-[11px] text-blue-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> L'IA utilisera cette description
                  </span>
                </div>
                <textarea
                  rows={4}
                  placeholder="Détaillez les caractéristiques, autonomie, garantie, compatibilité, options de couleurs, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Price (Ar) & Stock row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Prix en Ariary (Ar) <span className="text-slate-500 font-normal">(Optionnel)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 185000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    État du Stock <span className="text-slate-500 font-normal">(Optionnel)</span>
                  </label>
                  <select
                    value={stockStatus}
                    onChange={(e: any) => setStockStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="DISPONIBLE">Disponible</option>
                    <option value="RUPTURE_STOCK">Rupture de stock</option>
                    <option value="QUANTITÉ_DISPONIBLE">Quantité limitée</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Quantité en Stock <span className="text-slate-500 font-normal">(Optionnel)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 45"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Catégorie du Produit
                </label>
                <input
                  type="text"
                  placeholder="Ex: Audio & High-Tech, Vêtements, Cosmétiques..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Media Attachments Section (Images, Videos, PDFs) */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4 text-blue-400" /> Fichiers & Médias attachés (Images, Vidéos, PDF)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Transmis automatiquement par l'IA sur demande client
                  </span>
                </div>

                {/* Media Draft List */}
                {mediaList.length > 0 && (
                  <div className="space-y-1.5">
                    {mediaList.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {m.file_type === 'image' ? (
                            <ImageIcon className="h-4 w-4 text-blue-400" />
                          ) : m.file_type === 'video' ? (
                            <Video className="h-4 w-4 text-purple-400" />
                          ) : (
                            <FileText className="h-4 w-4 text-amber-400" />
                          )}
                          <span className="font-semibold text-slate-200 truncate">{m.file_name}</span>
                          <span className="text-[10px] text-slate-500 uppercase font-mono">({m.file_type})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMediaFromDraft(idx)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new media form */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 pt-2 border-t border-slate-800">
                  <input
                    type="text"
                    placeholder="Nom du fichier (ex: Photo principale HD)"
                    value={newMediaName}
                    onChange={(e) => setNewMediaName(e.target.value)}
                    className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="url"
                    placeholder="URL directe du fichier (https://...)"
                    value={newMediaUrl}
                    onChange={(e) => setNewMediaUrl(e.target.value)}
                    className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none sm:col-span-2"
                  />
                  <select
                    value={newMediaType}
                    onChange={(e: any) => setNewMediaType(e.target.value)}
                    className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="image">Image</option>
                    <option value="video">Vidéo</option>
                    <option value="pdf">Document PDF</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAddMediaToDraft}
                  disabled={!newMediaName || !newMediaUrl}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                >
                  + Ajouter ce fichier au produit
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500"
                >
                  {editingProduct ? 'Enregistrer les modifications' : 'Ajouter le Produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
