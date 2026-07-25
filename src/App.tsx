// src/App.tsx
// Components and routing only — no non-component exports.

import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { QrCode, X } from 'lucide-react';

import { useStore } from './store/useStore';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useAuthActions, useOrderActions } from './hooks/useAppActions';
import { KITCHEN_UPI_ID } from './config/constants';

import { Header } from './components/Header';
import { Menu } from './components/Menu';
import { CartModal } from './components/CartModal';
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const LandingPage = React.lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));
import { OrderTracking } from './components/OrderTracking';
import { MyOrdersDrawer } from './components/MyOrdersDrawer';
import { Legal } from './components/Legal';
import { StoreHeroBanner } from './components/StoreHeroBanner';
import { LoadingSkeletons } from './components/LoadingSkeletons';
import { ErrorState } from './components/ErrorState';

// ─── QR / UPI Payment Modal ────────────────────────────────────────────────────
function QRPaymentModal() {
  const { pendingOrderData, setShowQRModal, setPendingOrderData } = useStore();
  const { submitOrder } = useOrderActions();

  if (!pendingOrderData) return null;

  const dismiss = () => { setShowQRModal(false); setPendingOrderData(null); };
  const upiLink = `upi://pay?pa=${KITCHEN_UPI_ID}&pn=Magginos&am=${pendingOrderData.total.toFixed(2)}&cu=INR&tn=Order${pendingOrderData.displayId}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[110] animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="qr-modal-title">
      <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-sm p-6 sm:p-8 text-center shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 flex flex-col">
        <div className="flex justify-between items-center border-b border-slate-50 pb-4 mb-6">
          <h3 id="qr-modal-title" className="font-black text-slate-800 text-lg flex items-center gap-2">
            <QrCode size={20} className="text-orange-500" /> Scan to Pay
          </h3>
          <button onClick={dismiss} aria-label="Close payment modal" className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 active:scale-90 transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="bg-slate-50 p-4 rounded-[2rem] inline-block shadow-inner border border-slate-100 mb-6 mx-auto">
          <img src={qrSrc} alt="UPI QR Code" className="w-48 h-48 rounded-xl shadow-sm border-4 border-white" />
        </div>
        <div className="space-y-2 mb-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Amount Due</p>
          <h2 className="text-4xl font-black text-slate-900">₹{pendingOrderData.total}</h2>
          <p className="text-[11px] text-slate-500 font-medium px-4 pt-2 leading-relaxed">
            Scan with PhonePe, GPay, or Paytm. Or tap below to open your payment app.
          </p>
        </div>
        <a href={upiLink} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 text-sm mb-3">
          <QrCode size={18} /> Open Payment App ↗
        </a>
        <button onClick={() => submitOrder(pendingOrderData)} className="w-full bg-slate-900 hover:bg-orange-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 text-sm">
          I Have Paid Successfully
        </button>
      </div>
    </div>
  );
}

// ─── Customer Order Page ───────────────────────────────────────────────────────
function OrderPage() {
  const { login, logout } = useAuthActions();
  const { isLoading, loadingError, isStoreOpen, currentUser, showMyOrders, activeTrackingId, showCheckout, showQRModal, orders, setActiveTrackingId } = useStore();
  const activeOrder = orders.find((o) => o.dbId === activeTrackingId);

  return (
    <div className="w-full">
      <Header currentView="customer" onLogin={login} onLogout={logout} />
      {showMyOrders && <MyOrdersDrawer />}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8 pb-10">
        {loadingError && !showMyOrders ? (
          <ErrorState message={loadingError} />
        ) : activeTrackingId && !showMyOrders ? (
          <OrderTracking order={activeOrder} onBack={() => setActiveTrackingId(null)} />
        ) : !showMyOrders && (
          isLoading ? <LoadingSkeletons /> : (
            <div className="space-y-8 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <StoreHeroBanner isOpen={isStoreOpen} currentUser={currentUser} onLogin={login} />
              <Menu />
            </div>
          )
        )}
      </main>
      {showCheckout && <CartModal onLogin={login} />}
      {showQRModal && <QRPaymentModal />}
    </div>
  );
}

// ─── Admin Page ────────────────────────────────────────────────────────────────
function AdminPage() {
  const { login, logout } = useAuthActions();
  return (
    <div className="w-full">
      <Header currentView="admin" onLogin={login} onLogout={logout} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8">
        <AdminDashboard onLogin={login} />
      </main>
    </div>
  );
}

// ─── Root App ──────────────────────────────────────────────────────────────────
function AppContent() {
  const navigate = useNavigate();
  useFirebaseSync();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-orange-200 selection:text-orange-900 flex flex-col">
      <div className="flex-1">
        <React.Suspense fallback={<LoadingSkeletons />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/order" element={<OrderPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/legal" element={<Legal />} />
          </Routes>
        </React.Suspense>
      </div>
      <footer className="py-8 text-center bg-slate-100/50 border-t border-slate-200 mt-auto">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">&copy; 2026 Maggino's</p>
        <button onClick={() => { window.scrollTo(0, 0); navigate('/legal'); }} className="text-[11px] font-medium text-slate-500 hover:text-orange-500 transition-colors mt-2 block mx-auto">
          Privacy Policy &amp; Terms
        </button>
      </footer>
    </div>
  );
}

export function WrappedApp() {
  return <Router><AppContent /></Router>;
}