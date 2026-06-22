// src/components/CartModal.tsx
import React from 'react';
import { X, Trash2, MapPin, Store, CreditCard, Banknote, ShoppingBag } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useOrderActions } from '../hooks/useAppActions';
import type { Order } from '../types';

interface CartModalProps {
  onLogin: () => void;
}

export function CartModal({ onLogin }: CartModalProps) {
  const {
    currentUser, cart, removeFromCart, cartTotal,
    customerInfo, patchCustomerInfo,
    setShowCheckout, setPendingOrderData, setShowQRModal,
  } = useStore();

  const { submitOrder } = useOrderActions();

  const subtotal = cartTotal();
  const deliveryFee = customerInfo.orderType === 'delivery' ? 10 : 0;
  const total = subtotal + deliveryFee;

  const initiateCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !currentUser) return;

    // Persist delivery info so the user doesn't have to retype it
    const { uid } = currentUser;
    localStorage.setItem(`phone_${uid}`, customerInfo.phone);
    localStorage.setItem(`block_${uid}`, customerInfo.block);
    localStorage.setItem(`room_${uid}`, customerInfo.room);

    const now = new Date();
    const orderPayload: Omit<Order, 'dbId'> = {
      displayId: `MAG-${Math.floor(Math.random() * 10000)}`,
      items: cart.map((i) => ({ id: i.id, name: i.name, qty: i.qty, price: i.price, rating: 0, feedback: '' })),
      total,
      subtotal,
      deliveryFee,
      orderType: customerInfo.orderType,
      paymentMethod: customerInfo.paymentMethod,
      customer: { ...customerInfo, email: currentUser.email ?? undefined, uid },
      status: 'Received',
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.getTime(),
      timestamps: { placedAt: now.getTime() },
    };

    if (customerInfo.paymentMethod === 'cod') {
      await submitOrder(orderPayload);
    } else {
      setPendingOrderData(orderPayload);
      setShowCheckout(false);
      setShowQRModal(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100] animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h2 className="font-black text-xl sm:text-2xl text-slate-800 flex items-center gap-2">
            <ShoppingBag className="text-orange-500" /> Your Cart
          </h2>
          <button onClick={() => setShowCheckout(false)} className="p-2 bg-slate-50 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-all active:scale-90">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Cart items */}
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-100">
                <div>
                  <p className="font-bold text-sm sm:text-base text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-500 font-medium">₹{item.price} × {item.qty}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-slate-900">₹{item.price * item.qty}</span>
                  <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-400 hover:bg-red-100 hover:text-red-600 rounded-lg transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery / Pickup toggle */}
          <div className="space-y-5 bg-white border border-slate-100 p-4 sm:p-5 rounded-[1.5rem] shadow-sm">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {(['delivery', 'takeaway'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => patchCustomerInfo({ orderType: type })}
                  className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                    customerInfo.orderType === type ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
                  }`}
                >
                  {type === 'delivery' ? <><MapPin size={16} /> Delivery (+₹10)</> : <><Store size={16} /> Self Pickup</>}
                </button>
              ))}
            </div>

            {/* Customer details */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Phone Number</label>
                <input
                  type="tel" required placeholder="10-digit mobile number"
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  value={customerInfo.phone}
                  onChange={(e) => patchCustomerInfo({ phone: e.target.value })}
                />
              </div>
              {customerInfo.orderType === 'delivery' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Hostel Block</label>
                    <input
                      type="text" required placeholder="e.g. A"
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all uppercase"
                      value={customerInfo.block}
                      onChange={(e) => patchCustomerInfo({ block: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Room No.</label>
                    <input
                      type="text" required placeholder="e.g. 101"
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      value={customerInfo.room}
                      onChange={(e) => patchCustomerInfo({ room: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Payment toggle */}
            <div className="pt-2">
              <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: 'upi', label: 'Pay Online', Icon: CreditCard, activeClass: 'border-orange-500 bg-orange-50 text-orange-700', iconClass: 'text-orange-500' },
                  { value: 'cod', label: 'Cash on Delivery', Icon: Banknote, activeClass: 'border-green-500 bg-green-50 text-green-700', iconClass: 'text-green-500' },
                ] as const).map(({ value, label, Icon, activeClass, iconClass }) => {
                  const isActive = customerInfo.paymentMethod === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => patchCustomerInfo({ paymentMethod: value })}
                      className={`py-3 sm:py-4 border-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${isActive ? activeClass : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                      <Icon size={20} className={isActive ? iconClass : ''} />
                      <span className="font-bold text-xs sm:text-sm">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-200 rounded-b-[2rem] shrink-0">
          <div className="flex justify-between items-end mb-4 px-2">
            <div>
              <p className="text-xs font-bold text-slate-500">Subtotal: ₹{subtotal}</p>
              {deliveryFee > 0 && <p className="text-xs font-bold text-slate-500">Delivery: ₹{deliveryFee}</p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total to Pay</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">₹{total}</p>
            </div>
          </div>

          {!currentUser ? (
            <button onClick={onLogin} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" />
              Sign in to Checkout
            </button>
          ) : (
            <button
              onClick={initiateCheckout}
              disabled={!customerInfo.phone || (customerInfo.orderType === 'delivery' && (!customerInfo.block || !customerInfo.room))}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-500/30 transition-all active:scale-95 text-sm sm:text-base"
            >
              Confirm Order • ₹{total}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}