import { useState } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { adminTheme } from './adminTheme';
import PinGate from './components/PinGate';
import TodoApp from './TodoApp';

const UNLOCK_KEY = 'ebc:admin:unlocked';

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState<boolean>(readUnlocked);

  const unlock = (): void => {
    try {
      sessionStorage.setItem(UNLOCK_KEY, '1');
    } catch {
      /* ignore */
    }
    setUnlocked(true);
  };

  const lock = (): void => {
    try {
      sessionStorage.removeItem(UNLOCK_KEY);
    } catch {
      /* ignore */
    }
    setUnlocked(false);
  };

  return (
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      {unlocked ? <TodoApp onLock={lock} /> : <PinGate onUnlock={unlock} />}
    </ThemeProvider>
  );
}

function readUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}
