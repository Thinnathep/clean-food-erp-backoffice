import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'

// Suppress non-app browser extension / performance observer noise (e.g. web-vitals reportAllChanges startTime)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg.includes("reading 'startTime'") ||
      msg.includes('reportAllChanges')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason || '');
    if (
      reason.includes("reading 'startTime'") ||
      reason.includes('reportAllChanges')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
