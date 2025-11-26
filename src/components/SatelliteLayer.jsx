import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as satellite from 'satellite.js';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

// Detect mobile for performance optimizations
const isMobile = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth < 768
);

// Limit satellites on mobile to prevent memory issues
// Increased to 1000 for better coverage while staying performant
const MAX_SATELLITES_MOBILE = 1000;

const SatelliteLayer = ({ selectedSat, setSelectedSat, setHoveredSat, satellites, highlightedSatellites }) => {
    const meshRef = useRef();
    const glowRef = useRef();
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const [orbitPath, setOrbitPath] = useState(null);
    
    // Limit satellites on mobile
    const limitedSatellites = useMemo(() => {
        if (!satellites) return [];
        if (isMobile && satellites.length > MAX_SATELLITES_MOBILE) {
            console.log(`[Mobile] Limiting satellites from ${satellites.length} to ${MAX_SATELLITES_MOBILE}`);
            return satellites.slice(0, MAX_SATELLITES_MOBILE);
        }
        return satellites;
    }, [satellites]);
    
    const satCount = limitedSatellites.length;

    // Create a Set of highlighted satellite names for fast lookup
    const highlightedNames = useMemo(() => {
        if (!highlightedSatellites) return null;
        return new Set(highlightedSatellites.map(s => s.name));
    }, [highlightedSatellites]);

    const satRecords = useMemo(() => {
        if (!limitedSatellites || limitedSatellites.length === 0) return [];
        return limitedSatellites.map((sat) => ({
            ...sat,
            satrec: satellite.twoline2satrec(sat.line1, sat.line2)
        }));
    }, [limitedSatellites]);

    // Satellite points - CYAN colored to distinguish from white stars
    const satelliteGeometry = useMemo(() => new THREE.SphereGeometry(0.008, 10, 10), []);
    const satelliteMaterial = useMemo(() => new THREE.MeshBasicMaterial({
        color: 0x00e5ff,  // Bright cyan - clearly different from stars
        transparent: true,
        opacity: 0.95
    }), []);

    // Glow effect - slightly larger cyan halo
    const glowGeometry = useMemo(() => new THREE.SphereGeometry(0.016, 10, 10), []);
    const glowMaterial = useMemo(() => new THREE.MeshBasicMaterial({
        color: 0x00bcd4,  // Cyan glow
        transparent: true,
        opacity: 0.25,
        side: THREE.BackSide
    }), []);

    // Calculate Orbit Path when selectedSat changes
    // Shows orbital plane - uses ECI->ECEF with frozen GMST for smooth ellipse
    useEffect(() => {
        if (selectedSat) {
            const satrec = satellite.twoline2satrec(selectedSat.line1, selectedSat.line2);
            const points = [];
            const now = new Date();
            const gmstNow = satellite.gstime(now);
            const periodMinutes = (2 * Math.PI) / satrec.no;
            const step = periodMinutes > 1000 ? 5 : 0.5;

            for (let i = 0; i <= periodMinutes; i += step) {
                const time = new Date(now.getTime() + i * 60000);
                const positionAndVelocity = satellite.propagate(satrec, time);
                const positionEci = positionAndVelocity.position;

                if (positionEci && typeof positionEci !== 'boolean') {
                    // Use frozen GMST (current time) for entire orbit
                    // This gives a clean ellipse in current Earth-fixed frame
                    const positionGd = satellite.eciToGeodetic(positionEci, gmstNow);
                    
                    const lat = positionGd.latitude;
                    const lon = positionGd.longitude;
                    const alt = positionGd.height;
                    
                    const radius = 1 + (alt / 6371);
                    const x = radius * Math.cos(lat) * Math.cos(lon);
                    const y = radius * Math.sin(lat);
                    const z = radius * Math.cos(lat) * Math.sin(lon);
                    
                    points.push(new THREE.Vector3(x, y, -z));
                }
            }

            if (points.length > 0) points.push(points[0]);
            setOrbitPath(points);
        } else {
            setOrbitPath(null);
        }
    }, [selectedSat]);

    // Update all satellite positions each frame
    useFrame(() => {
        if (!meshRef.current || satRecords.length === 0) return;

        const mesh = meshRef.current;
        const glow = glowRef.current;
        
        if (mesh.count !== satCount) {
            mesh.count = satCount;
            mesh.instanceMatrix.needsUpdate = true;
        }

        const now = new Date();
        const dummy = new THREE.Object3D();
        
        // Get GMST for ECI to geodetic conversion
        const gmst = satellite.gstime(now);
        
        // Check if we have an active highlight filter
        const hasActiveFilter = highlightedNames !== null && highlightedNames.size > 0;

        satRecords.forEach((sat, i) => {
            const positionAndVelocity = satellite.propagate(sat.satrec, now);
            const positionEci = positionAndVelocity.position;

            if (positionEci && typeof positionEci !== 'boolean') {
                // Convert ECI to geodetic (lat/lon/alt) then to 3D position on globe
                const positionGd = satellite.eciToGeodetic(positionEci, gmst);
                
                const lat = positionGd.latitude;  // radians
                const lon = positionGd.longitude; // radians
                const alt = positionGd.height;    // km
                
                // Convert geodetic to 3D position (radius = 1 for Earth surface)
                const radius = 1 + (alt / 6371); // Scale altitude
                const x = radius * Math.cos(lat) * Math.cos(lon);
                const y = radius * Math.sin(lat);
                const z = radius * Math.cos(lat) * Math.sin(lon);

                const isSelected = selectedSat && selectedSat.name === sat.name;
                const isHovered = hoveredIndex === i;
                const isHighlighted = hasActiveFilter ? highlightedNames.has(sat.name) : true;

                dummy.position.set(x, y, -z);  // Flip Z for correct orientation

                // Scale based on state
                let satScale = 1;
                let glowScale = 1;
                
                if (isSelected) {
                    satScale = 5;
                    glowScale = 4;
                } else if (isHovered) {
                    satScale = 3;
                    glowScale = 2.5;
                } else if (hasActiveFilter && !isHighlighted) {
                    // Dimmed but still visible and clickable
                    satScale = 0.6;
                    glowScale = 0; // No glow for dimmed
                } else if (hasActiveFilter && isHighlighted) {
                    // Highlighted satellites are bigger
                    satScale = 1.8;
                    glowScale = 1.5;
                } else {
                    // No filter active - normal size for all
                    satScale = 1;
                    glowScale = 1;
                }

                dummy.scale.set(satScale, satScale, satScale);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);

                // Glow layer
                if (glow) {
                    dummy.scale.set(glowScale, glowScale, glowScale);
                    dummy.updateMatrix();
                    glow.setMatrixAt(i, dummy.matrix);
                }
            } else {
                dummy.position.set(0, 0, 0);
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
                if (glow) glow.setMatrixAt(i, dummy.matrix);
            }
        });

        mesh.instanceMatrix.needsUpdate = true;
        if (glow) glow.instanceMatrix.needsUpdate = true;
    });

    if (!satRecords || satRecords.length === 0) {
        return null;
    }

    return (
        <group>
            {/* Glow layer */}
            <instancedMesh
                ref={glowRef}
                args={[glowGeometry, glowMaterial, satCount || 1]}
                frustumCulled={false}
            />

            {/* Main satellite spheres */}
            <instancedMesh
                ref={meshRef}
                args={[satelliteGeometry, satelliteMaterial, satCount || 1]}
                frustumCulled={false}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHoveredIndex(e.instanceId);
                    setHoveredSat(satRecords[e.instanceId]);
                    document.body.style.cursor = 'pointer';
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    setHoveredIndex(null);
                    setHoveredSat(null);
                    document.body.style.cursor = 'default';
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    const targetSat = satRecords[e.instanceId];
                    if (targetSat) {
                        setSelectedSat(targetSat);
                    }
                }}
            />

            {/* Orbit Path Line - bright yellow/orange to stand out */}
            {orbitPath && orbitPath.length > 0 && (
                <Line 
                    points={orbitPath} 
                    color="#ffcc00" 
                    lineWidth={isMobile ? 1.5 : 2.5} // Thinner on mobile for performance, but still visible
                    transparent
                    opacity={0.9}
                />
            )}
        </group>
    );
};

export default SatelliteLayer;
