import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, Loader2, ShieldCheck } from 'lucide-react';
import { createPaymentIntent } from '../../services/api';
import { bottomSheetBackdropClass, bottomSheetPanelClass, ModalPortal } from '../Shared';

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

// ─── Inner form (has access to Stripe hooks) ─────────────────────────────────

interface PayFormProps {
  amount: number;
  itemName: string;
  onSuccess: () => void;
}

function PayForm({ amount, itemName, onSuccess }: PayFormProps) {
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Item summary */}
      <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-ui-surface border border-ui-border">
        <span className="text-sm font-semibold text-ui-fg">{itemName}</span>
        <span className="text-ui-accent font-bold text-base">${(amount / 100).toFixed(2)}</span>
      </div>

      {/* Stripe Payment Element — renders Apple Pay / Google Pay / Card automatically */}
      <div className="rounded-2xl overflow-hidden">
        <PaymentElement
          options={{
            layout: {
              type: 'accordion',
              defaultCollapsed: false,
              radios: false,
              spacedAccordionItems: false,
            },
            wallets: { applePay: 'auto', googlePay: 'auto' },
          }}
        />
      </div>

      {error && <p className="text-ui-danger text-[12px] text-center">{error}</p>}

      <button
        type="submit"
        disabled={paying || !stripe}
        className="w-full bg-ui-accent hover:bg-ui-accent-hover active:bg-ui-accent-pressed active:scale-[0.98] text-ui-accent-contrast font-bold text-[14px] py-4 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {paying ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Обробка...
          </>
        ) : (
          <>Оплатити ${(amount / 100).toFixed(2)}</>
        )}
      </button>

      <div className="flex items-center justify-center gap-2 opacity-40">
        <ShieldCheck size={13} />
        <span className="text-[10px] uppercase tracking-widest font-medium text-ui-fg-muted">
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

export function QuickBuyModal({
  itemType,
  itemId,
  isDark,
  onClose,
  onSuccess,
}: QuickBuyModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [itemName, setItemName] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    createPaymentIntent(itemType, itemId)
      .then((data) => {
        setClientSecret(data.clientSecret);
        setAmount(data.amount);
        setItemName(data.itemName);
      })
      .catch((err) => {
        setLoadError(err?.message ?? 'Не вдалося ініціювати оплату');
      });
  }, [itemId, itemType]);

  const requestClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(), 300);
  };

  const handleSuccess = () => {
    onSuccess();
    requestClose();
  };

  // Stripe Element appearance
  const appearance = {
    theme: (isDark ? 'night' : 'stripe') as 'night' | 'stripe',
    variables: {
      colorPrimary: 'var(--ui-accent)',
      borderRadius: '12px',
      fontFamily: 'inherit',
    },
  };

  const sheetOpen = !isClosing;

  return (
    <ModalPortal>
      <div
        className={bottomSheetBackdropClass(sheetOpen, 'z-50')}
        onClick={requestClose}
        role="presentation"
      >
        <div
          className={bottomSheetPanelClass(sheetOpen, 'px-6 pt-5 pb-safe-bottom-8')}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Handle */}
          <div className="flex justify-center mb-5">
            <div className="w-10 h-1 rounded-full bg-ui-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl tracking-wide text-ui-fg">Швидка оплата</h2>
            <button
              onClick={requestClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-ui-surface hover:bg-ui-surface-hover border border-ui-border"
            >
              <X size={16} className="text-ui-fg-muted" />
            </button>
          </div>

          {/* Content */}
          {loadError ? (
            <p className="text-ui-danger text-[13px] text-center py-8">{loadError}</p>
          ) : !stripePromise ? (
            <p className="text-[12px] text-center py-8 opacity-40 text-ui-fg-muted">
              Платіжна система не налаштована
            </p>
          ) : !clientSecret ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-ui-fg-muted" />
            </div>
          ) : (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
              <PayForm amount={amount} itemName={itemName} onSuccess={handleSuccess} />
            </Elements>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
