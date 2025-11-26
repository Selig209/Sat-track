# 🛰️ Sat-Track

Real-time 3D satellite tracker that visualizes 2,000+ satellites orbiting Earth in your browser.

![Sat-Track Demo](https://img.shields.io/badge/Live-Demo-brightgreen)

## ✨ Features

- 🌍 **Real-Time Tracking** — Tracks 2,000+ satellites with live positions updated every second
- 📍 **Location-Aware** — Detects your location and shows satellites visible from your sky
- 🔭 **Pass Predictions** — Calculates when satellites will fly over your location
- 📊 **Orbital Data** — Displays apogee, perigee, inclination, and orbital period
- 🔍 **Search & Filter** — Filter by satellite type (ISS, Starlink, GPS, Weather, etc.)
- 📱 **Mobile Responsive** — Works on desktop, tablet, and mobile devices

## 🛠️ Tech Stack

- **Frontend:** React 19 + Vite
- **3D Rendering:** Three.js, React-Three-Fiber, Drei
- **Orbital Mechanics:** satellite.js (SGP4/SDP4 propagation)
- **Data Source:** CelesTrak GP API (live TLE data)
- **Geocoding:** OpenStreetMap Nominatim

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/Selig209/Sat-track.git
cd Sat-track

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🔬 How It Works

Satellites are tracked using **Two-Line Element (TLE)** data from CelesTrak. The app uses the **SGP4 propagation algorithm** to calculate real-time positions, transforming coordinates from:

1. **ECI (Earth-Centered Inertial)** — Reference frame that doesn't rotate with Earth
2. **ECF (Earth-Centered Fixed)** — Rotates with Earth
3. **Geodetic** — Latitude, longitude, altitude

This allows accurate positioning of satellites on the 3D globe.

## 📸 Screenshots

*Coming soon*

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## 📝 License

MIT License

## 👤 Author

**Selig209**

- GitHub: [@Selig209](https://github.com/Selig209)

---

⭐ Star this repo if you find it useful!
