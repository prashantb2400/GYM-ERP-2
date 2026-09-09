import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id: memberId } = params;

    const supabase = await createClient();
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { descriptor, consentGiven } = body;

    if (!consentGiven) {
      return NextResponse.json({ error: 'Explicit DPDP consent is mandatory before enrolling face descriptor' }, { status: 400 });
    }

    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return NextResponse.json({ error: 'Invalid face descriptor: must be a 128-element float array' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    const { error: updateErr } = await supabaseAdmin
      .from('members')
      .update({
        face_enrolled: true,
        face_descriptor: descriptor,
        consent_given_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', memberId);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      message: 'Face descriptor enrolled successfully with verified consent',
      enrolled_at: nowIso,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Face enrollment failed:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id: memberId } = params;

    const supabase = await createClient();
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const nowIso = new Date().toISOString();

    // Right to erasure: permanently delete descriptor
    const { error: deleteErr } = await supabaseAdmin
      .from('members')
      .update({
        face_enrolled: false,
        face_descriptor: null,
        consent_given_at: null,
        updated_at: nowIso,
      })
      .eq('id', memberId);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({
      success: true,
      message: 'Face descriptor and biometric records permanently deleted',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Face descriptor deletion failed:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
