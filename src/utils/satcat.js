import axios from 'axios';

// CelesTrak provides satellite catalog data
// Try the GP (General Perturbations) API which returns JSON with metadata
const SATCAT_CSV_URL = 'https://celestrak.org/pub/satcat.csv';
const GP_API_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json';
const PROXY_URL = 'https://corsproxy.io/?';

let cachedMap = null;

// Parse SATCAT CSV data
const parseSatcatCSV = (csvText) => {
    const lines = csvText.split('\n');
    const map = new Map();
    
    // CSV header line contains field names
    // Typical fields: OBJECT_NAME,OBJECT_ID,NORAD_CAT_ID,OBJECT_TYPE,OPS_STATUS_CODE,OWNER,LAUNCH_DATE,LAUNCH_SITE,DECAY_DATE,PERIOD,INCLINATION,APOGEE,PERIGEE,RCS,DATA_STATUS_CODE,ORBIT_CENTER,ORBIT_TYPE
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        // Parse CSV (handle quoted fields)
        const fields = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!fields || fields.length < 13) continue;
        
        const clean = (s) => s ? s.replace(/^"|"$/g, '').trim() : '';
        
        const noradId = parseInt(clean(fields[2]), 10);
        if (Number.isNaN(noradId)) continue;
        
        map.set(noradId, {
            OBJECT_NAME: clean(fields[0]),
            OBJECT_ID: clean(fields[1]),
            NORAD_CAT_ID: noradId,
            OBJECT_TYPE: clean(fields[3]),
            OPS_STATUS: clean(fields[4]),
            OWNER: clean(fields[5]),
            LAUNCH_DATE: clean(fields[6]),
            LAUNCH_SITE: clean(fields[7]),
            DECAY_DATE: clean(fields[8]),
            PERIOD: clean(fields[9]),
            INCLINATION: clean(fields[10]),
            APOGEE: clean(fields[11]),
            PERIGEE: clean(fields[12]),
            RCS_SIZE: fields[13] ? clean(fields[13]) : ''
        });
    }
    
    return map;
};

export const fetchSatcatMetadata = async () => {
    if (cachedMap) {
        console.log('[SATCAT] Returning cached metadata map with ' + cachedMap.size + ' entries');
        return cachedMap;
    }

    // First try the GP API (gives us orbital data in JSON)
    try {
        console.log('[SATCAT] Fetching satellite data from GP API...');
        const response = await axios.get(PROXY_URL + encodeURIComponent(GP_API_URL), {
            timeout: 30000
        });

        const entries = Array.isArray(response.data) ? response.data : [];
        console.log('[SATCAT] GP API returned ' + entries.length + ' entries');
        
        if (entries.length > 0) {
            console.log('[SATCAT] Sample GP entry fields:', Object.keys(entries[0]));
            
            const map = new Map();
            entries.forEach((entry) => {
                const id = parseInt(entry.NORAD_CAT_ID, 10);
                if (!Number.isNaN(id)) {
                    map.set(id, {
                        NORAD_CAT_ID: id,
                        OBJECT_NAME: entry.OBJECT_NAME,
                        OBJECT_ID: entry.OBJECT_ID,
                        OBJECT_TYPE: entry.OBJECT_TYPE || 'PAYLOAD',
                        COUNTRY_CODE: entry.COUNTRY_CODE,
                        LAUNCH_DATE: entry.LAUNCH_DATE,
                        PERIOD: entry.PERIOD,
                        INCLINATION: entry.INCLINATION,
                        APOGEE: entry.APOAPSIS,
                        PERIGEE: entry.PERIAPSIS,
                        RCS_SIZE: entry.RCS_SIZE,
                        EPOCH: entry.EPOCH,
                        MEAN_MOTION: entry.MEAN_MOTION,
                        ECCENTRICITY: entry.ECCENTRICITY,
                        CLASSIFICATION_TYPE: entry.CLASSIFICATION_TYPE
                    });
                }
            });
            
            cachedMap = map;
            console.log('[SATCAT] Built metadata map with ' + map.size + ' satellites from GP API');
            return map;
        }
    } catch (error) {
        console.warn('[SATCAT] GP API fetch failed:', error.message);
    }

    // Fallback: try CSV
    try {
        console.log('[SATCAT] Trying CSV fallback...');
        const response = await axios.get(PROXY_URL + encodeURIComponent(SATCAT_CSV_URL), {
            timeout: 30000,
            responseType: 'text'
        });
        
        const map = parseSatcatCSV(response.data);
        cachedMap = map;
        console.log('[SATCAT] Built metadata map with ' + map.size + ' satellites from CSV');
        return map;
    } catch (error) {
        console.warn('[SATCAT] CSV fetch also failed:', error.message);
    }

    // Return empty map if all fails
    cachedMap = new Map();
    return cachedMap;
};
