import axios from 'axios';

// Cache to avoid excessive API calls
const geocodeCache = new Map();

/**
 * Reverse geocode coordinates to get location name
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */
export const reverseGeocode = async (lat, lng) => {
    // Use 3 decimal places for better precision (~111m accuracy)
    const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    
    console.log('[Geocode] Looking up coordinates:', lat.toFixed(4), lng.toFixed(4));

    // Check cache first
    if (geocodeCache.has(cacheKey)) {
        console.log('[Geocode] Returning cached result');
        return geocodeCache.get(cacheKey);
    }

    try {
        // Use zoom=14 for more precise city/town detection
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'SatelliteTracker3D/1.0 (Educational Project)'
            },
            timeout: 10000
        });

        const data = response.data;

        // Extract meaningful location name
        let locationName = 'Unknown Location';

        if (data.address) {
            const { city, town, village, suburb, county, state, country } = data.address;
            
            console.log('[Geocode] Address components:', data.address);

            // Build location string from available components - prefer more specific
            const place = city || town || suburb || village || county;

            if (place && country) {
                locationName = `${place}, ${country}`;
            } else if (place) {
                locationName = place;
            } else if (state && country) {
                locationName = `${state}, ${country}`;
            } else if (country) {
                locationName = country;
            }
        }

        // Cache the result
        geocodeCache.set(cacheKey, locationName);
        console.log('[Geocode] Resolved to:', locationName);

        return locationName;
    } catch (error) {
        console.error('Error reverse geocoding:', error);
        return 'My Location';
    }
};
