
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { X, Loader2, ShieldCheck } from 'lucide-react';
import { createPaymentIntent } from '../../services/api';
import { AppTheme } from '../../types';

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

// ─── Inner form (has access to Stripe hooks) ─────────────────────────────────

interface PayFormProps {
  amount: number;
  itemName: string;
  isDark: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

function PayForm({ amount, itemName, isDark, onSuccess, onClose }: PayFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${window.location.origin}/?purchase=success`,
      },
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Помилка оплати');
      setPaying(false);
    } else {
      onSuccess();
    }
  };

  const inputBg = isDark
    ? 'bg-[#1E1E1E] border-white/10 text-white'
    : 'bg-white border-slate-200 text-slate-900';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Item summary */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
        <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{itemName}</span>
        <span className="text-[#D4AF6A] font-bold text-base">${(amount / 100).toFixed(2)}</span>
      </div>

      {/* Stripe Payment Element — renders Apple Pay / Google Pay / Card automatically */}
      <div className="rounded-2xl overflow-hidden">
        <PaymentElement
          options={{
            layout: { type: 'accordion', defaultCollapsed: false, radios: false, spacedAccordionItems: false },
            wallets: { applePay: 'auto', googlePay: 'auto' },
          }}
        />
      </div>

      {error && (
        <p className="text-red-400 text-[12px] text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={paying || !stripe}
        className="w-full bg-[#D4AF6A] hover:bg-[#C9A55A] active:scale-[0.98] text-black font-bold text-[14px] py-4 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {paying
          ? <><Loader2 size={16} className="animate-spin" /> Обробка...</>
          : <>Оплатити ${(amount / 100).toFixed(2)}</>}
      </button>

      <div className="flex items-center justify-center gap-2 opacity-40">
        <ShieldCheck size={13} />
        <span className={`text-[10px] uppercase tracking-widest font-medium ${isDark ? 'text-white' : 'text-slate-600'}`}>
          Захищено Stripe
        </span>
      </div>
    </form>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

interface QuickBuyModalProps {
  itemType: 'wordPack' | 'theme' | 'soundPack';
  itemId: string;
  isDark: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickBuyModal({ itemType, itemId, isDark, onClose, onSuccess }: QuickBuyModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [itemName, setItemName] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    createPaymentIntent(itemType, itemId)
      .then(data => {
        setClientSecret(data.clientSecret);
        setAmount(data.amount);
        setItemName(data.itemName);
      })
      .catch(err => {
        setLoadError(err?.message ?? 'Не вдалося ініціювати оплату');
      });
  }, []);

  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  // Stripe Element appearance
  const appearance = {
    theme: (isDark ? 'night' : 'stripe') as 'night' | 'stripe',
    variables: {
      colorPrimary: '#D4AF6A',
      borderRadius: '12px',
      fontFamily: 'inherit',
    },
  };

  const bgCard = isDark ? 'bg-[#1A1A1A] border border-white/10' : 'bg-white border border-slate-200';

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className={`relative w-full max-w-sm ${bgCard} rounded-t-[2rem] px-6 pt-5 pb-8 z-10 shadow-2xl`}
           style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
        {/* Handle */}
        <div className="flex justify-center mb-5">
          <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-white/20' : 'bg-slate-200'}`} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className={`font-serif text-xl tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Швидка оплата
          </h2>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-white/8 hover:bg-white/15' : 'bg-slate-100 hover:bg-slate-200'}`}
          >
            <X size={16} className={isDark ? 'text-white/70' : 'text-slate-500'} />
          </button>
        </div>

        {/* Content */}
        {loadError ? (
          <p className="text-red-400 text-[13px] text-center py-8">{loadError}</p>
        ) : !stripePromise ? (
          <p className={`text-[12px] text-center py-8 opacity-40 ${isDark ? 'text-white' : 'text-slate-600'}`}>
            Платіжна система не налаштована
          </p>
        ) : !clientSecret ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className={`animate-spin ${isDark ? 'text-white/40' : 'text-slate-400'}`} />
          </div>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
            <PayForm
              amount={amount}
              itemName={itemName}
              isDark={isDark}
              onSuccess={handleSuccess}
              onClose={onClose}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}
