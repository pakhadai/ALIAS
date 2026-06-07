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
  useHapticFeedback: () => ({ notificationOccurred }),
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

describe('QuickBuyModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_STRIPE_PUBLIC_KEY', 'pk_test_mock');
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
    const { QuickBuyModal } = await import('./QuickBuyModal');
    render(
      <QuickBuyModal
        itemType="wordPack"
        itemId="pack-1"
        isDark
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Telegram Stars/i)).toBeInTheDocument();
    });
  });

  it('should call openInvoice with invoiceUrl and invoke onSuccess when paid', async () => {
    openInvoice.mockImplementation((_url: string, cb: (status: string) => void) => {
      cb('paid');
    });

    const onSuccess = vi.fn();
    const onClose = vi.fn();
    const { QuickBuyModal } = await import('./QuickBuyModal');

    render(
      <QuickBuyModal
        itemType="wordPack"
        itemId="pack-1"
        isDark
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByText(/Telegram Stars/i)).toBeInTheDocument();
    });

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
    const { QuickBuyModal } = await import('./QuickBuyModal');

    render(
      <QuickBuyModal
        itemType="theme"
        itemId="theme-1"
        isDark={false}
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />
    );

    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByText(/Telegram Stars/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Telegram Stars/i }));

    await waitFor(() => {
      expect(openInvoice).toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(notificationOccurred).toHaveBeenCalledWith('warning');
    });
  });
});
