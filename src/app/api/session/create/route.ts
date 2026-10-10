export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateSessionCode } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

export async function POST(_req: NextRequest) {
  let db;
  try {
    db = supabaseAdmin();
  } catch (e) {
    console.error('Supabase config error:', e);
    return NextResponse.json({ error: 'Server misconfiguration — database not available.' }, { status: 503 });
  }
  const partnerAId = uuidv4();

  let sessionCode = '';
  let attempts = 0;
  let created = false;

  // Retry on collision (extremely rare)
  let lastError: { message?: string; code?: string; details?: string; hint?: string } | null = null;

  while (attempts < 5) {
    const code = generateSessionCode();
    const { error } = await db.from('sessions').insert({
      session_code: code,
      partner_a_id: partnerAId,
      status: 'waiting',
      round: 1,
    });
    if (!error) {
      sessionCode = code;
      created = true;
      break;
    }
    lastError = { message: error.message, code: error.code, details: error.details, hint: error.hint };
    console.error('Supabase INSERT error (attempt', attempts + 1, '):', lastError);
    attempts++;
  }

  if (!created) {
    return NextResponse.json({
      error: 'Failed to create session',
      supabaseError: lastError?.message,
      supabaseCode: lastError?.code,
      supabaseDetails: lastError?.details,
      supabaseHint: lastError?.hint,
    }, { status: 500 });
  }

  return NextResponse.json({ sessionCode, partnerId: partnerAId });
}
