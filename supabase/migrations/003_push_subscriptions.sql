-- Create push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    keys JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow authenticated users to insert their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Allow authenticated users to insert their own subscriptions"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (
    (auth.uid() IS NOT NULL)
);

DROP POLICY IF EXISTS "Allow users to view their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Allow users to view their own subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()) OR
    member_id IN (SELECT id FROM public.members WHERE auth_id = auth.uid())
);

DROP POLICY IF EXISTS "Allow users to delete their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Allow users to delete their own subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()) OR
    member_id IN (SELECT id FROM public.members WHERE auth_id = auth.uid())
);
