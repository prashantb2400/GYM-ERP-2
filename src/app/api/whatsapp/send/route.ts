import { NextResponse } from 'next/server';
import { waClient } from '@/lib/whatsapp/client';
import { TemplateParam } from '@/lib/whatsapp/types';
import { requireGymStaff } from '@/lib/server/requireGymStaff';
import { checkRateLimit, getClientIdentifier, rateLimitHeaders } from '@/lib/server/rateLimit';

export async function POST(request: Request) {
  try {
    const staff = await requireGymStaff();
    if (staff instanceof Response) return staff;

    // Rate limiting: max 30 WhatsApp dispatches per minute per gym
    const clientId = staff.gymId || getClientIdentifier(request);
    const rateLimit = checkRateLimit(`wa_send:${clientId}`, 30, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before sending more WhatsApp messages.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }
    
    const body = await request.json();
    const { to, type, text, templateName, params, memberId, documentParams } = body;

    if (!to || !type) {
      return NextResponse.json({ error: 'Missing "to" or "type" in payload' }, { status: 400 });
    }

    let response;

    if (type === 'text') {
      if (!text) {
        return NextResponse.json({ error: 'Missing text content' }, { status: 400 });
      }
      response = await waClient.sendText(to, text, staff.gymId, memberId);
    } 
    else if (type === 'template') {
      if (!templateName || !params) {
        return NextResponse.json({ error: 'Missing templateName or params' }, { status: 400 });
      }
      response = await waClient.sendTemplate(to, templateName, params as TemplateParam[], staff.gymId, memberId);
    }
    else if (type === 'document') {
      // documentParams: { base64: string, filename: string, caption: string }
      if (!documentParams || !documentParams.base64) {
        return NextResponse.json({ error: 'Missing documentParams' }, { status: 400 });
      }
      const buffer = Buffer.from(documentParams.base64, 'base64');
      response = await waClient.sendDocument(to, buffer, documentParams.filename, documentParams.caption, staff.gymId, memberId);
    }
    else {
      return NextResponse.json({ error: 'Invalid message type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: response });
  } catch (error: any) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
