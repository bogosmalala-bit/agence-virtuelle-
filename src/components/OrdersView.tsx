import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  XCircle,
  Eye,
  Plus,
  X,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Order, OrderStatus, Product } from '../types.js';

interface OrdersViewProps {
  orders: Order[];
  products: Product[];
  onUpdateOrderStatus: (id: string, status: OrderStatus, notes?: string) => Promise<void>;
  onCreateManualOrder: (orderData: any) => Promise<void>;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  products,
  onUpdateOrderStatus,
  onCreateManualOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Manual Order Form
  const [customerName, setCustomerName] = useState('');
  const [facebookName, setFacebookName] = useState('');
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('Analamanga');
  const [district, setDistrict] = useState('Antananarivo Renivohitra');
  const [quartier, setQuartier] = useState('');
  const [commune, setCommune] = useState('');
  const [landmark, setLandmark] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone.includes(searchQuery) ||
      o.product_name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;
    if (statusFilter === 'ALL') return true;
    return o.status === statusFilter;
  });

  const totalRevenue = orders
    .filter((o) => o.status !== 'ANNULÉE')
    .reduce((sum, o) => sum + o.total, 0);

  const handleProductSelect = (id: string) => {
    setProductId(id);
    const found = products.find((p) => p.id === id);
    if (found) {
      setProductName(found.name);
      setUnitPrice(found.price || 0);
    }
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName || !productName || !phone || !quartier || !landmark) {
      setErrorMsg('Veuillez renseigner tous les champs obligatoires.');
      return;
    }

    try {
      await onCreateManualOrder({
        customer_name: customerName,
        facebook_name: facebookName || customerName,
        product_id: productId || 'custom',
        product_name: productName,
        quantity: Number(quantity),
        unit_price: Number(unitPrice),
        phone,
        region,
        district,
        quartier,
        commune,
        landmark,
      });
      setIsManualModalOpen(false);
      // Reset
      setCustomerName('');
      setPhone('');
      setQuartier('');
      setLandmark('');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'NOUVELLE':
        return (
          <span className="flex items-center gap-1 rounded-full border border-blue-500/40 bg-blue-950/80 px-2.5 py-0.5 text-[11px] font-bold text-blue-300">
            <Clock className="h-3 w-3" /> Nouvelle
          </span>
        );
      case 'CONFIRMÉE':
        return (
          <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-950/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
            <CheckCircle2 className="h-3 w-3" /> Confirmée
          </span>
        );
      case 'EN PRÉPARATION':
        return (
          <span className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-950/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
            <PackageCheck className="h-3 w-3" /> En Préparation
          </span>
        );
      case 'EXPÉDIÉE':
        return (
          <span className="flex items-center gap-1 rounded-full border border-purple-500/40 bg-purple-950/80 px-2.5 py-0.5 text-[11px] font-bold text-purple-300">
            <Truck className="h-3 w-3" /> Expédiée
          </span>
        );
      case 'LIVRÉE':
        return (
          <span className="flex items-center gap-1 rounded-full border border-teal-500/40 bg-teal-950/80 px-2.5 py-0.5 text-[11px] font-bold text-teal-300">
            <CheckCircle2 className="h-3 w-3" /> Livrée
          </span>
        );
      case 'ANNULÉE':
        return (
          <span className="flex items-center gap-1 rounded-full border border-red-500/40 bg-red-950/80 px-2.5 py-0.5 text-[11px] font-bold text-red-300">
            <XCircle className="h-3 w-3" /> Annulée
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-emerald-400" />
            Gestion des Commandes Clients
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Commandes prises automatiquement par l'assistante IA en Mode Vente et notifications opérateur en temps réel.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Saisie Manuelle Commande</span>
          </button>
        </div>
      </div>

      {/* Stats Quick Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <span className="text-[11px] font-medium text-slate-400">Total Commandes</span>
          <p className="text-xl font-bold text-white mt-1">{orders.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <span className="text-[11px] font-medium text-slate-400">Nouvelles / En Attente</span>
          <p className="text-xl font-bold text-blue-400 mt-1">
            {orders.filter((o) => o.status === 'NOUVELLE' || o.status === 'CONFIRMÉE').length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <span className="text-[11px] font-medium text-slate-400">Livrées</span>
          <p className="text-xl font-bold text-teal-400 mt-1">
            {orders.filter((o) => o.status === 'LIVRÉE').length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <span className="text-[11px] font-medium text-slate-400">Chiffre d'Affaires</span>
          <p className="text-xl font-bold text-emerald-400 mt-1">
            {totalRevenue.toLocaleString('fr-FR')} Ar
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher par n° commande, nom client, téléphone, produit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'NOUVELLE', 'CONFIRMÉE', 'EN PRÉPARATION', 'EXPÉDIÉE', 'LIVRÉE', 'ANNULÉE'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              {st === 'ALL' ? 'Toutes' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3.5">N° Commande & Date</th>
                <th className="px-4 py-3.5">Client & Contact</th>
                <th className="px-4 py-3.5">Produit & Quantité</th>
                <th className="px-4 py-3.5">Total en Ariary</th>
                <th className="px-4 py-3.5">Adresse de Livraison</th>
                <th className="px-4 py-3.5">Statut</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    Aucune commande ne correspond aux critères.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="transition-colors hover:bg-slate-800/40">
                    {/* Order Num & Date */}
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-white">{ord.order_number}</span>
                      <span className="block text-[10px] text-slate-500">
                        {new Date(ord.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-200 block">{ord.customer_name}</span>
                      <a
                        href={`tel:${ord.phone}`}
                        className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <Phone className="h-3 w-3" /> {ord.phone}
                      </a>
                    </td>

                    {/* Product */}
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-slate-200 block">{ord.product_name}</span>
                      <span className="text-[11px] text-slate-400">Qté: {ord.quantity}</span>
                    </td>

                    {/* Total (Ar) */}
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-emerald-400">
                        {ord.total.toLocaleString('fr-FR')} Ar
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        ({ord.unit_price.toLocaleString('fr-FR')} Ar / u)
                      </span>
                    </td>

                    {/* Address */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <span className="text-slate-300 font-medium block">
                        {ord.quartier}, {ord.district}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        Repère : {ord.landmark}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">{getStatusBadge(ord.status)}</td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                      >
                        Détails & Statut
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details & Status Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {selectedOrder.order_number}
                </span>
                <h3 className="text-base font-bold text-white">Détails de la Commande</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Mandatory 7 fields recap */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 font-semibold">1. Nom complet réel :</span>
                    <p className="font-bold text-white">{selectedOrder.customer_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold">2. Nom Facebook :</span>
                    <p className="text-slate-300">{selectedOrder.facebook_name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500 font-semibold">3. Nom du produit :</span>
                    <p className="font-bold text-blue-400">{selectedOrder.product_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold">4. Quantité :</span>
                    <p className="font-bold text-white">{selectedOrder.quantity} unité(s)</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500 font-semibold">5. Contact téléphonique :</span>
                    <p className="font-bold text-white flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-emerald-400" /> {selectedOrder.phone}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold">6. Total à payer :</span>
                    <p className="font-bold text-emerald-400 text-sm">
                      {selectedOrder.total.toLocaleString('fr-FR')} Ar
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-slate-500 font-semibold">7. Adresse précise de livraison :</span>
                  <p className="text-slate-200 mt-0.5">
                    📍 {selectedOrder.quartier}, {selectedOrder.district}, Région {selectedOrder.region}
                  </p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    <strong>Repère précis :</strong> {selectedOrder.landmark}
                  </p>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Changer le statut de la commande :
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['NOUVELLE', 'CONFIRMÉE', 'EN PRÉPARATION', 'EXPÉDIÉE', 'LIVRÉE', 'ANNULÉE'] as OrderStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        onUpdateOrderStatus(selectedOrder.id, st);
                        setSelectedOrder({ ...selectedOrder, status: st });
                      }}
                      className={`rounded-lg py-2 text-xs font-bold transition-all ${
                        selectedOrder.status === st
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Order Creation Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-emerald-400" />
                Saisie Manuelle d'une Commande (7 Champs Obligatoires)
              </h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateManualOrder} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">1. Nom complet réel *</label>
                  <input
                    type="text"
                    placeholder="Ex: Jean-Luc Rakotomalala"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">2. Nom Facebook *</label>
                  <input
                    type="text"
                    placeholder="Ex: Jean Luc Rk"
                    value={facebookName}
                    onChange={(e) => setFacebookName(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Product Selector */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">3. Choisir le Produit *</label>
                <select
                  value={productId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none mb-1.5"
                >
                  <option value="">-- Sélectionner dans le catalogue --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.price?.toLocaleString('fr-FR')} Ar
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Ou saisir le nom du produit manuellement"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">4. Quantité *</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Prix Unitaire (Ar)</label>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">6. Total Calculé (Ar)</label>
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-emerald-400 font-bold">
                    {(quantity * unitPrice).toLocaleString('fr-FR')} Ar
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">5. Contact Téléphonique *</label>
                <input
                  type="tel"
                  placeholder="Ex: 034 12 345 67 / 032 89 012 34"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Detailed Address */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2.5">
                <span className="font-bold text-slate-200 block">7. Adresse Précise de Livraison</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Région *</label>
                    <input
                      type="text"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">District / Ville *</label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Quartier *</label>
                    <input
                      type="text"
                      placeholder="Ex: Ankorondrano, Analakely, Ivato"
                      value={quartier}
                      onChange={(e) => setQuartier(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Commune (Optionnel)</label>
                    <input
                      type="text"
                      placeholder="Ex: CU Antananarivo"
                      value={commune}
                      onChange={(e) => setCommune(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Repère Précis *</label>
                  <input
                    type="text"
                    placeholder="Ex: Près de la station Total, en face du portail vert, villa n°12"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 font-semibold text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500"
                >
                  Enregistrer la Commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
