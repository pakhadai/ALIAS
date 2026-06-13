import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginModal } from './LoginModal';
import { Language } from '../../types';

vi.mock('../../context/AuthContext', () => ({
  useAuthContext: () => ({
    loginWithGoogle: vi.fn(),
  }),
}));

vi.mock('../../context/GameContext', () => ({
  useGame: () => ({
    currentTheme: {
      bg: '',
      card: '',
      textMain: 'text-main',
      textSecondary: '',
      button: '',
      iconColor: '',
      isDark: false,
    },
    uiLanguage: Language.UA,
  }),
}));

vi.mock('../../hooks/useT', () => ({
  useT: () => ({
    close: 'Close',
    loginTitle: 'Sign in',
    loginSubtitleShopping: 'Save progress and unlock themes',
    loginGoogleLoading: 'Signing in…',
    loginGoogleFailed: 'Google sign-in failed',
    loginContinueWithout: 'Continue without signing in',
  }),
}));

vi.mock('../../utils/googleIdentity', () => ({
  renderGoogleSignInButton: () => ({ ok: true }),
}));

describe('LoginModal', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id');
  });

  it('should render default-size sheet with title and dismiss action', () => {
    render(<LoginModal open onDismiss={vi.fn()} />);

    const panel = screen.getByRole('dialog');
    expect(panel.className).toContain('bottom-sheet-panel--size-default');
    expect(screen.getByText('Sign in')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue without signing in' })).toBeTruthy();
  });

  it('should pass header taps through the login backdrop while the sheet is open', () => {
    render(<LoginModal open onDismiss={vi.fn()} />);

    const backdrop = document.querySelector('[data-bottom-sheet-backdrop]');
    expect(backdrop?.className).toContain('bottom-sheet-backdrop--chrome-pass-through');
  });
});
