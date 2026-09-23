import { put } from '@vercel/blob';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload to private blob storage
    const blob = await put(`parts/${Date.now()}-${file.name}`, file, {
      access: 'private',
    });

    // Return the full blob URL for storage in DB — needed for get() in /api/file
    return NextResponse.json({ pathname: blob.url, url: blob.url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
