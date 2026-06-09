import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createRef } from 'react';
import { SCREEN_SHELL_SCROLL_ATTR, useCollapsingHeaderTitle } from './useCollapsingHeaderTitle';
import { CSS_VAR_APP_PAGE_HEADER_HEIGHT } from '../constants/tmaLayoutConstants';

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(_cb: ResizeObserverCallback) {
    MockResizeObserver.instances.push(this);
  }
  emit() {
    // no-op — tests drive geometry manually
  }
}

describe('useCollapsingHeaderTitle', () => {
  beforeEach(() => {
    MockResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    document.documentElement.style.setProperty(CSS_VAR_APP_PAGE_HEADER_HEIGHT, '80px');
  });

  afterEach(() => {
    document.documentElement.style.removeProperty(CSS_VAR_APP_PAGE_HEADER_HEIGHT);
    vi.unstubAllGlobals();
  });

  it('should return false when hero title is still visible below the header', () => {
    const targetRef = createRef<HTMLDivElement>();
    const scrollRoot = document.createElement('div');
    scrollRoot.setAttribute(SCREEN_SHELL_SCROLL_ATTR, '');
    const hero = document.createElement('div');
    scrollRoot.appendChild(hero);
    document.body.appendChild(scrollRoot);
    targetRef.current = hero;

    vi.spyOn(scrollRoot, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 600,
      left: 0,
      right: 375,
      width: 375,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    vi.spyOn(hero, 'getBoundingClientRect').mockReturnValue({
      top: 120,
      bottom: 160,
      left: 0,
      right: 375,
      width: 375,
      height: 40,
      x: 0,
      y: 120,
      toJSON: () => ({}),
    });

    const { result } = renderHook(() => useCollapsingHeaderTitle(targetRef));
    expect(result.current).toBe(false);

    scrollRoot.remove();
  });

  it('should return true when hero title has scrolled under the header', () => {
    const targetRef = createRef<HTMLDivElement>();
    const scrollRoot = document.createElement('div');
    scrollRoot.setAttribute(SCREEN_SHELL_SCROLL_ATTR, '');
    const hero = document.createElement('div');
    scrollRoot.appendChild(hero);
    document.body.appendChild(scrollRoot);
    targetRef.current = hero;

    vi.spyOn(scrollRoot, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 600,
      left: 0,
      right: 375,
      width: 375,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    vi.spyOn(hero, 'getBoundingClientRect').mockReturnValue({
      top: 40,
      bottom: 72,
      left: 0,
      right: 375,
      width: 375,
      height: 32,
      x: 0,
      y: 40,
      toJSON: () => ({}),
    });

    const { result } = renderHook(() => useCollapsingHeaderTitle(targetRef));
    expect(result.current).toBe(true);

    scrollRoot.remove();
  });

  it('should update on scroll events', () => {
    const targetRef = createRef<HTMLDivElement>();
    const scrollRoot = document.createElement('div');
    scrollRoot.setAttribute(SCREEN_SHELL_SCROLL_ATTR, '');
    const hero = document.createElement('div');
    scrollRoot.appendChild(hero);
    document.body.appendChild(scrollRoot);
    targetRef.current = hero;

    const rootRect = {
      top: 0,
      bottom: 600,
      left: 0,
      right: 375,
      width: 375,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
    vi.spyOn(scrollRoot, 'getBoundingClientRect').mockReturnValue(rootRect);

    let titleBottom = 160;
    vi.spyOn(hero, 'getBoundingClientRect').mockImplementation(() => ({
      top: titleBottom - 40,
      bottom: titleBottom,
      left: 0,
      right: 375,
      width: 375,
      height: 40,
      x: 0,
      y: titleBottom - 40,
      toJSON: () => ({}),
    }));

    const { result } = renderHook(() => useCollapsingHeaderTitle(targetRef));
    expect(result.current).toBe(false);

    act(() => {
      titleBottom = 70;
      scrollRoot.dispatchEvent(new Event('scroll'));
    });
    expect(result.current).toBe(true);

    scrollRoot.remove();
  });
});
