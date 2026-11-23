/**
 * LandConnect design tokens.
 *
 * Mirrors the landconnect.si palette: near-black forest ink, deep green,
 * mint, pale mint ground, and a single amber accent. Photography stays the
 * only saturated colour on a feed card.
 */
export const colors = {
  primary: '#0F6E56',
  primaryDark: '#10201C',
  primarySoft: '#E8F1ED',
  primaryMuted: '#3E8F78',
  accent: '#EF9F27',
  accentDark: '#C9821B',
  teal: '#5DCAA5',
  mint: '#5DCAA5',
  amber: '#EF9F27',

  background: '#F5F8F7',
  surface: '#FFFFFF',
  surfaceAlt: '#E8F1ED',
  surfaceMuted: '#DCEAE4',
  scrim: 'rgba(16, 32, 28, 0.55)',
  overlay: 'rgba(16, 32, 28, 0.5)',

  text: '#10201C',
  textMuted: '#4B5C55',
  textFaint: '#9CA3AF',

  border: '#E5E7EB',
  borderStrong: '#D1D5DB',

  danger: '#B3261E',
  dangerSoft: '#FBE9E7',
  warning: '#8A5A00',
  warningSoft: '#FFF3D6',
  success: '#0F6E56',
  successSoft: '#E8F1ED',

  white: '#FFFFFF',
  onPrimary: '#FFFFFF',

  bubbleIn: '#FFFFFF',
  bubbleOut: '#D7F0E6',
  chatBackground: '#F1F7F4',
  tickRead: '#0F6E56',
  tickMuted: '#9CA3AF',

  imageFallback: '#D8E9E2',
  imageFallbackDeep: '#A9CFC0',
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
    shadowColor: '#10201C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
} as const;
