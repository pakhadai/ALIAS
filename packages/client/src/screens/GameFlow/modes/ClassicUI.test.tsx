import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClassicWordCard } from './ClassicUI';

function tapCard(card: Element): void {
  fireEvent.pointerDown(card, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
  fireEvent.pointerUp(card, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
}

describe('ClassicWordCard', () => {
  it('should flip on tap when translation answer hint is provided', () => {
    const { container } = render(
      <ClassicWordCard
        displayPrompt="кіт"
        hint="cat"
        hintLabel="Answer"
        flipTapLabel="Tap for answer"
        isCriticalTime={false}
        onSwipe={vi.fn()}
      />
    );

    const card = container.querySelector('[data-word-card]');
    expect(card).toBeTruthy();
    expect(screen.getByText('Tap for answer')).toBeInTheDocument();

    const rotator = card?.querySelector('.transition-transform');
    expect(rotator).not.toHaveStyle({ transform: 'rotateY(180deg)' });

    tapCard(card!);

    expect(rotator).toHaveStyle({ transform: 'rotateY(180deg)' });
    expect(screen.queryByText('Tap for answer')).not.toBeInTheDocument();
  });

  it('should not flip when no hint or answer is available', () => {
    const { container } = render(
      <ClassicWordCard displayPrompt="plainword" isCriticalTime={false} onSwipe={vi.fn()} />
    );

    const card = container.querySelector('[data-word-card]')!;
    const rotator = card.querySelector('.transition-transform');

    tapCard(card);

    expect(rotator).not.toHaveStyle({ transform: 'rotateY(180deg)' });
  });

  it('should call onSwipe for horizontal drag past threshold', () => {
    const onSwipe = vi.fn();
    const { container } = render(
      <ClassicWordCard displayPrompt="кіт" hint="cat" isCriticalTime={false} onSwipe={onSwipe} />
    );

    const card = container.querySelector('[data-word-card]')!;
    fireEvent.pointerDown(card, { clientX: 100, clientY: 100, pointerId: 2, button: 0 });
    fireEvent.pointerUp(card, { clientX: 200, clientY: 100, pointerId: 2, button: 0 });

    expect(onSwipe).toHaveBeenCalledWith(
      'correct',
      expect.objectContaining({ x: expect.any(Number) })
    );
  });
});
