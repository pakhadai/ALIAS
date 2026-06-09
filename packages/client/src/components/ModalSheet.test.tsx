import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModalSheet } from './ModalSheet';
import { useVisualViewportBottomInset } from '../hooks/useVisualViewportBottomInset';

vi.mock('../hooks/useVisualViewportBottomInset', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useVisualViewportBottomInset')>();
  return {
    ...actual,
    useVisualViewportBottomInset: vi.fn(() => 0),
  };
});
import { bottomSheetPanelClass, modalSheetTitleClass } from './Shared';
import { typographyClass } from '../constants/typography';
import {
  modalSheetContentPaddingBySize,
  modalSheetDefaultMaxWidthBySize,
  resolveModalSheetMaxWidth,
} from './ModalSheet.presets';

describe('modalSheetTitleClass', () => {
  it('should use typography heading token', () => {
    expect(modalSheetTitleClass).toBe(typographyClass.heading);
    expect(modalSheetTitleClass).toContain('text-ui-heading');
  });
});

describe('ModalSheet.presets', () => {
  it('should define padding canon per size', () => {
    expect(modalSheetContentPaddingBySize.compact).toContain('px-5');
    expect(modalSheetContentPaddingBySize.compact).toContain('text-center');
    expect(modalSheetContentPaddingBySize.default).toContain('px-5');
    expect(modalSheetContentPaddingBySize.tall).not.toContain('overflow-y-auto');
  });

  it('should resolve maxWidth from size when prop omitted', () => {
    expect(resolveModalSheetMaxWidth('compact', undefined)).toBe('sm');
    expect(resolveModalSheetMaxWidth('default', undefined)).toBe('md');
    expect(resolveModalSheetMaxWidth('tall', undefined)).toBe('md');
    expect(resolveModalSheetMaxWidth('compact', 'lg')).toBe('lg');
  });

  it('should map default maxWidth by size', () => {
    expect(modalSheetDefaultMaxWidthBySize.compact).toBe('sm');
    expect(modalSheetDefaultMaxWidthBySize.default).toBe('md');
  });
});

describe('bottomSheetPanelClass', () => {
  it('should apply size modifier classes for sheet layout', () => {
    expect(bottomSheetPanelClass('', 'compact')).toContain('bottom-sheet-panel--size-compact');
    expect(bottomSheetPanelClass('', 'default')).toContain('bottom-sheet-panel--size-default');
    expect(bottomSheetPanelClass('', 'tall')).toContain('bottom-sheet-panel--size-tall');
    expect(bottomSheetPanelClass('', 'default')).toContain('bottom-sheet-panel--sheet');
  });
});

describe('ModalSheet', () => {
  beforeEach(() => {
    vi.mocked(useVisualViewportBottomInset).mockReturnValue(0);
  });

  it('should apply default size padding when paddedContent is true', () => {
    render(
      <ModalSheet open onClose={() => undefined}>
        <p>Body</p>
      </ModalSheet>
    );

    const body = screen.getByText('Body');
    expect(body.parentElement?.className).toContain('px-5');
    expect(body.parentElement?.className).toContain('pb-modal-bottom');
  });

  it('should apply compact centered padding and sm max width', () => {
    render(
      <ModalSheet open size="compact" onClose={() => undefined}>
        <p>Confirm</p>
      </ModalSheet>
    );

    const panel = screen.getByRole('dialog');
    expect(panel.className).toContain('max-w-sm');
    expect(panel.className).toContain('bottom-sheet-panel--size-compact');

    const content = screen.getByText('Confirm').parentElement;
    expect(content?.className).toContain('px-5');
    expect(content?.className).toContain('text-center');
    expect(content?.className).toContain('pb-modal-bottom');
  });

  it('should set data-sheet-scroll and tall max-height class on tall preset', () => {
    render(
      <ModalSheet open size="tall" onClose={() => undefined}>
        <p>Rules</p>
      </ModalSheet>
    );

    const panel = screen.getByRole('dialog');
    expect(panel.hasAttribute('data-sheet-scroll')).toBe(true);
    expect(panel.className).toContain('bottom-sheet-panel--size-tall');

    const scrollColumn = document.querySelector('[data-modal-sheet-scroll]');
    expect(scrollColumn).not.toBeNull();
    expect(scrollColumn?.className).toContain('modal-sheet-scroll');

    const content = screen.getByText('Rules').parentElement;
    expect(content?.className).toContain('pb-modal-bottom');
    expect(content?.className).not.toContain('overflow-y-auto');
  });

  it('should lift via --sheet-keyboard-lift and keep pb-modal-bottom when keyboard is open', () => {
    vi.mocked(useVisualViewportBottomInset).mockReturnValue(280);

    render(
      <ModalSheet open onClose={() => undefined}>
        <p>Keyboard</p>
      </ModalSheet>
    );

    const content = screen.getByText('Keyboard').parentElement;
    expect(content?.className).toContain('pb-modal-bottom');
    expect(content?.className).not.toContain('pb-4');

    const backdrop = document.querySelector('[data-bottom-sheet-backdrop]') as HTMLElement | null;
    expect(backdrop?.getAttribute('data-keyboard-open')).toBe('true');
    expect(backdrop?.style.getPropertyValue('--sheet-keyboard-lift')).toBe('288px');
  });

  it('should ignore keyboard inset when keyboardAvoiding is false', () => {
    vi.mocked(useVisualViewportBottomInset).mockReturnValue(280);

    render(
      <ModalSheet open keyboardAvoiding={false} onClose={() => undefined}>
        <p>No lift</p>
      </ModalSheet>
    );

    const content = screen.getByText('No lift').parentElement;
    expect(content?.className).toContain('pb-modal-bottom');
    expect(content?.className).not.toContain('pb-4');

    const backdrop = document.querySelector('[data-bottom-sheet-backdrop]');
    expect(backdrop?.getAttribute('data-keyboard-open')).toBe('false');
  });

  it('should render children without padding wrapper when paddedContent is false', () => {
    render(
      <ModalSheet open paddedContent={false} onClose={() => undefined}>
        <p>Raw</p>
      </ModalSheet>
    );

    expect(screen.getByText('Raw').parentElement?.className).not.toContain('pb-modal-bottom');
  });
});
