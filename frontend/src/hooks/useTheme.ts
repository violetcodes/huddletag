import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('huddletag-theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  const preferred: Theme = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
  document.documentElement.setAttribute('data-theme', preferred);
  return preferred;
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('huddletag-theme', theme);
    } catch {
      // localStorage unavailable
    }
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggle };
}
