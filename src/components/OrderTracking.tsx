// src/components/OrderTracking.tsx
import {
  ChevronLeft, Clock, ChefHat, MapPin, CheckCircle2, Star,
  Store, Package, Send,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { OrderService } from '../services/orderService';
import type { Order, OrderStatus } from '../types';

interface OrderTrackingProps {
  order: Order | undefined;
  onBack: () => void;
}

function statusColor(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    Received: 'text-blue-500 bg-blue-50 border-blue-100',
    Cooking: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    'Out for Delivery': 'text-orange-500 bg-orange-50 border-orange-200',
    'Ready for Pickup': 'text-orange-500 bg-orange-50 border-orange-200',
    Delivered: 'text-green-500 bg-green-50 border-green-200',
  };
  return map[status] ?? 'text-slate-500 bg-slate-50 border-slate-100';
}

function StatusIcon({ status }: { status: OrderStatus }) {
  if (status === 'Received') return <Clock size={32} />;
  if (status === 'Cooking') return <ChefHat size={32} className="animate-bounce" />;
  if (status === 'Out for Delivery') return <MapPin size={32} className="animate-pulse" />;
  if (status === 'Ready for Pickup') return <Store size={32} className="animate-pulse" />;
  return <CheckCircle2 size={32} />;
}

export function OrderTracking({ order, onBack }: OrderTrackingProps) {
  const { itemRatings, setItemRating } = useStore();

  if (!order) return null;

  const isDelivered = order.status === 'Delivered';

  const handleSubmitRating = async (itemId: number) => {
    const rating = itemRatings[itemId];
    if (!rating || rating.stars === 0) return;
    const updatedItems = order.items.map((i) =>
      i.id === itemId ? { ...i, rating: rating.stars, feedback: rating.feedback } : i
    );
    try {
      await OrderService.submitRatings(order.dbId, updatedItems);
    } catch (err) {
      console.error('[Rating submit]', err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold px-2 transition-colors active:scale-95"
      >
        <ChevronLeft size={20} /> Back to Menu
      </button>

      {/* Status card */}
      <div className={`rounded-[2rem] p-6 sm:p-10 border-2 text-center flex flex-col items-center justify-center transition-all duration-500 shadow-lg ${statusColor(order.status)}`}>
        <div className="bg-white p-4 rounded-full shadow-sm mb-4">
          <StatusIcon status={order.status} />
        </div>
        <h2 className="text-2xl sm:text-4xl font-black mb-2 tracking-tight">
          {isDelivered ? (order.orderType === 'delivery' ? 'Delivered!' : 'Picked Up!') : order.status}
        </h2>
        <p className="text-sm sm:text-base font-medium opacity-80 max-w-sm mx-auto">
          {order.status === 'Received' && "We've got your order! The chef will start soon."}
          {order.status === 'Cooking' && "Your Maggi is in the pan! It's getting hot and spicy."}
          {order.status === 'Out for Delivery' && 'Your food is on the way to your room. Keep your phone handy!'}
          {order.status === 'Ready for Pickup' && 'Your food is hot and ready at the counter. Come grab it!'}
          {isDelivered && "Hope you enjoyed your midnight snack. Don't forget to rate your items!"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* Order details */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order ID</p>
              <p className="font-black text-lg text-slate-800">{order.displayId}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
              <p className="font-black text-lg text-slate-800">₹{order.total}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer</p>
              <p className="font-bold text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                {order.customer.name} • {order.customer.phone}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                {order.orderType === 'delivery' ? 'Delivery Location' : 'Order Type'}
              </p>
              <p className="font-bold text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2">
                {order.orderType === 'delivery'
                  ? <><MapPin size={16} className="text-orange-500" /> Block {order.customer.block}, Room {order.customer.room}</>
                  : <><Store size={16} className="text-green-500" /> Self Pickup</>}
              </p>
            </div>
          </div>
        </div>

        {/* Items + Ratings */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100">
          <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
            <Package size={18} className="text-orange-500" /> Your Items
          </h3>
          <ul className="space-y-4">
            {order.items.map((item) => {
              const current = itemRatings[item.id] ?? { stars: 0, hover: 0, feedback: '' };
              const saved = item.rating ?? 0;

              return (
                <li key={item.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-3">
                  <div className="flex justify-between items-center w-full">
                    <span className="flex items-center gap-3 font-bold text-sm text-slate-800">
                      <span className="bg-slate-900 text-white w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shadow-sm">{item.qty}x</span>
                      {item.name}
                    </span>
                  </div>

                  {isDelivered && (
                    <div className="pt-3 border-t border-slate-200/60 mt-1">
                      {saved > 0 ? (
                        <div className="space-y-2">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} size={16} className={s <= saved ? 'fill-yellow-500 text-yellow-500' : 'text-yellow-200'} />
                            ))}
                          </div>
                          {item.feedback && <p className="text-xs text-slate-500 font-medium italic">"{item.feedback}"</p>}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Rate this item</p>
                          <div className="flex gap-1.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={24}
                                className={`cursor-pointer transition-all ${star <= (current.hover || current.stars) ? 'fill-yellow-400 text-yellow-400 scale-110' : 'text-slate-300 hover:text-yellow-200'}`}
                                onMouseEnter={() => setItemRating(item.id, 'hover', star)}
                                onMouseLeave={() => setItemRating(item.id, 'hover', 0)}
                                onClick={() => setItemRating(item.id, 'stars', star)}
                              />
                            ))}
                          </div>
                          {current.stars > 0 && (
                            <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                              <input
                                type="text"
                                placeholder="Add a comment... (optional)"
                                className="flex-1 bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                                value={current.feedback}
                                onChange={(e) => setItemRating(item.id, 'feedback', e.target.value)}
                              />
                              <button
                                onClick={() => handleSubmitRating(item.id)}
                                className="bg-slate-900 text-white p-2 rounded-xl hover:bg-orange-500 transition-colors active:scale-95"
                              >
                                <Send size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}