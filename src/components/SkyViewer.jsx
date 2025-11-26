import React, { useRef, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { TextureLoader, Vector3 } from 'three';
import * as THREE from 'three';
import SatelliteLayer from './SatelliteLayer';

// Detect mobile for performance optimizations
const isMobile = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth < 768
);

// Error Boundary for WebGL crashes
class WebGLErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('WebGL Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    width: '100vw',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0a0a1a',
                    color: '#0ff',
                    fontFamily: 'monospace',
                    padding: '20px',
                    textAlign: 'center'
                }}>
                    <h2>🛰️ Sat-Track</h2>
                    <p style={{ color: '#ff6b6b' }}>3D rendering failed on this device</p>
                    <p style={{ fontSize: '0.9em', color: '#888', maxWidth: '300px' }}>
                        This may be due to WebGL limitations. Try:
                    </p>
                    <ul style={{ textAlign: 'left', color: '#888', fontSize: '0.85em' }}>
                        <li>Refreshing the page</li>
                        <li>Closing other browser tabs</li>
                        <li>Using a desktop browser</li>
                    </ul>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            background: '#0ff',
                            color: '#000',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontFamily: 'monospace'
                        }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// Loading fallback
const LoadingFallback = () => (
    <mesh>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#1a1a2e" wireframe />
    </mesh>
);

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
    
    // Reduce geometry complexity on mobile
    const sphereDetail = isMobile ? 32 : 64;

    // On mobile, only load the day texture (skip the 7MB night texture)
    const texturePaths = isMobile 
        ? ['/textures/earth_day.jpg']
        : ['/textures/earth_day.jpg', '/textures/earth_night.jpg', '/textures/earth_clouds.png'];
    
    const textures = useLoader(TextureLoader, texturePaths);
    
    // Destructure based on platform
    const dayMap = textures[0];
    const nightMap = isMobile ? null : textures[1];
    const cloudsMap = isMobile ? null : textures[2];

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
            nightTexture: { value: nightMap || dayMap }, // Fallback to day texture on mobile
            sunDirection: { value: new Vector3(10, 10, 5).normalize() }
        },
        vertexShader: EarthMaterial.vertexShader,
        fragmentShader: EarthMaterial.fragmentShader
    }), [dayMap, nightMap]);

    return (
        <group>
            <mesh ref={meshRef}>
                <sphereGeometry args={[1, sphereDetail, sphereDetail]} />
                {/* Use simple material on mobile, shader on desktop */}
                {isMobile ? (
                    <meshBasicMaterial map={dayMap} />
                ) : (
                    <shaderMaterial ref={materialRef} args={[shaderArgs]} />
                )}
            </mesh>
            {/* Skip clouds on mobile to save memory */}
            {!isMobile && cloudsMap && (
                <mesh ref={cloudsRef}>
                    <sphereGeometry args={[1.02, sphereDetail, sphereDetail]} />
                    <meshPhongMaterial
                        map={cloudsMap}
                        transparent={true}
                        opacity={0.8}
                        depthWrite={false}
                        side={THREE.DoubleSide}
                        blending={THREE.AdditiveBlending}
                    />
                </mesh>
            )}
        </group>
    );
};

const SkyViewer = ({ selectedSat, setSelectedSat, hoveredSat, setHoveredSat, satellites, highlightedSatellites }) => {
    return (
        <WebGLErrorBoundary>
            <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
                <Canvas 
                    camera={{ position: [0, 0, 4], fov: 50 }}
                    gl={{ 
                        antialias: !isMobile, // Disable antialiasing on mobile
                        powerPreference: isMobile ? 'low-power' : 'high-performance',
                        failIfMajorPerformanceCaveat: false
                    }}
                    dpr={isMobile ? [1, 1.5] : [1, 2]} // Lower resolution on mobile
                    onCreated={({ gl }) => {
                        // Log WebGL info for debugging
                        console.log('WebGL Renderer:', gl.getContext().getParameter(gl.getContext().RENDERER));
                    }}
                >
                    <Suspense fallback={<LoadingFallback />}>
                        <ambientLight intensity={0.1} />
                        <directionalLight position={[10, 10, 5]} intensity={1.5} />
                        <Stars radius={100} depth={50} count={isMobile ? 2000 : 5000} factor={4} saturation={0} fade speed={1} />
                        <Earth />
                        <SatelliteLayer
                            selectedSat={selectedSat}
                            setSelectedSat={setSelectedSat}
                            setHoveredSat={setHoveredSat}
                            satellites={satellites}
                            highlightedSatellites={highlightedSatellites}
                        />
                    </Suspense>
                    <OrbitControls 
                        enablePan={!isMobile} // Disable pan on mobile to avoid confusion
                        panSpeed={0.8}
                        rotateSpeed={isMobile ? 0.4 : 0.6} // Slower rotation on mobile
                        zoomSpeed={isMobile ? 0.8 : 1.2}
                        minDistance={1.2}
                        maxDistance={isMobile ? 25 : 15} // Allow more zoom out on mobile to see all satellites
                        enableDamping={!isMobile}
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
        </WebGLErrorBoundary>
    );
};

export default SkyViewer;
