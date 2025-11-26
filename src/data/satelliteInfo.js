// Expanded satellite information database
// Includes LEO (Low Earth Orbit), MEO (Medium Earth Orbit), and GEO (Geostationary) satellites

export const satelliteInfo = {
    // SPACE STATIONS
    'ISS (ZARYA)': {
        owner: 'International (NASA, Roscosmos, ESA, JAXA, CSA)',
        launchDate: '1998-11-20',
        launchSite: 'Baikonur Cosmodrome, Kazakhstan',
        purpose: 'Space Station / Scientific Research',
        status: 'Active',
        orbitType: 'LEO',
        description: 'The International Space Station is a modular space station in low Earth orbit. It serves as a microgravity and space environment research laboratory.'
    },

    'TIANGONG': {
        owner: 'China (CMSA)',
        launchDate: '2021-04-29',
        launchSite: 'Wenchang Space Launch Site, China',
        purpose: 'Modular Space Station',
        status: 'Active',
        orbitType: 'LEO',
        description: 'Tiangong (“Heavenly Palace”) is China’s continuously crewed modular station supporting long-duration science missions.'
    },

    // EARTH OBSERVATION / SCIENCE
    'HST': {
        owner: 'NASA / ESA',
        launchDate: '1990-04-24',
        launchSite: 'Kennedy Space Center, Florida',
        purpose: 'Space Telescope',
        status: 'Active',
        orbitType: 'LEO',
        description: 'The Hubble Space Telescope has revolutionized astronomy by providing deep views into space, capturing images of distant galaxies, nebulae, and stellar phenomena.'
    },

    'TERRA': {
        owner: 'NASA',
        launchDate: '1999-12-18',
        launchSite: 'Vandenberg AFB, California',
        purpose: 'Earth Observation',
        status: 'Active',
        orbitType: 'LEO',
        description: 'Terra satellite monitors Earth\'s environment and climate, studying clouds, water vapor, and surface temperature.'
    },

    'AQUA': {
        owner: 'NASA',
        launchDate: '2002-05-04',
        launchSite: 'Vandenberg AFB, California',
        purpose: 'Earth Observation / Water Cycle',
        status: 'Active',
        orbitType: 'LEO',
        description: 'Aqua collects data on Earth\'s water cycle, including evaporation, precipitation, and ice coverage.'
    },

    // WEATHER SATELLITES
    'NOAA 19': {
        owner: 'USA (NOAA)',
        launchDate: '2009-02-06',
        launchSite: 'Vandenberg AFB, California',
        purpose: 'Weather Satellite',
        status: 'Active',
        orbitType: 'LEO',
        description: 'NOAA-19 is part of the polar-orbiting satellite series providing global weather monitoring and climate data.'
    },

    'NOAA 20': {
        owner: 'USA (NOAA)',
        launchDate: '2017-11-18',
        launchSite: 'Vandenberg AFB, California',
        purpose: 'Weather Satellite',
        status: 'Active',
        orbitType: 'LEO',
        description: 'Joint Polar Satellite System satellite providing high-resolution imagery for weather forecasting.'
    },

    'NOAA': {
        owner: 'USA (NOAA)',
        launchDate: 'Various (1970-Present)',
        launchSite: 'Vandenberg Space Force Base, California',
        purpose: 'Polar-orbiting Weather Monitoring',
        status: 'Active',
        orbitType: 'LEO',
        description: 'NOAA’s polar satellite series delivers global cloud imagery, atmospheric profiles, and environmental monitoring crucial for forecasts over West Africa and beyond.'
    },

    'METOP-B': {
        owner: 'EUMETSAT / ESA',
        launchDate: '2012-09-17',
        launchSite: 'Baikonur Cosmodrome, Kazakhstan',
        purpose: 'Weather Satellite',
        status: 'Active',
        orbitType: 'LEO',
        description: 'European polar-orbiting meteorological satellite providing critical weather and climate data.'
    },

    'METOP': {
        owner: 'EUMETSAT / ESA',
        launchDate: 'Various (2006-Present)',
        launchSite: 'Baikonur Cosmodrome, Kazakhstan',
        purpose: 'Polar Weather Satellite',
        status: 'Active',
        orbitType: 'LEO',
        description: 'The MetOp series forms Europe’s contribution to the global polar meteorological system, measuring temperature, humidity, and atmospheric chemistry.'
    },

    'GOES 16': {
        owner: 'USA (NOAA)',
        launchDate: '2016-11-19',
        launchSite: 'Cape Canaveral, Florida',
        purpose: 'Geostationary Weather Satellite',
        status: 'Active',
        orbitType: 'GEO',
        description: 'Geostationary satellite monitoring weather over the Americas, providing continuous imagery of weather systems.'
    },

    'GOES': {
        owner: 'USA (NOAA)',
        launchDate: 'Various (1975-Present)',
        launchSite: 'Cape Canaveral, Florida',
        purpose: 'Geostationary Weather Satellite',
        status: 'Active',
        orbitType: 'GEO',
        description: 'The GOES constellation provides constant full-disk imagery of the Western Hemisphere for severe-storm monitoring, lightning mapping, and space weather.'
    },

    // COMMUNICATIONS (LEO)
    'STARLINK': {
        owner: 'SpaceX (USA)',
        launchDate: 'Various (2019-Present)',
        launchSite: 'Multiple (Cape Canaveral, Vandenberg)',
        purpose: ' Satellite Internet Constellation',
        status: 'Active',
        orbitType: 'LEO',
        description: 'Starlink is a satellite internet constellation providing high-speed internet access globally with over 5,000 satellites in LEO.'
    },

    'IRIDIUM': {
        owner: 'Iridium Communications (USA)',
        launchDate: 'Various (1997-Present)',
        launchSite: 'Vandenberg AFB, California',
        purpose: 'Global Satellite Communications',
        status: 'Active',
        orbitType: 'LEO',
        description: 'Iridium provides global voice and data communications through a constellation of 66 cross-linked satellites.'
    },

    'ONEWEB': {
        owner: 'OneWeb (UK / International)',
        launchDate: 'Various (2019-Present)',
        launchSite: 'Baikonur, Vostochny, Cape Canaveral',
        purpose: 'Broadband Internet Constellation',
        status: 'Active',
        orbitType: 'LEO',
        description: 'OneWeb operates hundreds of LEO spacecraft delivering low-latency broadband connectivity to governments, aviation, maritime, and remote communities.'
    },

    // NAVIGATION (MEO)
    'GPS': {
        owner: 'USA (US Space Force)',
        launchDate: 'Various (1978-Present)',
        launchSite: 'Cape Canaveral, Florida',
        purpose: 'Global Positioning System',
        status: 'Active',
        orbitType: 'MEO',
        description: 'GPS constellation of 31 satellites providing global positioning, navigation, and timing services.'
    },

    'GALILEO': {
        owner: 'European Union / ESA',
        launchDate: 'Various (2011-Present)',
        launchSite: 'Kourou, French Guiana',
        purpose: 'Global Navigation Satellite System',
        status: 'Active',
        orbitType: 'MEO',
        description: 'European global navigation satellite system providing positioning and timing information.'
    },

    'GLONASS': {
        owner: 'Russia',
        launchDate: 'Various (1982-Present)',
        launchSite: 'Plesetsk Cosmodrome, Russia',
        purpose: 'Global Navigation Satellite System',
        status: 'Active',
        orbitType: 'MEO',
        description: 'Russian satellite navigation system providing global positioning coverage.'
    },

    'BEIDOU': {
        owner: 'China (CNSA)',
        launchDate: 'Various (2000-Present)',
        launchSite: 'Xichang Satellite Launch Center, China',
        purpose: 'Navigation Satellite System',
        status: 'Active',
        orbitType: 'MEO / GEO / IGSO',
        description: 'BeiDou provides positioning, navigation, and timing services across Asia-Pacific and globally using a hybrid constellation.'
    },

    // SCIENTIFIC MISSIONS
    'CHANDRA': {
        owner: 'NASA',
        launchDate: '1999-07-23',
        launchSite: 'Kennedy Space Center, Florida',
        purpose: 'X-ray Space Observatory',
        status: 'Active',
        orbitType: 'HEO',
        description: 'Chandra X-ray Observatory studies high-energy regions of the universe including supernova remnants and black holes.'
    },

    'JAMES WEBB': {
        owner: 'NASA / ESA / CSA',
        launchDate: '2021-12-25',
        launchSite: 'Kourou, French Guiana',
        purpose: 'Infrared Space Telescope',
        status: 'Active',
        orbitType: 'L2 Lagrange Point',
        description: 'The most powerful space telescope ever built, observing the universe in infrared wavelengths.'
    },

    // COMMUNICATIONS (GEO)
    'INTELSAT': {
        owner: 'Intelsat (International)',
        launchDate: 'Various (1965-Present)',
        launchSite: 'Multiple locations',
        purpose: 'Geostationary Communications',
        status: 'Active',
        orbitType: 'GEO',
        description: 'Fleet of geostationary satellites providing global telecommunications services.'
    },

    'EUTELSAT': {
        owner: 'Eutelsat (Europe)',
        launchDate: 'Various (1983-Present)',
        launchSite: 'Kourou, French Guiana',
        purpose: 'Geostationary Communications',
        status: 'Active',
        orbitType: 'GEO',
        description: 'European telecommunications satellite operator with satellites over Europe, Africa, and Asia.'
    },

    'COSMOS': {
        owner: 'Russia (Roscosmos)',
        launchDate: 'Various',
        launchSite: 'Baikonur & Plesetsk Cosmodromes',
        purpose: 'Mixed Military / Scientific Missions',
        status: 'Active',
        orbitType: 'LEO / MEO / GEO',
        description: 'The long-running Kosmos (Cosmos) designation covers Russian spacecraft performing communications, navigation, early-warning, and experimental roles.'
    },

    // DECOMMISSIONED NOTABLE SATELLITES
    'SPUTNIK': {
        owner: 'Soviet Union',
        launchDate: '1957-10-04',
        launchSite: 'Baikonur Cosmodrome, Kazakhstan',
        purpose: 'First Artificial Satellite',
        status: 'Decommissioned (1958)',
        orbitType: 'LEO',
        description: 'First artificial satellite launched into Earth orbit, marking the beginning of the Space Age.'
    },

    'KEPLER': {
        owner: 'NASA',
        launchDate: '2009-03-07',
        launchSite: 'Cape Canaveral, Florida',
        purpose: 'Exoplanet Detection',
        status: 'Decommissioned (2018)',
        orbitType: 'Heliocentric',
        description: 'Space telescope mission that discovered over 2,600 exoplanets, revolutionizing our understanding of planetary systems.'
    },

    'GENERIC_ACTIVE': {
        owner: 'Multiple Operators',
        launchDate: 'Unknown',
        launchSite: 'Multiple',
        purpose: 'Active spacecraft tracked by CelesTrak',
        status: 'Active',
        orbitType: 'Varies',
        description: 'This satellite is active in Earth orbit. Public TLE data is available, but detailed mission metadata has not been added to the quick-reference database yet.'
    }
};

// Helper function to get satellite info
export const getInfo = (name) => {
    for (const key in satelliteInfo) {
        if (name.toUpperCase().includes(key.toUpperCase())) {
            return satelliteInfo[key];
        }
    }
    return satelliteInfo.GENERIC_ACTIVE;
};
