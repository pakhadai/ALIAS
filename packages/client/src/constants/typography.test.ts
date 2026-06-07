import { describe, it, expect } from 'vitest';
import {
  typographyClass,
  typographyTokens,
  labelSectionClass,
  labelSectionTitleClass,
  formLabelClass,
  systemBannerClass,
  systemStatusClass,
  brandCaptionClass,
  captionMutedClass,
} from './typography';

describe('typographyTokens', () => {
  it('should match TYPO-001 contract rem values', () => {
    expect(typographyTokens.heading).toBe('1.5rem');
    expect(typographyTokens.body).toBe('0.875rem');
    expect(typographyTokens.label).toBe('0.625rem');
    expect(typographyTokens.caption).toBe('0.625rem');
    expect(typographyTokens.system).toBe('0.75rem');
    expect(typographyTokens.headingLeading).toBe('1.25');
    expect(typographyTokens.bodyInput).toBe('1rem');
    expect(typographyTokens.bodyLeading).toBe('1.5');
    expect(typographyTokens.labelTracking).toBe('0.2em');
    expect(typographyTokens.captionTrackingWide).toBe('0.6em');
  });
});

describe('typographyClass', () => {
  it('should define all semantic roles', () => {
    expect(Object.keys(typographyClass).sort()).toEqual([
      'body',
      'bodyInput',
      'caption',
      'heading',
      'label',
      'system',
    ]);
  });

  it('should use text-ui-* size utilities for each role', () => {
    expect(typographyClass.heading).toContain('text-ui-heading');
    expect(typographyClass.body).toContain('text-ui-body');
    expect(typographyClass.bodyInput).toContain('text-ui-body-input');
    expect(typographyClass.label).toContain('text-ui-label');
    expect(typographyClass.caption).toContain('text-ui-caption');
    expect(typographyClass.system).toContain('text-ui-system');
  });

  it('should compose font family and leading per role', () => {
    expect(typographyClass.heading).toContain('font-serif');
    expect(typographyClass.heading).toContain('leading-ui-heading');
    expect(typographyClass.body).toContain('font-sans');
    expect(typographyClass.body).toContain('leading-ui-body');
    expect(typographyClass.label).toContain('tracking-ui-label');
    expect(typographyClass.label).toContain('uppercase');
    expect(typographyClass.caption).toContain('font-sans');
    expect(typographyClass.system).toContain('font-medium');
  });

  it('should match snapshot for stable class strings', () => {
    expect(typographyClass).toMatchInlineSnapshot(`
      {
        "body": "text-ui-body font-sans leading-ui-body",
        "bodyInput": "text-ui-body-input font-sans",
        "caption": "text-ui-caption font-sans",
        "heading": "text-ui-heading font-serif leading-ui-heading tracking-wide",
        "label": "text-ui-label font-sans font-bold uppercase tracking-ui-label",
        "system": "text-ui-system font-sans font-medium",
      }
    `);
  });
});

describe('caption helpers', () => {
  it('should compose brand and muted caption variants', () => {
    expect(brandCaptionClass).toContain(typographyClass.caption);
    expect(brandCaptionClass).toContain('uppercase');
    expect(brandCaptionClass).toContain('tracking-ui-caption-wide');
    expect(captionMutedClass).toContain(typographyClass.caption);
    expect(captionMutedClass).toContain('opacity-50');
    expect(captionMutedClass).toContain('leading-snug');
  });
});

describe('label helpers', () => {
  it('should compose label token with section/form variants', () => {
    expect(labelSectionClass).toContain(typographyClass.label);
    expect(labelSectionTitleClass).toContain(typographyClass.label);
    expect(formLabelClass).toContain(typographyClass.label);
    expect(labelSectionClass).toContain('opacity-40');
    expect(formLabelClass).toContain('block');
  });
});

describe('system helpers', () => {
  it('should compose system token for banners and inline status', () => {
    expect(systemBannerClass).toContain(typographyClass.system);
    expect(systemBannerClass).toContain('uppercase');
    expect(systemStatusClass).toContain(typographyClass.system);
    expect(systemStatusClass).toContain('leading-snug');
  });
});
