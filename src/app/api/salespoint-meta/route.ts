import { NextRequest, NextResponse } from 'next/server';

// Basit meta başlık çözücü: Harita linklerinden <title> yakalamaya çalışır
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    if (!url) {
      return NextResponse.json({ error: 'url parametresi gerekli' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { signal: controller.signal, headers: { 'user-agent': 'Mozilla/5.0' } });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ name: new URL(url).hostname });
    }

    const html = await res.text();
    // <title>Title - Google Maps</title>
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let name = titleMatch?.[1] || '';
    name = name.replace(/-\s*Google\s*Maps/i, '').trim();
    if (!name) {
      // og:title dene
      const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i);
      name = ogMatch?.[1] || '';
    }
    if (!name) name = new URL(url).hostname;

    return NextResponse.json({ name });
  } catch (err) {
    try {
      const { searchParams } = new URL(request.url);
      const url = searchParams.get('url') || '';
      return NextResponse.json({ name: url ? new URL(url).hostname : 'Bağlantı' });
    } catch {
      return NextResponse.json({ name: 'Bağlantı' });
    }
  }
}


