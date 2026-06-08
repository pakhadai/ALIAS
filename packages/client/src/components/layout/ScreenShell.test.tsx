import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScreenShell } from './ScreenShell';

describe('ScreenShell', () => {
  it('should constrain shell height and make the content column scrollable', () => {
    const { container } = render(
      <ScreenShell footer={<div data-testid="footer">Footer</div>}>
        <div data-testid="content">Scrollable body</div>
      </ScreenShell>
    );

    const shell = container.firstElementChild;
    expect(shell?.className).toContain('h-[var(--tg-viewport-height,100dvh)]');
    expect(shell?.className).toContain('max-h-[var(--tg-viewport-height,100dvh)]');

    const scrollColumn = screen.getByTestId('content').parentElement?.parentElement;
    expect(scrollColumn?.className).toContain('overflow-y-auto');
    expect(scrollColumn?.className).toContain('overflow-x-hidden');
    expect(scrollColumn?.className).toContain('min-h-0');
    expect(scrollColumn?.className).toContain('flex-1');
  });

  it('should render header inside the scroll column before content', () => {
    render(
      <ScreenShell header={<div data-testid="header">Header</div>}>
        <div data-testid="content">Scrollable body</div>
      </ScreenShell>
    );

    const scrollColumn = screen.getByTestId('content').parentElement?.parentElement;
    expect(screen.getByTestId('header').parentElement).toBe(scrollColumn);
    expect(scrollColumn?.className).toContain('overflow-y-auto');
    expect(scrollColumn?.firstElementChild).toBe(screen.getByTestId('header'));
  });

  it('should keep contentClassName on the body wrapper below the header', () => {
    render(
      <ScreenShell
        header={<div data-testid="header">Header</div>}
        contentClassName="px-4 items-center"
      >
        <div data-testid="content">Scrollable body</div>
      </ScreenShell>
    );

    const contentWrap = screen.getByTestId('content').parentElement;
    expect(contentWrap?.className).toContain('px-4');
    expect(contentWrap?.className).toContain('items-center');
    expect(contentWrap?.className).not.toContain('overflow-y-auto');
  });

  it('should omit scroll top safe-area when header reserves space', () => {
    render(
      <ScreenShell header={<div data-testid="header">Header</div>}>
        <div data-testid="content">Scrollable body</div>
      </ScreenShell>
    );

    const scrollColumn = screen.getByTestId('content').parentElement?.parentElement;
    expect(scrollColumn?.className).not.toContain('pt-safe-top');
  });

  it('should render footer inside the scroll column after content', () => {
    render(
      <ScreenShell footer={<div data-testid="footer">Footer</div>}>
        <div data-testid="content">Scrollable body</div>
      </ScreenShell>
    );

    const scrollColumn = screen.getByTestId('content').parentElement?.parentElement;
    expect(screen.getByTestId('footer').parentElement).toBe(scrollColumn);
    expect(scrollColumn?.lastElementChild).toBe(screen.getByTestId('footer'));
  });

  it('should omit scroll bottom safe-area when footer reserves space', () => {
    render(
      <ScreenShell footer={<div data-testid="footer">Footer</div>}>
        <div data-testid="content">Scrollable body</div>
      </ScreenShell>
    );

    const scrollColumn = screen.getByTestId('content').parentElement?.parentElement;
    expect(scrollColumn?.className).toContain('w-full');
    expect(scrollColumn?.className).not.toContain('pb-safe-bottom');
  });

  it('should keep scroll bottom safe-area when there is no footer', () => {
    render(
      <ScreenShell>
        <div data-testid="content">Scrollable body</div>
      </ScreenShell>
    );

    const scrollColumn = screen.getByTestId('content').parentElement?.parentElement;
    expect(scrollColumn?.className).toContain('pb-safe-bottom');
  });
});
