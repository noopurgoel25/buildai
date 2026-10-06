// Only a server-confirmed session may read/save records. Pending confirmation isn't logout.
export function sessionStatus(credentials, verified) {
  const isAuthenticated = Boolean(credentials.isAuthenticated && verified.isAuthenticated);
  return {
    isAuthenticated,
    isLoading: Boolean(credentials.isLoading || verified.isLoading ||
      (credentials.isAuthenticated && !verified.isAuthenticated)),
  };
}
