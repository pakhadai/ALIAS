import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogoutConfirmBottomSheet } from './LogoutConfirmBottomSheet';

describe('LogoutConfirmBottomSheet', () => {
  it('should render danger confirm and ghost cancel like ConfirmationModal', () => {
    const onConfirm = vi.fn();
    render(
      <LogoutConfirmBottomSheet
        onDismiss={vi.fn()}
        onConfirm={onConfirm}
        loggingOut={false}
        title="Sign out?"
        cancelLabel="Stay"
        confirmLabel="Sign out"
        loadingLabel="Signing out…"
      />
    );

    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Stay' })).toBeTruthy();
  });

  it('should call onConfirm when danger button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <LogoutConfirmBottomSheet
        onDismiss={vi.fn()}
        onConfirm={onConfirm}
        loggingOut={false}
        title="Sign out?"
        cancelLabel="Stay"
        confirmLabel="Sign out"
        loadingLabel="Signing out…"
      />
    );

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
