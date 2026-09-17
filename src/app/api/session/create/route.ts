export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateSessionCode } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

export async function POST(_req: NextRequest) {
  const db = supabaseAdmin();
  const partnerAId = uuidv4();

  let sessionCode = '';
  let attempts = 0;
  let created = false;

  // Retry on collision (extremely rare)
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
    attempts++;
  }

  if (!created) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }

  return NextResponse.json({ sessionCode, partnerId: partnerAId });
}
