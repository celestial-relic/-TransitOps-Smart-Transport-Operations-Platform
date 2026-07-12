import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { generateInsights } from '@/lib/ai-insights';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const insights = await generateInsights();
    return NextResponse.json(insights);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
