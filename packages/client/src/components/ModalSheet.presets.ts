import type { ModalSheetSize } from './Shared';

/** Built-in horizontal + bottom inset padding per `size`. Canon — do not duplicate on consumers. */
export const modalSheetContentPaddingBySize: Record<ModalSheetSize, string> = {
  compact: 'px-5 pt-0 pb-modal-bottom text-center',
  default: 'px-5 pt-0 pb-modal-bottom',
  tall: 'px-5 pt-0 pb-modal-bottom',
};

/** Default panel width when `maxWidth` prop is omitted. */
export const modalSheetDefaultMaxWidthBySize: Record<ModalSheetSize, 'sm' | 'md' | 'lg'> = {
  compact: 'sm',
  default: 'md',
  tall: 'md',
};

export function resolveModalSheetMaxWidth(
  size: ModalSheetSize,
  maxWidth: 'sm' | 'md' | 'lg' | undefined
): 'sm' | 'md' | 'lg' {
  return maxWidth ?? modalSheetDefaultMaxWidthBySize[size];
}

export function modalSheetContentPadding(size: ModalSheetSize): string {
  return modalSheetContentPaddingBySize[size];
}
