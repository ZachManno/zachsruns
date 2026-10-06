export type Theme = 'dark' | 'light';

// Read by both the client provider and the pre-paint script in the server-rendered layout,
// so it can't live in a 'use client' module.
export const THEME_STORAGE_KEY = 'zr-theme';
