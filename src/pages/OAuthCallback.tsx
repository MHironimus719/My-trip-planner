import { useEffect } from 'react';

// Define allowed origins for secure postMessage communication
const ALLOWED_ORIGINS = [
  'https://mytripplanner.net',
  'https://www.mytripplanner.net',
  // Lovable preview URLs
  'https://id.lovable.app',
  'https://id-lovable.app',
];

// Add current origin if valid
const currentOrigin = window.location.origin;
if (currentOrigin && !ALLOWED_ORIGINS.includes(currentOrigin)) {
  // Include localhost for development
  if (currentOrigin.startsWith('http://localhost:') || 
      currentOrigin.includes('.lovable.app') ||
      currentOrigin.includes('-lovable.app')) {
    ALLOWED_ORIGINS.push(currentOrigin);
  }
}

export default function OAuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const state = params.get('state');

    if (!window.opener) {
      console.error('OAuth callback: No opener window found');
      return;
    }

    // Determine target origin - use current origin as the opener should be from same domain
    const targetOrigin = currentOrigin;

    // Validate that we're sending to a trusted origin
    const isAllowedOrigin = ALLOWED_ORIGINS.some(origin => 
      targetOrigin === origin || 
      targetOrigin.includes('.lovable.app') ||
      targetOrigin.includes('-lovable.app') ||
      targetOrigin.startsWith('http://localhost:')
    );

    if (!isAllowedOrigin) {
      console.error('OAuth callback: Untrusted origin, not sending message:', targetOrigin);
      window.close();
      return;
    }

    if (error) {
      console.error('OAuth error:', error);
      window.opener.postMessage(
        { type: 'google-oauth-error', error },
        targetOrigin // Use specific origin instead of wildcard
      );
      window.close();
      return;
    }

    if (code) {
      // Send the code back to the parent window with specific origin
      window.opener.postMessage(
        { type: 'google-oauth-success', code, state },
        targetOrigin // Use specific origin instead of wildcard
      );
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