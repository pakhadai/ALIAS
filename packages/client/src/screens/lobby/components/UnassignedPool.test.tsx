import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UnassignedPool } from './UnassignedPool';
import type { TranslationStrings } from '../../../hooks/useT';

const t = {
  unassignedPool: 'Unassigned ({0})',
  assignPlayerAria: 'Assign {0}',
} as TranslationStrings;

describe('UnassignedPool', () => {
  it('should render nothing when unassigned list is empty', () => {
    const { container } = render(
      <UnassignedPool unassigned={[]} canHostAssignOffline={false} onPick={() => {}} t={t} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render pool when players are unassigned', () => {
    render(
      <UnassignedPool
        unassigned={[
          {
            id: 'p1',
            name: 'Alice',
            avatar: '🦊',
            isHost: false,
            stats: { explained: 0, guessed: 0 },
          },
        ]}
        canHostAssignOffline={false}
        onPick={() => {}}
        t={t}
      />
    );
    expect(screen.getByText('Unassigned (1)')).toBeTruthy();
  });
});
