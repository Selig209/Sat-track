import React, { useState, useEffect } from 'react';
import { predictPass } from '../utils/passPredictor';
import { checkWeather } from '../utils/weather';
import { getInfo } from '../data/satelliteInfo';
import { reverseGeocode } from '../utils/reverseGeocode';
import * as satellite from 'satellite.js';

const Dashboard = ({ selectedSat, setSelectedSat, satellites, satMetadata = {}, onFilterVisible, isLoading, onRetryLoad }) => {
    const [passInfo, setPassInfo] = useState(null);
    const [weather, setWeather] = useState(null);
    const [userLocation, setUserLocation] = useState({ lat: 5.6037, lng: -0.1870, name: 'Detecting location...' });
    const [visibleCount, setVisibleCount] = useState(0);
    const [visibleSatellites, setVisibleSatellites] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [showOnlyAboveMe, setShowOnlyAboveMe] = useState(false);
    const [locationError, setLocationError] = useState(null);

    // Listen for Escape key to reset filters in Dashboard too
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setFilterType('All');
                setShowOnlyAboveMe(false);
                setSearchTerm('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Geolocation with reverse geocoding
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const locationName = await reverseGeocode(lat, lng);

                    setUserLocation({
                        lat,
                        lng,
                        name: locationName
                    });
                    setLocationError(null);
                },
                (error) => {
                    console.error("Error getting location:", error);
                    setLocationError("Location access denied. Using default.");
                    setUserLocation({ lat: 5.6037, lng: -0.1870, name: 'Accra, Ghana (default)' });
                }
            );
        } else {
            setLocationError("Geolocation not supported");
            setUserLocation({ lat: 5.6037, lng: -0.1870, name: 'Accra, Ghana (default)' });
        }
    }, []);

    // Weather
    useEffect(() => {
        const updateWeather = async () => {
            const data = await checkWeather(userLocation.lat, userLocation.lng);
            setWeather(data);
        };
        updateWeather();
        const interval = setInterval(updateWeather, 600000);
        return () => clearInterval(interval);
    }, [userLocation]);

    // Pass Prediction
    useEffect(() => {
        if (selectedSat) {
            const info = predictPass(selectedSat.line1, selectedSat.line2, userLocation.lat, userLocation.lng);
            setPassInfo(info);
        }
    }, [selectedSat, userLocation]);

    // Visible Now Counter - also tracks which satellites are visible
    useEffect(() => {
        if (!satellites || satellites.length === 0) {
            setVisibleCount(0);
            setVisibleSatellites([]);
            return;
        }
        const calculateVisible = () => {
            const now = new Date();
            const visible = [];
            satellites.forEach(sat => {
                try {
                    const satrec = satellite.twoline2satrec(sat.line1, sat.line2);
                    const positionAndVelocity = satellite.propagate(satrec, now);
                    const positionEci = positionAndVelocity.position;

                    if (positionEci && typeof positionEci !== 'boolean') {
                        const gmst = satellite.gstime(now);
                        const positionEcf = satellite.eciToEcf(positionEci, gmst);

                        const observerGd = {
                            longitude: userLocation.lng * (Math.PI / 180),
                            latitude: userLocation.lat * (Math.PI / 180),
                            height: 0
                        };

                        const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);
                        const elevationDeg = lookAngles.elevation * (180 / Math.PI);

                        if (elevationDeg > 10) {
                            visible.push({ ...sat, elevation: elevationDeg.toFixed(1) });
                        }
                    }
                } catch (e) {
                    // Skip satellites with invalid TLE data
                }
            });
            setVisibleCount(visible.length);
            setVisibleSatellites(visible);
        };
        
        calculateVisible();
        const interval = setInterval(calculateVisible, 2000);
        return () => clearInterval(interval);
    }, [satellites, userLocation]);

    // Notify parent when filter changes (either by location or by category)
    useEffect(() => {
        if (onFilterVisible) {
            if (showOnlyAboveMe) {
                // Show only satellites above user location
                onFilterVisible(visibleSatellites);
            } else if (filterType !== 'All') {
                // Show satellites matching the category filter
                const filtered = satellites ? satellites.filter(sat => matchesFilterCategory(sat.name, filterType)) : [];
                onFilterVisible(filtered);
            } else {
                // No filter - show all
                onFilterVisible(null);
            }
        }
    }, [showOnlyAboveMe, visibleSatellites, filterType, satellites, onFilterVisible]);

    const matchesFilterCategory = (satName, category) => {
        if (category === 'All') return true;
        const lower = satName.toLowerCase();
        switch (category) {
            case 'Starlink':
                return lower.includes('starlink');
            case 'ISS':
                return lower.includes('iss') || lower.includes('zarya');
            case 'GPS':
                return lower.includes('gps') || lower.includes('navstar');
            case 'Weather':
                return lower.includes('noaa') || lower.includes('goes') || lower.includes('meteosat');
            case 'Hubble':
                return lower.includes('hst') || lower.includes('hubble');
            default:
                return true;
        }
    };

    // Quick jump to a satellite type
    const jumpToSatellite = (type) => {
        if (!satellites || satellites.length === 0) return;
        
        if (type === 'All') {
            // Clear filter and selection
            setFilterType('All');
            return;
        }
        
        // Find first satellite matching the type and select it
        const targetSat = satellites.find(sat => matchesFilterCategory(sat.name, type));
        
        if (targetSat) {
            setSelectedSat(targetSat);
        }
        
        // Set filter to show matching satellites
        setFilterType(type);
    };

    // Search & Filter Logic
    const filteredSatellites = satellites ? satellites.filter(sat => {
        const matchesSearch = sat.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = matchesFilterCategory(sat.name, filterType);
        return matchesSearch && matchesFilter;
    }).slice(0, 15) : []; // Show top 15 matches for better visibility

    // Detect if mobile/tablet
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [menuOpen, setMenuOpen] = useState(false);
    
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (!mobile) setMenuOpen(false); // Reset menu on desktop
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close menu when satellite is selected on mobile
    useEffect(() => {
        if (isMobile && selectedSat) {
            setMenuOpen(false);
        }
    }, [selectedSat, isMobile]);

    return (
        <>
        {/* Mobile Hamburger Button */}
        {isMobile && (
            <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                    position: 'absolute',
                    top: '15px',
                    left: '15px',
                    zIndex: 300,
                    background: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    padding: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    pointerEvents: 'auto'
                }}
            >
                <span style={{ width: '20px', height: '2px', background: menuOpen ? '#00ff00' : 'white', transition: 'all 0.2s' }}></span>
                <span style={{ width: '20px', height: '2px', background: menuOpen ? '#00ff00' : 'white', transition: 'all 0.2s' }}></span>
                <span style={{ width: '20px', height: '2px', background: menuOpen ? '#00ff00' : 'white', transition: 'all 0.2s' }}></span>
            </button>
        )}

        {/* Mobile: Visible count badge (always shown) */}
        {isMobile && !menuOpen && (
            <div 
                onClick={() => setShowOnlyAboveMe(!showOnlyAboveMe)}
                style={{
                    position: 'absolute',
                    top: '15px',
                    right: '15px',
                    zIndex: 200,
                    background: showOnlyAboveMe ? 'rgba(0, 255, 0, 0.2)' : 'rgba(0, 0, 0, 0.8)',
                    border: showOnlyAboveMe ? '2px solid #00ff00' : '1px solid #333',
                    borderRadius: '20px',
                    padding: '8px 14px',
                    color: showOnlyAboveMe ? '#00ff00' : 'white',
                    fontFamily: 'monospace',
                    fontSize: '0.9em',
                    cursor: 'pointer',
                    pointerEvents: 'auto'
                }}
            >
                🛰️ {visibleCount} visible
            </div>
        )}

        {/* Main Dashboard Panel - Left Side (Hidden on mobile unless menu open) */}
        <div style={{
            position: 'absolute',
            top: isMobile ? '0' : '20px',
            left: isMobile ? '0' : '20px',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            pointerEvents: 'none',
            zIndex: 150,
            display: isMobile && !menuOpen ? 'none' : 'block',
            width: isMobile ? '100%' : 'auto',
            height: isMobile ? '100%' : 'auto',
            background: isMobile ? 'rgba(0, 0, 0, 0.7)' : 'transparent'
        }}>
            <div className="dashboard-panel" style={{
                background: 'rgba(0, 0, 0, 0.95)',
                padding: isMobile ? '60px 20px 20px 20px' : '20px',
                borderRadius: isMobile ? '0' : '10px',
                width: isMobile ? '280px' : '300px',
                maxWidth: '320px',
                pointerEvents: 'auto',
                height: isMobile ? '100vh' : 'auto',
                maxHeight: isMobile ? '100vh' : 'none',
                overflowY: 'auto',
                boxSizing: 'border-box'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                    <img src="/logo.png" alt="Logo" style={{ width: '30px', borderRadius: '6px' }} onError={(e) => e.target.style.display = 'none'} />
                    <h2 style={{ margin: 0, fontSize: '1.2em' }}>Sat-Track</h2>
                </div>

                <div style={{
                    background: '#111',
                    border: showOnlyAboveMe ? '2px solid #00ff00' : '1px solid #0f0',
                    borderRadius: '6px',
                    padding: '10px',
                    marginBottom: '15px',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }} onClick={() => setShowOnlyAboveMe(!showOnlyAboveMe)}>
                    <div style={{ fontSize: '0.75em', color: '#7cff7c', marginBottom: '2px' }}>
                        📍 {userLocation.name}
                    </div>
                    <div style={{ fontSize: '0.6em', color: '#888', marginBottom: '5px' }}>
                        {userLocation.lat.toFixed(4)}°, {userLocation.lng.toFixed(4)}°
                    </div>
                    <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: showOnlyAboveMe ? '#00ff00' : 'white' }}>
                        {visibleCount}
                    </div>
                    <div style={{ fontSize: '0.75em', color: '#aaa' }}>
                        Visible from your sky
                    </div>
                    <div style={{ fontSize: '0.6em', color: '#666', marginTop: '2px' }}>
                        (more than 10° above horizon)
                    </div>
                    <div style={{ 
                        fontSize: '0.7em', 
                        color: showOnlyAboveMe ? '#00ff00' : '#888',
                        marginTop: '5px',
                        padding: '3px 8px',
                        background: showOnlyAboveMe ? 'rgba(0,255,0,0.1)' : 'transparent',
                        borderRadius: '3px',
                        display: 'inline-block'
                    }}>
                        {showOnlyAboveMe ? '✓ Filtering visible satellites' : 'Click to filter'}
                    </div>
                    {locationError && (
                        <div style={{ fontSize: '0.65em', color: '#ff6b6b', marginTop: '3px' }}>
                            {locationError}
                        </div>
                    )}
                </div>

                {/* Quick Jump Buttons */}
                <div style={{ marginBottom: '15px' }}>
                    <div style={{ fontSize: '0.75em', color: '#888', marginBottom: '5px' }}>Quick Jump:</div>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {[
                            { type: 'ISS', icon: '🛸', label: 'ISS' },
                            { type: 'Starlink', icon: '📡', label: 'Starlink' },
                            { type: 'GPS', icon: '🌐', label: 'GPS' },
                            { type: 'Weather', icon: '🌤', label: 'Weather' },
                            { type: 'Hubble', icon: '🔭', label: 'Hubble' }
                        ].map(({ type, icon, label }) => (
                            <button
                                key={type}
                                onClick={() => jumpToSatellite(type)}
                                style={{
                                    padding: isMobile ? '8px 12px' : '6px 10px',
                                    fontSize: isMobile ? '0.85em' : '0.8em',
                                    background: filterType === type ? '#0066cc' : '#333',
                                    border: filterType === type ? '1px solid #00aaff' : '1px solid #555',
                                    borderRadius: '4px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    minHeight: isMobile ? '40px' : 'auto'
                                }}
                            >
                                {icon} {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search Section */}
                <div style={{ marginBottom: '15px' }}>
                    <input
                        type="text"
                        placeholder="Search satellites..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: isMobile ? '12px' : '10px',
                            borderRadius: '5px',
                            border: '1px solid #555',
                            background: '#222',
                            color: 'white',
                            fontSize: isMobile ? '16px' : '0.9em', // 16px prevents iOS zoom
                            boxSizing: 'border-box',
                            minHeight: isMobile ? '44px' : 'auto'
                        }}
                    />
                    
                    {/* Search Results Dropdown */}
                    {searchTerm.length >= 2 && filteredSatellites.length > 0 && (
                        <div style={{
                            marginTop: '5px',
                            background: '#333',
                            borderRadius: '5px',
                            maxHeight: '150px',
                            overflowY: 'auto'
                        }}>
                            {filteredSatellites.map((sat, i) => (
                                <div
                                    key={i}
                                    onClick={() => {
                                        setSelectedSat(sat);
                                        setSearchTerm(''); // Clear search on select
                                    }}
                                    style={{
                                        padding: '5px 10px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid #444',
                                        fontSize: '0.9em'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = '#555'}
                                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                >
                                    {sat.name}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Full Satellite List Dropdown */}
                    {!searchTerm && (
                        <div style={{ marginTop: '10px' }}>
                            <select
                                value={selectedSat ? selectedSat.name : ''}
                                onChange={(e) => {
                                    const sat = satellites.find(s => s.name === e.target.value);
                                    if (sat) setSelectedSat(sat);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '5px',
                                    border: '1px solid #555',
                                    background: '#222',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.9em'
                                }}
                            >
                                <option value="">
                                    {isLoading ? 'Loading satellites...' : `Select from ${satellites ? satellites.length : 0} satellites...`}
                                </option>
                                {satellites && satellites.slice(0, 50).map((sat, i) => (
                                    <option key={i} value={sat.name}>
                                        {sat.name}
                                    </option>
                                ))}
                                {satellites && satellites.length > 50 && (
                                    <option disabled>... and {satellites.length - 50} more (use search)</option>
                                )}
                            </select>
                            
                            {/* Show retry button if we have too few satellites */}
                            {!isLoading && satellites && satellites.length < 100 && onRetryLoad && (
                                <button
                                    onClick={onRetryLoad}
                                    style={{
                                        marginTop: '8px',
                                        padding: '8px 12px',
                                        background: '#ff6b35',
                                        border: 'none',
                                        borderRadius: '5px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '0.85em',
                                        width: '100%'
                                    }}
                                >
                                    Only {satellites.length} loaded - Click to retry
                                </button>
                            )}
                            
                            <div style={{ marginTop: '10px', fontSize: '0.8em' }}>
                                <a href="https://www.n2yo.com/" target="_blank" rel="noreferrer" style={{ color: '#888' }}>Verify Data on N2YO</a>
                            </div>
                        </div>
                    )}
                </div>

                {/* Selected Satellite Info */}
                <div style={{ marginBottom: '15px', padding: '10px', background: '#222', borderRadius: '5px' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '1em', color: '#00d2ff' }}>
                        {selectedSat ? selectedSat.name : 'Select a Satellite'}
                    </h3>
                    {selectedSat ? (
                        <div style={{ fontSize: '0.9em' }}>
                            <p><strong>Next Pass:</strong> {passInfo ? passInfo.nextPass : 'Calculating...'}</p>
                            <p><strong>Max Elevation:</strong> {passInfo ? passInfo.maxElevation : '--'}</p>
                            <p><strong>Duration:</strong> {passInfo ? passInfo.duration : '--'}</p>
                        </div>
                    ) : (
                        <p style={{ fontSize: '0.8em', color: '#aaa' }}>Click a satellite or use search to track.</p>
                    )}
                    <p><strong>Visibility:</strong> {weather ? `${(weather.visibility / 1000).toFixed(1)} km` : 'Loading...'}</p>
                </div>
            </div>
        </div>

            {/* Info Panel - Bottom Sheet Card on Mobile, Right Side on Desktop */}
            {selectedSat && (
                <div className="info-panel" style={{
                    position: 'fixed',
                    top: isMobile ? 'auto' : '20px',
                    bottom: isMobile ? '0' : 'auto',
                    right: isMobile ? '0' : '20px',
                    left: isMobile ? '0' : 'auto',
                    background: isMobile 
                        ? 'linear-gradient(to top, rgba(0,0,0,0.98), rgba(0,0,0,0.90))' 
                        : 'rgba(0, 0, 0, 0.95)',
                    padding: isMobile ? '10px 14px 16px 14px' : '20px',
                    borderRadius: isMobile ? '16px 16px 0 0' : '10px',
                    width: isMobile ? '100%' : '300px',
                    maxWidth: isMobile ? 'none' : '320px',
                    color: 'white',
                    fontFamily: 'Arial, sans-serif',
                    pointerEvents: 'auto',
                    maxHeight: isMobile ? '35vh' : 'calc(100vh - 60px)', // Reduced from 50vh to 35vh
                    overflowY: 'auto',
                    zIndex: 250,
                    boxSizing: 'border-box',
                    boxShadow: isMobile ? '0 -4px 20px rgba(0,0,0,0.5)' : 'none',
                    fontSize: isMobile ? '0.9em' : '1em' // Slightly smaller text on mobile
                }}>
                    {/* Drag handle indicator for mobile */}
                    {isMobile && (
                        <div style={{
                            width: '40px',
                            height: '4px',
                            background: '#555',
                            borderRadius: '2px',
                            margin: '0 auto 12px auto'
                        }} />
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ marginTop: 0, color: '#00d2ff', flex: 1, fontSize: isMobile ? '1.1em' : '1em' }}>{selectedSat.name}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {!isMobile && <span style={{ fontSize: '0.65em', color: '#666', background: '#333', padding: '2px 6px', borderRadius: '3px' }}>ESC</span>}
                            <button 
                                onClick={() => setSelectedSat(null)}
                                style={{
                                    background: isMobile ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    border: 'none',
                                    color: '#888',
                                    fontSize: isMobile ? '1.4em' : '1.2em',
                                    cursor: 'pointer',
                                    padding: isMobile ? '8px 12px' : '0',
                                    borderRadius: '8px',
                                    minWidth: isMobile ? '44px' : 'auto',
                                    minHeight: isMobile ? '44px' : 'auto'
                                }}
                            >✕</button>
                        </div>
                    </div>
                    {(() => {
                        const metadataRecord = (satMetadata && selectedSat && selectedSat.catalogNumber)
                            ? satMetadata[selectedSat.catalogNumber]
                            : null;
                        const fallbackInfo = getInfo(selectedSat.name);
                        
                        // Calculate orbital data from TLE if no metadata available
                        let tleOrbitalData = null;
                        if (selectedSat.line1 && selectedSat.line2) {
                            try {
                                const satrec = satellite.twoline2satrec(selectedSat.line1, selectedSat.line2);
                                if (satrec) {
                                    // Mean motion is in radians per minute
                                    const meanMotionRevPerDay = (satrec.no * 1440) / (2 * Math.PI);
                                    // Orbital period in minutes
                                    const periodMinutes = 1440 / meanMotionRevPerDay;
                                    // Semi-major axis using Kepler's third law
                                    // a = (GM * T^2 / 4*pi^2)^(1/3) where GM = 398600.4418 km³/s²
                                    const mu = 398600.4418; // Earth's gravitational parameter
                                    const periodSeconds = periodMinutes * 60;
                                    const semiMajorAxis = Math.pow((mu * Math.pow(periodSeconds, 2)) / (4 * Math.PI * Math.PI), 1/3);
                                    // Apogee and Perigee
                                    const earthRadius = 6371; // km
                                    const eccentricity = satrec.ecco;
                                    const apogee = semiMajorAxis * (1 + eccentricity) - earthRadius;
                                    const perigee = semiMajorAxis * (1 - eccentricity) - earthRadius;
                                    // Inclination (already in radians in satrec)
                                    const inclination = satrec.inclo * (180 / Math.PI);
                                    
                                    tleOrbitalData = {
                                        PERIOD: periodMinutes,
                                        MEAN_MOTION: meanMotionRevPerDay,
                                        APOGEE: apogee,
                                        PERIGEE: perigee,
                                        INCLINATION: inclination,
                                        ECCENTRICITY: eccentricity
                                    };
                                }
                            } catch (e) {
                                console.warn('Could not calculate orbital data from TLE');
                            }
                        }
                        
                        // Merge: use metadata if available, otherwise use TLE-calculated data
                        const orbitalData = metadataRecord || tleOrbitalData || {};

                        // Check if we have real metadata
                        const hasRealMetadata = metadataRecord && (
                            metadataRecord.LAUNCH_DATE || 
                            metadataRecord.COUNTRY_CODE ||
                            metadataRecord.OWNER
                        );

                        return (
                            <div style={{ fontSize: '0.9em' }}>
                                {/* NORAD ID */}
                                {(metadataRecord?.NORAD_CAT_ID || selectedSat.catalogNumber) && (
                                    <div style={{ 
                                        background: '#1a1a2e', 
                                        padding: '8px', 
                                        borderRadius: '5px',
                                        marginBottom: '10px',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ fontSize: '0.8em', color: '#888' }}>NORAD Catalog ID</div>
                                        <div style={{ fontSize: '1.3em', color: '#00ff00', fontFamily: 'monospace' }}>
                                            {metadataRecord?.NORAD_CAT_ID || selectedSat.catalogNumber}
                                        </div>
                                    </div>
                                )}

                                {/* Basic Info Grid */}
                                <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
                                        <span style={{ color: '#888' }}>Owner/Country:</span>
                                        <span>{metadataRecord?.OWNER || metadataRecord?.COUNTRY_CODE || fallbackInfo?.owner || 'Unknown'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
                                        <span style={{ color: '#888' }}>Launch Date:</span>
                                        <span>{metadataRecord?.LAUNCH_DATE || fallbackInfo?.launchDate || 'Unknown'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
                                        <span style={{ color: '#888' }}>Object Type:</span>
                                        <span>{metadataRecord?.OBJECT_TYPE || fallbackInfo?.purpose || 'Payload'}</span>
                                    </div>
                                    {(metadataRecord?.OBJECT_ID || selectedSat.line1) && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
                                            <span style={{ color: '#888' }}>Intl Designator:</span>
                                            <span style={{ fontFamily: 'monospace' }}>{metadataRecord?.OBJECT_ID || selectedSat.line1?.substring(9, 17)?.trim()}</span>
                                        </div>
                                    )}
                                    {metadataRecord?.LAUNCH_SITE && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
                                            <span style={{ color: '#888' }}>Launch Site:</span>
                                            <span>{metadataRecord.LAUNCH_SITE}</span>
                                        </div>
                                    )}
                                    {orbitalData?.PERIOD && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
                                            <span style={{ color: '#888' }}>Orbital Period:</span>
                                            <span>{parseFloat(orbitalData.PERIOD).toFixed(2)} min</span>
                                        </div>
                                    )}
                                    {orbitalData?.MEAN_MOTION && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
                                            <span style={{ color: '#888' }}>Mean Motion:</span>
                                            <span>{parseFloat(orbitalData.MEAN_MOTION).toFixed(4)} rev/day</span>
                                        </div>
                                    )}
                                    {orbitalData?.APOGEE && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
                                            <span style={{ color: '#888' }}>Apogee:</span>
                                            <span>{parseFloat(orbitalData.APOGEE).toFixed(1)} km</span>
                                        </div>
                                    )}
                                    {orbitalData?.PERIGEE && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
                                            <span style={{ color: '#888' }}>Perigee:</span>
                                            <span>{parseFloat(orbitalData.PERIGEE).toFixed(1)} km</span>
                                        </div>
                                    )}
                                    {orbitalData?.INCLINATION && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
                                            <span style={{ color: '#888' }}>Inclination:</span>
                                            <span>{parseFloat(orbitalData.INCLINATION).toFixed(2)}°</span>
                                        </div>
                                    )}
                                    {orbitalData?.ECCENTRICITY !== undefined && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
                                            <span style={{ color: '#888' }}>Eccentricity:</span>
                                            <span>{parseFloat(orbitalData.ECCENTRICITY).toFixed(6)}</span>
                                        </div>
                                    )}
                                    {metadataRecord?.RCS_SIZE && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
                                            <span style={{ color: '#888' }}>Size (RCS):</span>
                                            <span>{metadataRecord.RCS_SIZE === 'LARGE' ? 'Large' : metadataRecord.RCS_SIZE === 'MEDIUM' ? 'Medium' : metadataRecord.RCS_SIZE === 'SMALL' ? 'Small' : metadataRecord.RCS_SIZE}</span>
                                        </div>
                                    )}
                                    {metadataRecord?.EPOCH && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
                                            <span style={{ color: '#888' }}>TLE Epoch:</span>
                                            <span style={{ fontSize: '0.85em' }}>{metadataRecord.EPOCH.substring(0, 10)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Description - only show if we have specific info */}
                                {fallbackInfo && fallbackInfo !== getInfo('GENERIC') && fallbackInfo.description && (
                                    <div style={{ 
                                        background: '#1a1a2e', 
                                        padding: '10px', 
                                        borderRadius: '5px',
                                        fontSize: '0.85em',
                                        lineHeight: '1.5',
                                        color: '#ccc'
                                    }}>
                                        {fallbackInfo.description}
                                    </div>
                                )}

                                {/* No detailed metadata message */}
                                {!hasRealMetadata && tleOrbitalData && (
                                    <div style={{ 
                                        background: '#1a1a2e', 
                                        padding: '10px', 
                                        borderRadius: '5px',
                                        fontSize: '0.8em',
                                        lineHeight: '1.4',
                                        color: '#888',
                                        fontStyle: 'italic'
                                    }}>
                                        Orbital data calculated from TLE. Launch info not available for this satellite.
                                    </div>
                                )}

                                {/* Data Source */}
                                <div style={{ 
                                    marginTop: '12px', 
                                    fontSize: '0.7em', 
                                    color: '#666',
                                    textAlign: 'center'
                                }}>
                                    Data: CelesTrak GP API • TLE Feed
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
        </>
    );
};

export default Dashboard;
