-- Create a secure table for Google OAuth tokens (service-role access only)
CREATE TABLE public.user_google_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but with NO client-side policies (service-role only access)
ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;

-- NO RLS policies = only service role can access this table
-- This ensures tokens are never exposed to the client

-- Migrate existing tokens from profiles to the new secure table
INSERT INTO public.user_google_tokens (user_id, google_access_token, google_refresh_token, google_token_expires_at)
SELECT id, google_access_token, google_refresh_token, google_token_expires_at
FROM public.profiles
WHERE google_access_token IS NOT NULL OR google_refresh_token IS NOT NULL;

-- Remove token columns from profiles table
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS google_access_token,
  DROP COLUMN IF EXISTS google_refresh_token,
  DROP COLUMN IF EXISTS google_token_expires_at;

-- Add trigger for updated_at
CREATE TRIGGER update_user_google_tokens_updated_at
  BEFORE UPDATE ON public.user_google_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();