import { createElement, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexReactClient, useConvexAuth } from 'convex/react';
import { ConvexAuthProvider, useAuthActions, useConvexAuth as useCredentials } from '@convex-dev/auth/react';
import { api } from '../convex/_generated/api.js';
import { sessionStatus } from './session-state.js';
import { analyticsReady } from './analytics.js';

export function startSession(onChange) {
  const client = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
  const host = document.createElement('div');
  host.hidden = true;
  document.body.append(host);
  function SessionBridge() {
    const verified = useConvexAuth();
    const credentials = useCredentials();
    const { isLoading, isAuthenticated } = sessionStatus(credentials, verified);
    const { signIn, signOut } = useAuthActions();
    useEffect(() => {
      onChange({ isLoading, isAuthenticated, signIn, signOut,
        getRecord: () => client.query(api.records.firstRecord, {}),
        getTimeline: paginationOpts => client.query(api.records.timelinePage, { paginationOpts }),
        saveRecord: async data => {await analyticsReady();return client.mutation(data.event.observations ? api.records.saveCapture : api.records.saveFirstRecord, data);},
        saveUpdate: async data => {await analyticsReady();return client.mutation(api.records.addUpdate, data);},
        matchingPatient: patient => client.query(api.records.matchingPatient, { patient }),
        saveMatchedUpdate: async data => {await analyticsReady();return client.mutation(api.records.saveMatchedUpdate, data);},
        generateSummary: data => client.action(api.doctorBriefs.generate, data),
        prepareSummaryShare: data => client.action(api.summarySharing.prepare, data),
        correctUpdate: data => client.mutation(api.records.correctUpdate, data),
        getAccountState: () => client.query(api.accountDeletion.status, {}),
        getAnalyticsPreference: () => client.query(api.analytics.preference, {}),
        setAnalyticsPreference: data => client.mutation(api.analytics.setPreference, data),
        trackAnalytics: data => client.mutation(api.analytics.track, data),
        requestDeletionCode: () => client.action(api.accountDeletion.requestCode, {}),
        deleteAccount: data => client.action(api.accountDeletion.confirm, data),
        deleteUpdate: data => client.mutation(api.records.deleteUpdate, data),
      });
    }, [isLoading, isAuthenticated, signIn, signOut]);
    return null;
  }
  createRoot(host).render(createElement(ConvexAuthProvider, { client, shouldHandleCode: false }, createElement(SessionBridge)));
}
