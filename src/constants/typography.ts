export const TYPOGRAPHY = Object.freeze({
  fontFamily: Object.freeze({
    sans: Object.freeze(['Inter', 'system-ui', 'sans-serif'] as const),
  }),
  fontSize: Object.freeze({
    xs: '7px',
    sm: '9px',
    md: '10px',
    base: '11px',
    body: '12px',
    sub: '13px',
    title: '15px',
    titleLg: '16px',
    heading: '18px',
    display: '20px',
  }),
  lineHeight: Object.freeze({
    xs: '1.2',
    sm: '1.4',
    md: '1.4',
    base: '1.5',
    body: '1.5',
    sub: '1.5',
    title: '1.3',
    titleLg: '1.3',
    heading: '1.2',
    display: '1.2',
  }),
  fontWeight: Object.freeze({
    regular: '400',
    medium: '500',
  }),
})
