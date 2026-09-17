export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionCode: string } }
) {
  const db = supabaseAdmin();
  const { sessionCode } = params;
  const { partnerId, rating } = await req.json();

  if (!partnerId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { data: session } = await db
    .from('sessions')
    .select('id, partner_a_id, partner_b_id')
    .eq('session_code', sessionCode)
    .single();

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isValid = session.partner_a_id === partnerId || session.partner_b_id === partnerId;
  if (!isValid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await db
    .from('matches')
    .update({ rating })
    .eq('session_id', session.id);

  if (error) return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 });

  return NextResponse.json({ success: true });
}
