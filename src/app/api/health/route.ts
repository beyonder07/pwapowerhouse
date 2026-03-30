import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'powerhouse-next-monolith',
    supabaseConfigured: isSupabaseConfigured()
  });
}
