import localFont from 'next/font/local';

/**
 * Self-hosted per 03 §5 — Libertinus Serif, Libertinus Sans, Fira Code, all
 * OFL, one weight each per the system's no-weight-axis rule. Fira Code ships
 * as a variable font; the weight axis is pinned to 500 via variationSettings
 * so only that instance is ever used.
 */
export const libertinusSerif = localFont({
  src: '../app/fonts/LibertinusSerif-Regular.ttf',
  variable: '--font-libertinus-serif',
  weight: '400',
  display: 'swap',
});

export const libertinusSans = localFont({
  src: '../app/fonts/LibertinusSans-Regular.ttf',
  variable: '--font-libertinus-sans',
  weight: '400',
  display: 'swap',
});

export const firaCode = localFont({
  src: '../app/fonts/FiraCode-Medium.ttf',
  variable: '--font-fira-code',
  weight: '500',
  display: 'swap',
});
