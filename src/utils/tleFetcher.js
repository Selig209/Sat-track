import axios from 'axios';

// CelesTrak API endpoints
const CELESTRAK_GP_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle';
const CELESTRAK_STATIONS_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle';

// Multiple CORS proxies for fallback
const CORS_PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/'
];

const DEFAULT_LIMIT = 2000;

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

    // Try each CORS proxy until one works
    for (let proxyIndex = 0; proxyIndex < CORS_PROXIES.length; proxyIndex++) {
        const proxy = CORS_PROXIES[proxyIndex];
        
        try {
            console.log(`[TLEFetcher] Attempt ${proxyIndex + 1}/${CORS_PROXIES.length} - Using proxy: ${proxy.substring(0, 30)}...`);
            
            const response = await axios.get(proxy + encodeURIComponent(CELESTRAK_GP_URL), {
                timeout: 15000,  // Increased timeout
                headers: {
                    'Accept': 'text/plain'
                }
            });
            
            // Check if we got valid data
            if (!response.data || typeof response.data !== 'string') {
                console.warn('[TLEFetcher] Invalid response data, trying next proxy...');
                continue;
            }
            
            console.log('[TLEFetcher] Response received, parsing TLE data...');
            const lines = response.data.split(/\r?\n/).filter(line => line.trim());
            const satellites = parseTleLines(lines, limit);

            // Need at least 100 satellites for it to be considered successful
            if (satellites.length < 100) {
                console.warn(`[TLEFetcher] Only got ${satellites.length} satellites, trying next proxy...`);
                continue;
            }

            console.log(`[TLEFetcher] Successfully parsed ${satellites.length} satellites`);
            return satellites;
            
        } catch (error) {
            console.warn(`[TLEFetcher] Proxy ${proxyIndex + 1} failed: ${error.message}`);
            // Continue to next proxy
        }
    }

    // All proxies failed - return empty and let App.jsx use local fallback
    console.error('[TLEFetcher] All CORS proxies failed');
    throw new Error('All CORS proxies failed to fetch TLE data');
};
