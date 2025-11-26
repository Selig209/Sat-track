import React, { useState, useEffect, useCallback } from 'react';
import SkyViewer from './components/SkyViewer';
import Dashboard from './components/Dashboard';
import { LOCAL_TLES } from './data/tleData';
import { fetchTLEs } from './utils/tleFetcher';
import { fetchSatcatMetadata } from './utils/satcat';

function App() {
  const [selectedSat, setSelectedSat] = useState(null);
  const [hoveredSat, setHoveredSat] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [satellites, setSatellites] = useState([]);
  const [satMetadata, setSatMetadata] = useState({});
  const [highlightedSatellites, setHighlightedSatellites] = useState(null);

  // Escape key to deselect satellite and clear filters
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedSat) {
          setSelectedSat(null);
        }
        // Also clear any highlight filters
        setHighlightedSatellites(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSat]);

  const handleFilterVisible = (visibleList) => {
    // Instead of replacing satellites, we set highlighted ones
    setHighlightedSatellites(visibleList);
  };

  const withCatalogNumber = (list) => list.map((sat) => {
    if (sat.catalogNumber) return sat;
    const number = sat.line1 ? parseInt(sat.line1.slice(2, 7).trim(), 10) : null;
    return {
      ...sat,
      catalogNumber: Number.isNaN(number) ? null : number
    };
  });

  const loadSatellites = useCallback(async () => {
    setIsLoading(true);
    console.log('[App] Loading satellites from CelesTrak...');

    // Try up to 3 times with delays between attempts
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[App] Fetch attempt ${attempt}/3...`);
        const fetchedData = await fetchTLEs({ limit: 2000 });
        
        if (fetchedData && fetchedData.length >= 100) {
          const enriched = withCatalogNumber(fetchedData);
          console.log('[App] Successfully loaded ' + enriched.length + ' satellites');
          setSatellites(enriched);
          setIsLoading(false);
          return; // Success!
        }
        
        console.warn(`[App] Attempt ${attempt} returned only ${fetchedData?.length || 0} satellites`);
      } catch (err) {
        console.warn(`[App] Attempt ${attempt} failed: ${err.message}`);
      }
      
      // Wait before retry (1s, 2s, 3s)
      if (attempt < 3) {
        console.log(`[App] Waiting ${attempt}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }

    // All attempts failed - use local fallback
    console.warn('[App] All remote fetch attempts failed. Using local snapshot.');
    setSatellites(withCatalogNumber([...LOCAL_TLES]));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadSatellites();
  }, [loadSatellites]);

  useEffect(() => {
    if (!satellites || satellites.length === 0) {
      setSatMetadata({});
      return;
    }

    let isActive = true;
    const attachMetadata = async () => {
      try {
        const satcatMap = await fetchSatcatMetadata();
        console.log('[App] SATCAT map size:', satcatMap.size);
        
        const subset = {};
        let matchCount = 0;
        satellites.forEach((sat) => {
          if (!sat.catalogNumber) return;
          const record = satcatMap.get(sat.catalogNumber);
          if (record) {
            subset[sat.catalogNumber] = record;
            matchCount++;
          }
        });
        
        console.log('[App] Matched ' + matchCount + ' satellites with SATCAT metadata');
        if (matchCount > 0) {
          // Log sample matched entry
          const sampleKey = Object.keys(subset)[0];
          console.log('[App] Sample metadata entry:', subset[sampleKey]);
        }
        
        if (isActive) {
          setSatMetadata(subset);
        }
      } catch (error) {
        console.warn('[App] Metadata fetch failed (' + error.message + ')');
      }
    };

    attachMetadata();
    return () => {
      isActive = false;
    };
  }, [satellites]);

  return (
    <div className="App">
      <SkyViewer
        selectedSat={selectedSat}
        setSelectedSat={setSelectedSat}
        hoveredSat={hoveredSat}
        setHoveredSat={setHoveredSat}
        satellites={satellites}
        highlightedSatellites={highlightedSatellites}
      />
      <Dashboard
        selectedSat={selectedSat}
        setSelectedSat={setSelectedSat}
        satellites={satellites}
        satMetadata={satMetadata}
        onFilterVisible={handleFilterVisible}
        isLoading={isLoading}
        onRetryLoad={loadSatellites}
      />
    </div>
  );
}

export default App;
