// Runtime token values — mirrors tokens.js for components that need JS access.
// Design-only values live in src/app/theme/_tokens.scss; this file is for
// runtime logic (goalColor, etc.) that needs colour values as strings.

export const CATS: Record<string, { name: string; color: string }> = {
  ai:            { name: 'AI',            color: '#A8BEE8' },
  career:        { name: 'Career',        color: '#E8A8BA' },
  health:        { name: 'Health',        color: '#98C9AE' },
  relationships: { name: 'Relationships', color: '#EBC3A0' },
  reading:       { name: 'Reading',       color: '#BBA8E0' },
  creativity:    { name: 'Creativity',    color: '#DDB84E' },
  finance:       { name: 'Finance',       color: '#7FC8C4' },
};

export const PAPER = {
  bg:          '#F0F0F0',
  card:        '#FAFAFA',
  line:        '#E2E2E2',
  panel:       '#EBEBEB',
  ink:         '#2B2B2B',
  dim:         '#5F5F5F',
  faint:       '#9A9A9A',
  whisper:     '#A89070',
  track:       '#E2E2E2',
  trough:      'rgba(0,0,0,0.06)',
  miss:        '#EBEBEB',
  affirm:      '#DCEAE2',
  affirmLine:  '#C3DACD',
  affirmInk:   '#5F8672',
  scrim:       'rgba(0,0,0,0.12)',
  shadow:      '0 6px 20px rgba(0,0,0,0.08)',
  sheetShadow: '0 -10px 40px rgba(0,0,0,0.12)',
  cardBorder:  '#E2E2E2',
};

export const FONT = {
  serif: "'Fraunces', 'Fraunces Fallback', Georgia, serif",
  sans:  "'Instrument Sans', 'Instrument Sans Fallback', 'Inter', system-ui, sans-serif",
};

export const RADIUS = {
  r1:     '22px 18px 24px 19px',
  r2:     '18px 23px 17px 22px',
  screen: '28px',
  pill:   '999px',
  blob:   '67% 33% 52% 48% / 42% 58% 35% 65%',
};

export const STATE = {
  ACTIVE:    'active',
  DRIFT:     'drift',
  DORMANT:   'dormant',
  COMPLETED: 'completed',
  RETIRED:   'retired',
} as const;
