// src/components/Legal.tsx

import React from 'react';
import { ChevronLeft, ShieldCheck, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Legal() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 pb-20">
      <div className="max-w-3xl mx-auto space-y-6">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold px-2 transition-colors active:scale-95"
        >
          <ChevronLeft size={20} /> Back to Menu
        </button>

        <div className="bg-white rounded-[2rem] p-6 sm:p-10 shadow-sm border border-slate-100 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="text-center space-y-2">
            <div className="bg-orange-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} className="text-orange-500" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Privacy & Terms</h1>
            <p className="text-slate-500 font-medium text-sm">Last updated: June 2026</p>
          </div>

          <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <FileText size={18} className="text-orange-500" /> 1. Information We Collect
              </h2>
              <p>When you sign in using Google, we securely receive your basic profile information (Name and Email address) to verify your identity. To fulfill your late-night cravings, we also collect your phone number and campus delivery details (Block and Room Number).</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <ShieldCheck size={18} className="text-orange-500" /> 2. How We Use Your Data
              </h2>
              <p>Your information is used strictly for order fulfillment, delivery logistics, and providing a personalized experience. <strong>We do not, and will never, sell your personal data to third parties.</strong> Your data stays within the kitchen.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <FileText size={18} className="text-orange-500" /> 3. Terms of Service
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Order Fulfillment:</strong> All orders are subject to stock availability and kitchen capacity. We reserve the right to cancel or refund orders if the kitchen is overwhelmed.</li>
                <li><strong>Payments:</strong> Orders must be paid via UPI using the provided QR code or via Cash on Delivery (COD). Please verify the UPI ID before completing the transaction.</li>
                <li><strong>Delivery Rules:</strong> Drivers will deliver to the specified campus block and room. Please ensure your phone is reachable during the delivery window.</li>
              </ul>
            </section>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400 font-medium">
              <p>By using Maggino's, you agree to these terms.</p>
              <p>Built for the campus community.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}