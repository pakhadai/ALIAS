import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { typographyClass } from '../../constants/typography';
import { GlassIconButton } from './GlassIconButton';
import { UI_GLASS_PANEL_CLASS } from './GlassAppHeader';
import { GLASS_CHROME_PORTAL_ROOT_ID } from './GlassChromePortal';

export interface AppHeaderMenuItem {
  id: string;
  label: string;
  onSelect?: () => void;
  disabled?: boolean;
}

export interface AppHeaderOverflowMenuProps {
  items: AppHeaderMenuItem[];
  ariaLabel: string;
  testId?: string;
}

function getPopoverPortalRoot(): HTMLElement {
  return document.getElementById(GLASS_CHROME_PORTAL_ROOT_ID) ?? document.body;
}

/** Browser-only overflow menu — chip stays in the header; panel portals below without layout shift. */
export function AppHeaderOverflowMenu({
  items,
  ariaLabel,
  testId = 'app-header-menu',
}: AppHeaderOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; right: number } | null>(
    null
  );

  const updatePopoverPosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    setPopoverPosition({
      top: rect.bottom + 4,
      right: Math.max(0, window.innerWidth - rect.right),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPopoverPosition(null);
      return;
    }

    updatePopoverPosition();

    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);
    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [open, updatePopoverPosition]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (anchorRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const toggleOpen = () => {
    if (items.length === 0) return;
    setOpen((value) => !value);
  };

  const handleSelect = (item: AppHeaderMenuItem) => {
    if (item.disabled) return;
    item.onSelect?.();
    setOpen(false);
  };

  const popover =
    open && items.length > 0 && popoverPosition != null && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={popoverRef}
            role="menu"
            data-testid={`${testId}-popover`}
            className={`min-w-44 w-max max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl py-1 pointer-events-auto ${UI_GLASS_PANEL_CLASS}`}
            style={{
              // `.ui-glass-panel` sets `position: relative` — inline fixed wins for viewport anchoring.
              position: 'fixed',
              top: popoverPosition.top,
              right: popoverPosition.right,
              zIndex: 'calc(var(--z-liquid-chrome) + 1)',
            }}
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                data-testid={`${testId}-item-${item.id}`}
                disabled={item.disabled}
                onClick={() => handleSelect(item)}
                className={`flex min-h-11 w-full touch-manipulation items-center px-4 text-left text-ui-fg transition-colors active:bg-ui-surface-hover/50 disabled:opacity-40 ${typographyClass.body}`}
              >
                {item.label}
              </button>
            ))}
          </div>,
          getPopoverPortalRoot()
        )
      : null;

  return (
    <>
      <GlassIconButton
        ref={anchorRef}
        onClick={toggleOpen}
        ariaLabel={ariaLabel}
        testId={testId}
        align="end"
        ariaExpanded={open}
        ariaHasPopup={items.length > 0 ? 'menu' : undefined}
      >
        <MoreHorizontal size={16} strokeWidth={2} aria-hidden />
      </GlassIconButton>
      {popover}
    </>
  );
}
