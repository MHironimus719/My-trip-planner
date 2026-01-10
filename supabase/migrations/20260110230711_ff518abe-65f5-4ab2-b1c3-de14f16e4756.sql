-- Make company-logos bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'company-logos';

-- Drop the old public SELECT policy
DROP POLICY IF EXISTS "Company logos are publicly accessible" ON storage.objects;

-- Create new policy allowing only authenticated users to view their own logos
CREATE POLICY "Users can view their own logos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Update has_role function with strict validation
-- Only allow checking own role OR if caller is admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow checking own role or if caller is admin
  IF _user_id != auth.uid() THEN
    -- Check if caller is admin (avoid recursion by direct query)
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;