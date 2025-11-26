import axios from 'axios';

// Sample TLE data as fallback if API fails
const SAMPLE_TLES = `ISS (ZARYA)
1 25544U 98067A   24325.50000000  .00012345  00000-0  12345-3 0  9992
2 25544  51.6400 123.4567 0001234  12.3456  78.9012 15.54012345123456
STARLINK-1007
1 44713U 19074A   24325.50000000  .00001234  00000-0  12345-4 0  9997
2 44713  53.0000 234.5678 0001234 123.4567 236.5432 15.06123456789012
NOAA 19
1 33591U 09005A   24325.50000000  .00000123  00000-0  12345-4 0  9998
2 33591  99.1000 345.6789 0012345 234.5678 125.4321 14.12345678901234
GPS BIIR-2  (PRN 13)
1 24876U 97035A   24325.50000000 -.00000012  00000-0  00000-0 0  9999
2 24876  55.5000  56.7890 0123456 123.4567 236.5432  2.00561234567890`;

const CELESTRAK_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle';
const PROXY_URL = 'https://corsproxy.io/?';
const DEFAULT_LIMIT = 2000; // Balance between coverage and performance

const extractCatalogNumber = (line1) => {
    if (!line1 || line1.length < 7) return null;
    const raw = line1.slice(2, 7).trim();
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) ? null : parsed;
};

const parseTleLines = (lines, limit) => {
    const satellites = [];
    const uniqueNames = new Set();
    const sanitizedLimit = typeof limit === 'number' && limit > 0 ? limit : undefined;

    for (let i = 0; i < lines.length; i += 3) {
        const name = lines[i]?.trim();
        const line1 = lines[i + 1]?.trim();
        const line2 = lines[i + 2]?.trim();

        if (name && line1 && line2 && line1.startsWith('1 ') && line2.startsWith('2 ')) {
            if (uniqueNames.has(name)) {
                continue;
            }

            uniqueNames.add(name);
            satellites.push({
                name,
                line1,
                line2,
                id: satellites.length,
                catalogNumber: extractCatalogNumber(line1)
            });

            if (sanitizedLimit && satellites.length >= sanitizedLimit) {
                break;
            }
        }
    }

    return satellites;
};

export const fetchTLEs = async (options = {}) => {
    const { limit = DEFAULT_LIMIT } = options;

    try {
        console.log('[TLEFetcher] Fetching TLEs from CelesTrak via corsproxy.io...');
        const response = await axios.get(PROXY_URL + encodeURIComponent(CELESTRAK_URL), {
            timeout: 10000
        });
        console.log('[TLEFetcher] Response received, parsing TLE data...');
        const lines = response.data.split(/\r?\n/);
        const satellites = parseTleLines(lines, limit);

        if (satellites.length === 0) {
            throw new Error('No satellites parsed from response');
        }

        console.log(`[TLEFetcher] Parsed ${satellites.length} satellites from remote feed`);
        return satellites;
    } catch (error) {
        console.error('[TLEFetcher] Error fetching TLEs from CelesTrak:', error.message);
        console.log('[TLEFetcher] Using bundled sample data as fallback.');

        const lines = SAMPLE_TLES.split(/\r?\n/);
        const satellites = parseTleLines(lines, limit);

        console.log(`[TLEFetcher] Loaded ${satellites.length} sample satellites (ISS, Starlink, NOAA, GPS)`);
        return satellites;
    }
};
