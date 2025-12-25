import React, { createContext, useContext, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

type Severity = 'error' | 'warning' | 'info' | 'success';

type NotifierContextValue = {
  notify: (message: string, severity?: Severity, autoHideMs?: number) => void;
};

const NotifierContext = createContext<NotifierContextValue | null>(null);

export const NotifierProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<Severity>('info');
  const [autoHideMs, setAutoHideMs] = useState<number | null>(4000);

  function notify(msg: string, sev: Severity = 'info', ms: number = 4000) {
    setMessage(msg);
    setSeverity(sev);
    setAutoHideMs(ms);
    setOpen(true);
  }

  // publish to window so non-React code can call notifier
  React.useEffect(() => {
    try {
      (window as any).__notify = notify;
      return () => { try { delete (window as any).__notify } catch (e) {} };
    } catch (e) {
      // ignore in non-browser environments
    }
  }, [notify]);

  return (
    <NotifierContext.Provider value={{ notify }}>
      {children}
      <Snackbar open={open} autoHideDuration={autoHideMs ?? 4000} onClose={()=>setOpen(false)} anchorOrigin={{vertical: 'top', horizontal: 'right'}}>
        <Alert onClose={()=>setOpen(false)} severity={severity} sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>
    </NotifierContext.Provider>
  );
};

export function useNotifier() {
  const ctx = useContext(NotifierContext);
  if (!ctx) throw new Error('useNotifier must be used within NotifierProvider');
  return ctx;
}

export default NotifierContext;

// expose a global notify function so non-React modules (e.g. API client) can show notifications
declare global {
  interface Window { __notify?: (msg: string, severity?: 'error'|'warning'|'info'|'success', ms?: number) => void }
}

// attach in a safe way when module is imported (fallback to noop)
if (typeof window !== 'undefined' && !window.__notify) {
  window.__notify = (msg: string, severity: 'error'|'warning'|'info'|'success' = 'info', ms: number = 4000) => {
    // noop until the NotifierProvider overwrites it during mount
    console.info('Notifier not ready:', msg);
  };
}
