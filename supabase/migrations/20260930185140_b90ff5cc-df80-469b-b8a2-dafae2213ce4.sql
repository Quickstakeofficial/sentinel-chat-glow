CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
REVOKE ALL ON FUNCTION private.has_role(UUID, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(UUID, public.app_role) TO authenticated, service_role;

DROP POLICY "Admins can view their own threads" ON public.threads;
DROP POLICY "Admins can create their own threads" ON public.threads;
DROP POLICY "Admins can update their own threads" ON public.threads;
DROP POLICY "Admins can delete their own threads" ON public.threads;
CREATE POLICY "Admins can view their own threads" ON public.threads FOR SELECT TO authenticated USING (auth.uid() = user_id AND private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create their own threads" ON public.threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update their own threads" ON public.threads FOR UPDATE TO authenticated USING (auth.uid() = user_id AND private.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = user_id AND private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete their own threads" ON public.threads FOR DELETE TO authenticated USING (auth.uid() = user_id AND private.has_role(auth.uid(), 'admin'));

DROP POLICY "Admins can view messages in their own threads" ON public.messages;
DROP POLICY "Admins can create messages in their own threads" ON public.messages;
DROP POLICY "Admins can update messages in their own threads" ON public.messages;
DROP POLICY "Admins can delete messages in their own threads" ON public.messages;
CREATE POLICY "Admins can view messages in their own threads" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = user_id AND private.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.threads WHERE threads.id = messages.thread_id AND threads.user_id = auth.uid()));
CREATE POLICY "Admins can create messages in their own threads" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND private.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.threads WHERE threads.id = messages.thread_id AND threads.user_id = auth.uid()));
CREATE POLICY "Admins can update messages in their own threads" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = user_id AND private.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = user_id AND private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete messages in their own threads" ON public.messages FOR DELETE TO authenticated USING (auth.uid() = user_id AND private.has_role(auth.uid(), 'admin'));

REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.has_role(UUID, public.app_role);