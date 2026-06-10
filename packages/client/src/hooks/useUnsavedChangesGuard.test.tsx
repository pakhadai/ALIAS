import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BackNavigationGuardProvider } from '../context/BackNavigationGuardContext';
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';
import { useBackNavigationGuard } from '../context/BackNavigationGuardContext';

function Probe({ isDirty, onSave }: { isDirty: boolean; onSave?: () => void | Promise<void> }) {
  const { guardedNavigate, unsavedModalOpen, confirmDiscard, closeUnsavedModal } =
    useUnsavedChangesGuard({ isDirty, onSave });
  const { runGuardedNavigation } = useBackNavigationGuard();

  return (
    <div>
      <button type="button" onClick={() => guardedNavigate(() => undefined)}>
        header-back
      </button>
      <button type="button" onClick={() => runGuardedNavigation(() => undefined)}>
        tg-back
      </button>
      {unsavedModalOpen ? (
        <>
          <p role="status">unsaved-open</p>
          <button type="button" onClick={confirmDiscard}>
            discard
          </button>
          <button type="button" onClick={closeUnsavedModal}>
            stay
          </button>
        </>
      ) : null}
    </div>
  );
}

describe('useUnsavedChangesGuard', () => {
  it('should block navigation when dirty and allow discard', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <BackNavigationGuardProvider>
        <Probe isDirty onSave={onSave} />
      </BackNavigationGuardProvider>
    );

    await user.click(screen.getByRole('button', { name: 'header-back' }));
    expect(screen.getByRole('status')).toHaveTextContent('unsaved-open');

    await user.click(screen.getByRole('button', { name: 'discard' }));
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('should navigate immediately when clean', async () => {
    const user = userEvent.setup();

    render(
      <BackNavigationGuardProvider>
        <Probe isDirty={false} />
      </BackNavigationGuardProvider>
    );

    await user.click(screen.getByRole('button', { name: 'tg-back' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
