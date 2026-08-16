import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { ClientLayout } from './ClientLayout';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <ClientLayout adminEmail={session?.user?.email || null}>
      {children}
    </ClientLayout>
  );
}
