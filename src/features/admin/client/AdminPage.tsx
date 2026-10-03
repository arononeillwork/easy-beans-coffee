import { CssBaseline, ThemeProvider } from '@mui/material';
import { adminTheme } from './adminTheme';
import TaskBoard from './TaskBoard';

export default function AdminPage() {
  return (
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <TaskBoard />
    </ThemeProvider>
  );
}
