import { NextResponse } from 'next/server';
import { extractKycDocumentData } from '@/lib/server/llm';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`kiosk-ocr:${ip}`, 30, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many card scan attempts. Please wait a moment.' },
        { status: 429 }
      );
    }

    const { imageBase64, docType, gymId } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 });
    }

    // Process document image securely on server with LLM Vision
    const extracted = await extractKycDocumentData(imageBase64, docType);

    // Optional: store document snapshot in storage if gymId is provided
    let documentUrl: string | null = null;
    if (gymId && extracted.success) {
      try {
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        const fileName = `${gymId}/kyc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;

        const { data: uploadData } = await supabaseAdmin.storage
          .from('kyc-documents')
          .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadData?.path) {
          const { data: publicUrlData } = supabaseAdmin.storage
            .from('kyc-documents')
            .getPublicUrl(uploadData.path);
          documentUrl = publicUrlData?.publicUrl || null;
        }
      } catch (storageErr) {
        // Non-blocking: storage failure doesn't halt user registration
        console.warn('KYC storage upload warning:', storageErr);
      }
    }

    return NextResponse.json({
      ...extracted,
      documentUrl,
    });
  } catch (err: any) {
    console.error('Kiosk OCR error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process identification document' },
      { status: 500 }
    );
  }
}
