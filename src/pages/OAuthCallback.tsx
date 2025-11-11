import { useEffect } from 'react';

export default function OAuthCallback() {
  useEffect(() => {
    // Extract the authorization code from URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      console.error('OAuth error:', error);
      if (window.opener) {
        window.opener.postMessage({ type: 'google-oauth-error', error }, '*');
      }
      window.close();
      return;
    }

    if (code && window.opener) {
      // Send the code back to the parent window
      window.opener.postMessage({ type: 'google-oauth-success', code }, '*');
      window.close();
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Completing authorization...</p>
      </div>
    </div>
  );
}