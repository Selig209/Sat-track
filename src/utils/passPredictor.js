import * as satellite from 'satellite.js';

const MIN_ELEVATION_DEG = 10;

const formatDuration = (ms) => {
    if (!ms || ms <= 0) return '—';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    if (minutes === 0) {
        return `${seconds}s`;
    }
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

export const predictPass = (
    tleLine1,
    tleLine2,
    observerLat,
    observerLng,
    startTime = new Date(),
    durationHours = 24
) => {
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    const passes = [];
    const stepSeconds = 60;
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

    let isVisible = false;
    let currentPass = null;

    for (let t = new Date(startTime); t < endTime; t = new Date(t.getTime() + stepSeconds * 1000)) {
        const positionAndVelocity = satellite.propagate(satrec, t);
        if (!positionAndVelocity.position) continue;

        const gmst = satellite.gstime(t);
        const positionEcf = satellite.eciToEcf(positionAndVelocity.position, gmst);
        const lookAngles = satellite.ecfToLookAngles(
            {
                longitude: satellite.degreesToRadians(observerLng),
                latitude: satellite.degreesToRadians(observerLat),
                height: 0
            },
            positionEcf
        );

        const elevation = satellite.radiansToDegrees(lookAngles.elevation);

        if (elevation > MIN_ELEVATION_DEG) {
            if (!isVisible) {
                isVisible = true;
                currentPass = {
                    start: new Date(t),
                    maxElevation: elevation
                };
            } else if (elevation > currentPass.maxElevation) {
                currentPass.maxElevation = elevation;
            }
        } else if (isVisible) {
            isVisible = false;
            currentPass.end = new Date(t);
            passes.push(currentPass);
            currentPass = null;
        }
    }

    if (isVisible && currentPass) {
        currentPass.end = endTime;
        passes.push(currentPass);
    }

    if (passes.length === 0) {
        return null;
    }

    const nextPass = passes[0];
    const durationMs = nextPass.end && nextPass.start ? nextPass.end - nextPass.start : 0;

    return {
        nextPass: nextPass.start.toLocaleString(),
        maxElevation: `${nextPass.maxElevation.toFixed(1)}°`,
        duration: formatDuration(durationMs),
        passes
    };
};
