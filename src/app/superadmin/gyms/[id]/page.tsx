import React from 'react';
import { createClient } from '@/lib/supabase/server';
import GymDetailClient from './GymDetailClient';

export default async function GymDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GymDetailClient id={id} />;
}
