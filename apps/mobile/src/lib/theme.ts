/**
 * LandConnect design tokens.
 *
 * A calm, photography-led land marketplace: warm ivory ground, white surfaces,
 * one deep forest green brand thread, sage hairlines, charcoal text. Photography
 * is the only saturated colour on a feed card.
 */
export const colors = {
  primary: '#14532D',
  primaryDark: '#0B2E1F',
  primarySoft: '#E7F0E9',
  primaryMuted: '#2F6B4F',
  accent: '#2F6B4F',
  accentDark: '#24543E',
  teal: '#2F6B4F',

  background: '#F7F5F0',
  surface: '#FFFFFF',
  surfaceAlt: '#F2EFE8',
  surfaceMuted: '#EFEAE0',
  scrim: 'rgba(10, 20, 14, 0.55)',
  overlay: 'rgba(12, 24, 18, 0.5)',

  text: '#1C2420',
  textMuted: '#5F6B63',
  textFaint: '#8B948D',

  border: '#E3DED2',
  borderStrong: '#D3CCBC',

  danger: '#B3261E',
  dangerSoft: '#FBE9E7',
  warning: '#8A5A00',
  warningSoft: '#FFF3D6',
  success: '#1F6E43',
  successSoft: '#E4F2E8',

  white: '#FFFFFF',
  onPrimary: '#FFFFFF',

  bubbleIn: '#FFFFFF',
  bubbleOut: '#DCEFD8',
  chatBackground: '#F4F1E9',
  tickRead: '#2F80ED',
  tickMuted: '#8B948D',

  imageFallback: '#D9E6DA',
  imageFallbackDeep: '#B5CBB8',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

/** Material-flavoured type roles. One family; hierarchy from size and weight. */
export const type = {
  display: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700' as const,
    letterSpacing: -0.7,
  },
  h1: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.25,
  },
  title: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400' as const,
  },
  bodyStrong: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  micro: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
} as const;

export const shadow = {
  floating: {
    shadowColor: '#1C2420',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
} as const;
