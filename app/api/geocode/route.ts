import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, query } = body;

    // FORWARD GEOCODING / URL & COORD PARSER (Search by text query, coords, or Google Maps URL)
    if (query) {
      const trimmed = query.trim();

      // Check if query is coordinates format (e.g. "24.7136, 46.6753" or "24.7136 46.6753")
      const coordsRegex = /^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/;
      const coordsMatch = trimmed.match(coordsRegex);

      // Check if query is Google Maps URL (e.g. "?q=24.7136,46.6753" or "@24.7136,46.6753")
      const urlCoordsRegex = /(?:q=|@)(-?\d+\.\d+),(-?\d+\.\d+)/;
      const urlMatch = trimmed.match(urlCoordsRegex);

      const parsedLat = coordsMatch ? parseFloat(coordsMatch[1]) : urlMatch ? parseFloat(urlMatch[1]) : null;
      const parsedLng = coordsMatch ? parseFloat(coordsMatch[3]) : urlMatch ? parseFloat(urlMatch[2]) : null;

      if (parsedLat !== null && parsedLng !== null && !isNaN(parsedLat) && !isNaN(parsedLng)) {
        // Reverse geocode directly for coordinates
        try {
          const reverseRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${parsedLat}&lon=${parsedLng}&language=ar&zoom=18&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'RFQPlatform/1.0 (admin@rfqsa.tech)',
              },
            }
          );
          if (reverseRes.ok) {
            const data = await reverseRes.json();
            const addr = data.address || {};
            const street = addr.road || addr.street || '';
            const district = addr.suburb || addr.village || addr.neighbourhood || '';
            const city = addr.city || addr.town || addr.county || 'الرياض';
            let formattedAddr = data.display_name;
            if (street || district) {
              formattedAddr = `${street ? street + ' – ' : ''}${district ? 'حي ' + district + '، ' : ''}${city}`;
            }
            return NextResponse.json({
              latitude: parsedLat,
              longitude: parsedLng,
              address: formattedAddr || `موقع محدد (${parsedLat.toFixed(4)}, ${parsedLng.toFixed(4)})`,
              street,
              district,
              city,
            });
          }
        } catch (e) {
          // fallback
          return NextResponse.json({
            latitude: parsedLat,
            longitude: parsedLng,
            address: `إحداثيات (${parsedLat.toFixed(5)}, ${parsedLng.toFixed(5)})`,
            city: 'الرياض',
          });
        }
      }

      const formattedQuery = query.includes('السعودية') ? query : `${query} السعودية`;
      
      const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        formattedQuery
      )}&countrycodes=sa&limit=1&accept-language=ar&addressdetails=1`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'RFQPlatform/1.0 (admin@rfqsa.tech)',
        },
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const item = data[0];
        const addr = item.address || {};
        return NextResponse.json({
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          address: item.display_name || query,
          street: addr.road || addr.street || '',
          district: addr.suburb || addr.village || '',
          city: addr.city || addr.town || addr.county || 'الرياض',
        });
      }

      // Try raw search fallback without country restriction
      const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=1&accept-language=ar`;
      
      const fallbackRes = await fetch(fallbackUrl, {
        headers: { 'User-Agent': 'RFQPlatform/1.0' },
      });
      const fallbackData = await fallbackRes.json();

      if (fallbackData && fallbackData.length > 0) {
        const item = fallbackData[0];
        return NextResponse.json({
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          address: item.display_name || query,
        });
      }

      return NextResponse.json(
        { error: 'لم يتم العثور على عنوان مطابق' },
        { status: 404 }
      );
    }

    // REVERSE GEOCODING (Lat / Lng -> Address)
    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Missing latitude or longitude' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&language=ar&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'RFQPlatform/1.0 (admin@rfqsa.tech)',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Nominatim request failed');
    }

    const data = await response.json();
    const address = data.address || {};

    const street = address.road || address.street || '';
    const district = address.suburb || address.village || '';
    const city = address.city || address.town || address.county || '';
    const fullAddress = data.display_name || `${latitude}, ${longitude}`;

    return NextResponse.json({
      address: fullAddress,
      street,
      district,
      city,
      latitude,
      longitude,
    });
  } catch (error) {
    console.error('[v0] Geocoding error:', error);
    return NextResponse.json(
      { error: 'Geocoding failed' },
      { status: 500 }
    );
  }
}
