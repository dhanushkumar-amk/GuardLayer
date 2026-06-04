import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useThemeStore } from './store/theme.store';

export function App() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return <RouterProvider router={router} />;
}

export default App;
