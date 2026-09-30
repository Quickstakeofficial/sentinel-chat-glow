CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.access_status AS ENUM ('pending', 'approved');
CREATE TYPE public.message_role AS ENUM ('user', 'assistant', 'system');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  access_status public.access_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id AND access_status = 'pending');
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
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
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO service_role;

CREATE TABLE public.threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.threads TO authenticated;
GRANT ALL ON public.threads TO service_role;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view their own threads" ON public.threads FOR SELECT TO authenticated USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create their own threads" ON public.threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update their own threads" ON public.threads FOR UPDATE TO authenticated USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete their own threads" ON public.threads FOR DELETE TO authenticated USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.message_role NOT NULL,
  content TEXT NOT NULL,
  ai_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view messages in their own threads" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.threads WHERE threads.id = messages.thread_id AND threads.user_id = auth.uid()));
CREATE POLICY "Admins can create messages in their own threads" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.threads WHERE threads.id = messages.thread_id AND threads.user_id = auth.uid()));
CREATE POLICY "Admins can update messages in their own threads" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete messages in their own threads" ON public.messages FOR DELETE TO authenticated USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

CREATE INDEX threads_user_updated_idx ON public.threads(user_id, updated_at DESC);
CREATE INDEX messages_thread_created_idx ON public.messages(thread_id, created_at ASC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER threads_set_updated_at BEFORE UPDATE ON public.threads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER messages_set_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();