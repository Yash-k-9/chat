// Light / dark mode. The class on <html> ("light" or "dark") switches every color
// (see index.css). The choice is remembered in this browser (localStorage).
// index.html applies the saved choice BEFORE React loads, so the page never flashes.
import { useCallback, useState } from 'react';

const STORAGE_KEY = 'appearance';
const THEME_COLORS = { light: '#f8fafc', dark: '#0b1120' }; // browser UI color on phones

export function getAppearance() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function setAppearance(mode) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(mode);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[mode]);
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage blocked (private mode): the choice lasts until the page reloads.
  }
}

// const [mode, toggle] = useAppearance()
export function useAppearance() {
  const [mode, setMode] = useState(getAppearance);
  const toggle = useCallback(() => {
    const next = getAppearance() === 'dark' ? 'light' : 'dark';
    setAppearance(next);
    setMode(next);
  }, []);
  return [mode, toggle];
}
