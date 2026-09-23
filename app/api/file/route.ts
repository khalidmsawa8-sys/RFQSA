import { get } from '@vercel/blob';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Streams a blob (image, PDF, etc.) stored in Vercel Blob through this
 * Next.js server. The "pathname" search param can be either:
 *   - a plain pathname like "parts/file.jpg"
 *   - a full blob URL like "https://<store>.private.blob.vercel-storage.com/parts/file.jpg"
 *
 * Why proxy instead of redirecting?
 *  - We can force `Content-Disposition: attachment` for downloads.
 *  - We hide the blob token from the browser address bar.
 *  - We can run auth checks before serving private content.
 */

/**
 * Normalises the input to the shape `get()` expects: a pathname, with
 * URL-encoded segments decoded so the SDK can re-encode them itself.
 */
function extractPathname(input: string): string {
  try {
    // If a full blob URL was stored, strip the origin and leading slash.
    if (input.startsWith('http://') || input.startsWith('https://')) {
      const url = new URL(input);
      // url.pathname is "/parts/file.jpg" — strip the leading slash and decode.
      return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    }
    // Already a pathname — decode any URL-encoded characters.
    return decodeURIComponent(input.replace(/^\/+/, ''));
  } catch {
    return input.replace(/^\/+/, '');
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get('pathname');

    if (!raw) {
      return NextResponse.json({ error: 'Missing pathname' }, { status: 400 });
    }

    const pathname = extractPathname(raw);

    // Stream the blob via the SDK — works for both public and private stores
    // because the SDK uses BLOB_READ_WRITE_TOKEN under the hood.
    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    });

    if (!result) {
      return new NextResponse('Not found', { status: 404 });
    }

    // 304 Not Modified — let the browser keep using its cached copy
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          'Cache-Control': 'private, no-cache',
        },
      });
    }

    if (result.statusCode !== 200) {
      return new NextResponse('Not found', { status: 404 });
    }

    const filename = pathname.split('/').pop() || 'file';
    const forceDownload = searchParams.get('download') === '1';
    const disposition = forceDownload
      ? `attachment; filename="${encodeURIComponent(filename)}"`
      : `inline; filename="${encodeURIComponent(filename)}"`;

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType || 'application/octet-stream',
        'Content-Disposition': disposition,
        'X-Content-Type-Options': 'nosniff',
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    console.error('[api/file] error:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 },
    );
  }
}
