import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const createPaymentIntent = vi.fn();
const buyWithStars = vi.fn();
const notificationOccurred = vi.fn();
const openInvoice = vi.fn();

vi.mock('../../services/api', () => ({
  createPaymentIntent: (...args: unknown[]) => createPaymentIntent(...args),
  buyWithStars: (...args: unknown[]) => buyWithStars(...args),
}));

vi.mock('../../hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({
    notificationOccurred,
    pattern: vi.fn(),
    impactOccurred: vi.fn(),
  }),
}));

vi.mock('../ModalSheet', () => ({
  ModalSheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="modal">{children}</div> : null,
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => ({}),
  useElements: () => ({}),
}));

async function renderQuickBuyModal(props: {
  itemType: 'wordPack' | 'theme' | 'soundPack';
  itemId: string;
  isDark: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  vi.resetModules();
  vi.stubEnv('VITE_STRIPE_PUBLIC_KEY', 'pk_test_mock');
  const { QuickBuyModal } = await import('./QuickBuyModal');
  const view = render(<QuickBuyModal {...props} />);
  await waitFor(
    () => {
      expect(screen.getByRole('button', { name: /Telegram Stars/i })).toBeInTheDocument();
    },
    { timeout: 10_000 }
  );
  return view;
}

describe('QuickBuyModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createPaymentIntent.mockResolvedValue({
      clientSecret: 'cs_test_secret',
      amount: 499,
      itemName: 'Test Pack',
    });
    buyWithStars.mockResolvedValue({ invoiceUrl: 'https://t.me/invoice/test' });

    window.Telegram = {
      WebApp: {
        initData: 'signed-init-data',
        openInvoice: openInvoice,
      },
    } as unknown as typeof window.Telegram;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete (window as { Telegram?: unknown }).Telegram;
  });

  it('should render Telegram Stars button when TMA openInvoice is available', async () => {
    await renderQuickBuyModal({
      itemType: 'wordPack',
      itemId: 'pack-1',
      isDark: true,
      onClose: vi.fn(),
      onSuccess: vi.fn(),
    });

    expect(screen.getByRole('button', { name: /Telegram Stars/i })).toBeInTheDocument();
  });

  it('should call openInvoice with invoiceUrl and invoke onSuccess when paid', async () => {
    openInvoice.mockImplementation((_url: string, cb: (status: string) => void) => {
      cb('paid');
    });

    const onSuccess = vi.fn();
    const onClose = vi.fn();

    await renderQuickBuyModal({
      itemType: 'wordPack',
      itemId: 'pack-1',
      isDark: true,
      onClose,
      onSuccess,
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Telegram Stars/i }));

    await waitFor(() => {
      expect(buyWithStars).toHaveBeenCalledWith({ itemType: 'wordPack', itemId: 'pack-1' });
      expect(openInvoice).toHaveBeenCalledWith('https://t.me/invoice/test', expect.any(Function));
      expect(onSuccess).toHaveBeenCalled();
      expect(notificationOccurred).toHaveBeenCalledWith('success');
    });
  });

  it('should not call onSuccess when Stars payment is cancelled', async () => {
    openInvoice.mockImplementation((_url: string, cb: (status: string) => void) => {
      cb('cancelled');
    });

    const onSuccess = vi.fn();

    await renderQuickBuyModal({
      itemType: 'theme',
      itemId: 'theme-1',
      isDark: false,
      onClose: vi.fn(),
      onSuccess,
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Telegram Stars/i }));

    await waitFor(() => {
      expect(openInvoice).toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(notificationOccurred).toHaveBeenCalledWith('warning');
    });
  });
});
