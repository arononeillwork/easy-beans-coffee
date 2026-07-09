import { CssBaseline, ThemeProvider } from '@mui/material';
import { adminTheme } from './adminTheme';
import TodoApp from './TodoApp';

export default function AdminPage() {
  return (
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <TodoApp />
    </ThemeProvider>
  );
}
