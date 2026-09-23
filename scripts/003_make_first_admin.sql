-- Make khalidmsawa8@gmail.com the admin
UPDATE public.profiles
SET is_admin = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'khalidmsawa8@gmail.com' LIMIT 1
);
