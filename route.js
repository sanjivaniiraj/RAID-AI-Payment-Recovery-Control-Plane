import { NextResponse } from 'next/server';
import { dbConfigured } from '../../../lib/supabase';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'RAID backend',
    razorpay: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    webhook: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
    database: dbConfigured(),
    ai: Boolean(process.env.OPENAI_API_KEY)
  });
}
