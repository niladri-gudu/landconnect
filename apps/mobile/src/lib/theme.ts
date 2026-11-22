/**
 * WhatsApp-inspired palette for LandConnect.
 * Deep green header, chat-style surfaces, lime accent for primary actions.
 */
export const colors = {
  primary: '#075E54',
  primaryDark: '#054D44',
  teal: '#128C7E',
  accent: '#25D366',
  accentDark: '#1EBE5A',
  background: '#ECE5DD',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F8FA',
  bubbleIn: '#FFFFFF',
  bubbleOut: '#DCF8C6',
  text: '#111B21',
  textMuted: '#667781',
  border: '#E4E9EB',
  danger: '#D93025',
  warning: '#F4B400',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
} as const;
