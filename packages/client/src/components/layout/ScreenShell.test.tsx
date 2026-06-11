import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useScreenLayoutOptional } from '../../context/ScreenLayoutContext';
import { GLASS_CHROME_PORTAL_ROOT_ID } from './GlassChromePortal';
import { ScreenShell } from './ScreenShell';

function LayoutProbe() {
  const layout = useScreenLayoutOptional();
  return (
    <span data-testid="layout-probe">
      {layout ? `${layout.contentRail}:${layout.contentInsetX}` : 'none'}
    </span>
  );
}

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

  it('should merge layout preset body classes and provide layout context to fixed chrome', () => {
    render(
      <ScreenShell layout="canonical" headerFixed header={<LayoutProbe />} contentClassName="gap-4">
        <div data-testid="content">Body</div>
      </ScreenShell>
    );

    const contentWrap = screen.getByTestId('content').parentElement;
    expect(contentWrap?.className).toContain('max-w-2xl');
    expect(contentWrap?.className).toContain('px-6');
    expect(contentWrap?.className).toContain('gap-4');
    expect(screen.getByTestId('layout-probe').textContent).toBe('canonical:1.5rem');
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

  it('should render fixed header outside scroll with top clearance padding', () => {
    const { container } = render(
      <ScreenShell headerFixed header={<div data-testid="header">Header</div>}>
        <div data-testid="content">Scrollable body</div>
      </ScreenShell>
    );

    const scrollColumn = container.querySelector('[data-screen-shell-scroll]');
    const header = screen.getByTestId('header');
    const portalRoot = document.getElementById(GLASS_CHROME_PORTAL_ROOT_ID);
    expect(portalRoot).toBeTruthy();
    expect(header.parentElement).toBe(portalRoot);
    expect(header.closest('[data-screen-shell-scroll]')).toBeNull();
    expect(container.querySelector('[data-testid="header"]')).toBeNull();
    expect(scrollColumn?.className).toContain('pt-[var(--app-page-header-height)]');
    expect(scrollColumn?.className).not.toContain('pt-safe-top');
    expect(scrollColumn?.querySelector('[data-testid="header"]')).toBeNull();
  });

  it('should render fixed footer outside scroll with island stack padding', () => {
    const { container } = render(
      <ScreenShell footerFixed footer={<div data-testid="footer">Footer</div>}>
        <div data-testid="content">Scrollable body</div>
      </ScreenShell>
    );

    const scrollColumn = container.querySelector('[data-screen-shell-scroll]');
    const footer = screen.getByTestId('footer');
    const portalRoot = document.getElementById(GLASS_CHROME_PORTAL_ROOT_ID);
    expect(portalRoot).toBeTruthy();
    expect(footer.parentElement).toBe(portalRoot);
    expect(footer.closest('[data-screen-shell-scroll]')).toBeNull();
    expect(container.querySelector('[data-testid="footer"]')).toBeNull();
    expect(scrollColumn?.className).toContain('pb-[var(--footer-island-stack)]');
    expect(scrollColumn?.className).not.toContain('pb-safe-bottom');
    expect(scrollColumn?.querySelector('[data-testid="footer"]')).toBeNull();
  });
});
