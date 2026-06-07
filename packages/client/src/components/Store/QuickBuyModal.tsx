import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, ShieldCheck } from 'lucide-react';
import { buyWithStars, createPaymentIntent } from '../../services/api';
import { Button } from '../Button';
import { ModalSheet } from '../ModalSheet';
import { ModalSheetTitle } from '../Shared';
import { typographyClass } from '../../constants/typography';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

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
        <span className={`${typographyClass.body} font-semibold text-ui-fg`}>{itemName}</span>
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

      {error && <p className={`text-ui-danger ${typographyClass.body} text-center`}>{error}</p>}

      <Button type="submit" variant="primary" fullWidth size="xl" disabled={paying || !stripe}>
        {paying ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" aria-hidden />
            Обробка...
          </span>
        ) : (
          <>Оплатити ${(amount / 100).toFixed(2)}</>
        )}
      </Button>

      <div className="flex items-center justify-center gap-2 opacity-40">
        <ShieldCheck size={13} />
        <span className={`${typographyClass.label} tracking-widest font-medium text-ui-fg-muted`}>
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
  const haptic = useHapticFeedback();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [itemName, setItemName] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [starsLoading, setStarsLoading] = useState(false);
  const [open, setOpen] = useState(true);

  const requestClose = () => setOpen(false);

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

  const canUseStars =
    Boolean(window.Telegram?.WebApp?.initData) &&
    typeof window.Telegram?.WebApp?.openInvoice === 'function';

  const handleBuyStars = async () => {
    if (!canUseStars) return;
    setStarsLoading(true);
    setLoadError(null);
    try {
      const { invoiceUrl } = await buyWithStars({ itemType, itemId });
      window.Telegram?.WebApp?.openInvoice?.(invoiceUrl, (status) => {
        if (status === 'paid') {
          haptic.notificationOccurred('success');
          onSuccess();
          requestClose();
        } else if (status === 'cancelled') {
          haptic.notificationOccurred('warning');
        }
        setStarsLoading(false);
      });
    } catch (err) {
      setLoadError((err as Error).message ?? 'Не вдалося ініціювати оплату через Stars');
      setStarsLoading(false);
    }
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

  return (
    <ModalSheet
      open={open}
      onClose={requestClose}
      onExited={onClose}
      size="default"
      showClose
      closeAriaLabel="Закрити"
      ariaLabelledBy="quick-buy-title"
      header={<ModalSheetTitle id="quick-buy-title">Швидка оплата</ModalSheetTitle>}
    >
      {loadError ? (
        <p className={`text-ui-danger ${typographyClass.body} text-center py-8`}>{loadError}</p>
      ) : !stripePromise ? (
        <p className={`${typographyClass.body} text-center py-8 opacity-40 text-ui-fg-muted`}>
          Платіжна система не налаштована
        </p>
      ) : !clientSecret ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-ui-fg-muted" />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {canUseStars && (
            <button
              type="button"
              onClick={handleBuyStars}
              disabled={starsLoading}
              className={`w-full rounded-2xl border border-ui-border bg-ui-surface hover:bg-ui-surface-hover active:scale-[0.98] transition-all py-4 font-bold ${typographyClass.body} flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              {starsLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Відкриваємо оплату…
                </>
              ) : (
                <>⭐ Купити за Telegram Stars</>
              )}
            </button>
          )}

          <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
            <PayForm amount={amount} itemName={itemName} onSuccess={handleSuccess} />
          </Elements>
        </div>
      )}
    </ModalSheet>
  );
}
