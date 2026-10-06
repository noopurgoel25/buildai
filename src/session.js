import { createElement, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexReactClient, useConvexAuth } from 'convex/react';
import { ConvexAuthProvider, useAuthActions } from '@convex-dev/auth/react';
import { api } from '../convex/_generated/api.js';

export function startSession(onChange) {
  const client = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
  const host = document.createElement('div');
  host.hidden = true;
  document.body.append(host);
  function SessionBridge() {
    const { isLoading, isAuthenticated } = useConvexAuth();
    const { signIn, signOut } = useAuthActions();
    useEffect(() => {
      onChange({ isLoading, isAuthenticated, signIn, signOut,
        getRecord: () => client.query(api.records.firstRecord, {}),
        saveRecord: data => client.mutation(data.event.observations ? api.records.saveCapture : api.records.saveFirstRecord, data),
      });
    }, [isLoading, isAuthenticated, signIn, signOut]);
    return null;
  }
  createRoot(host).render(createElement(ConvexAuthProvider, { client, shouldHandleCode: false }, createElement(SessionBridge)));
}
