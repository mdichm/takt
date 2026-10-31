// @takt/design-tokens — Design tokens TAKT
// Toute valeur visuelle provient d'ici ; 0 couleur en dur dans les composants

export const colors = {
  // Sémantiques
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  success: '#16a34a',
  warning: '#ca8a04',
  error: '#dc2626',
  surface: '#ffffff',
  surfaceInverse: '#0f172a',
  text: '#0f172a',
  textSecondary: '#64748b',
  border: '#e2e8f0',
} as const;

export const spacing = {
  xs: '0.5rem',
  sm: '0.75rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  xxl: '3rem',
} as const;

export const radius = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  full: '9999px',
} as const;

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'].join(','),
    mono: ['ui-monospace', 'SFMono-Regular', 'monospace'].join(','),
  },
  fontSize: {
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    xxl: '1.5rem',
  },
} as const;

export type TokenColor = keyof typeof colors;
export type TokenSpacing = keyof typeof spacing;
export type TokenRadius = keyof typeof radius;
