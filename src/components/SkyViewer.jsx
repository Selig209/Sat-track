import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { TextureLoader, Vector3 } from 'three';
import * as THREE from 'three';
import SatelliteLayer from './SatelliteLayer';

// Custom Shader for Day/Night Cycle
const EarthMaterial = {
    uniforms: {
        dayTexture: { value: null },
        nightTexture: { value: null },
        sunDirection: { value: new Vector3(1, 0.5, 0.5).normalize() }, // Match directional light
    },
    vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    uniform vec3 sunDirection;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(mat3(modelMatrix) * normal);
    }
  `,
    fragmentShader: `
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;
    uniform vec3 sunDirection;
    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      vec3 dayColor = texture2D(dayTexture, vUv).rgb;
      vec3 nightColor = texture2D(nightTexture, vUv).rgb;
      float intensity = dot(vNormal, sunDirection);
      vec3 color = mix(nightColor, dayColor, smoothstep(-0.2, 0.2, intensity));
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

const Earth = () => {
    const meshRef = useRef();
    const cloudsRef = useRef();
    const materialRef = useRef();

    const [dayMap, nightMap, cloudsMap] = useLoader(TextureLoader, [
        '/textures/earth_day.jpg',
        '/textures/earth_night.jpg',
        '/textures/earth_clouds.png',
    ]);

    // Earth rotation - fixed relative to satellites (satellites use geodetic coordinates)
    // The sun direction in the shader handles day/night visualization
    useFrame(() => {
        // Earth stays fixed - satellites are positioned using real-time geodetic coords
        // which already account for Earth's rotation
        if (meshRef.current) {
            meshRef.current.rotation.y = 0;
        }
        if (cloudsRef.current) {
            // Slight cloud drift for realism
            cloudsRef.current.rotation.y += 0.00002;
        }
    });

    const shaderArgs = useMemo(() => ({
        uniforms: {
            dayTexture: { value: dayMap },
            nightTexture: { value: nightMap },
            sunDirection: { value: new Vector3(10, 10, 5).normalize() }
        },
        vertexShader: EarthMaterial.vertexShader,
        fragmentShader: EarthMaterial.fragmentShader
    }), [dayMap, nightMap]);

    return (
        <group>
            <mesh ref={meshRef}>
                <sphereGeometry args={[1, 64, 64]} />
                <shaderMaterial ref={materialRef} args={[shaderArgs]} />
            </mesh>
            <mesh ref={cloudsRef}>
                <sphereGeometry args={[1.02, 64, 64]} />
                <meshPhongMaterial
                    map={cloudsMap}
                    transparent={true}
                    opacity={0.8}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>
        </group>
    );
};

const SkyViewer = ({ selectedSat, setSelectedSat, hoveredSat, setHoveredSat, satellites, highlightedSatellites }) => {
    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
                <ambientLight intensity={0.1} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                <Earth />
                <SatelliteLayer
                    selectedSat={selectedSat}
                    setSelectedSat={setSelectedSat}
                    setHoveredSat={setHoveredSat}
                    satellites={satellites}
                    highlightedSatellites={highlightedSatellites}
                />
                <OrbitControls 
                    enablePan={true}
                    panSpeed={0.8}
                    rotateSpeed={0.6}
                    zoomSpeed={1.2}
                    minDistance={1.3}
                    maxDistance={15}
                    enableDamping={true}
                    dampingFactor={0.05}
                />
            </Canvas>

            {/* Tooltip Overlay */}
            {hoveredSat && (
                <div style={{
                    position: 'absolute',
                    top: 'auto',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0, 255, 0, 0.2)',
                    border: '1px solid #0f0',
                    color: '#0f0',
                    padding: '5px 10px',
                    borderRadius: '5px',
                    fontFamily: 'monospace',
                    pointerEvents: 'none', // Don't block clicks
                    zIndex: 2000
                }}>
                    TARGET: {hoveredSat.name}
                </div>
            )}
        </div>
    );
};

export default SkyViewer;
