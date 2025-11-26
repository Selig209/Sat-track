import React, { useState, useEffect } from 'react';
import SkyViewer from './components/SkyViewer';
import Dashboard from './components/Dashboard';
import { LOCAL_TLES } from './data/tleData';
import { fetchTLEs } from './utils/tleFetcher';
import { fetchSatcatMetadata } from './utils/satcat';

function App() {
  const [selectedSat, setSelectedSat] = useState(null);
  const [hoveredSat, setHoveredSat] = useState(null);
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

  useEffect(() => {
    const loadSatellites = async () => {
      console.log('[App] Loading satellites from CelesTrak...');

      try {
        const fetchedData = await fetchTLEs({ limit: 2000 });
        if (fetchedData && fetchedData.length > 50) {
          const enriched = withCatalogNumber(fetchedData);
          console.log('[App] Loaded ' + enriched.length + ' satellites from remote feed');
          setSatellites(enriched);
          return;
        }

        throw new Error('Remote feed returned too few satellites');
      } catch (err) {
        console.warn('[App] Remote fetch failed (' + err.message + '). Falling back to local snapshot.');
      }

      setSatellites(withCatalogNumber([...LOCAL_TLES]));
    };
    loadSatellites();
  }, []);

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
      />
    </div>
  );
}

export default App;
