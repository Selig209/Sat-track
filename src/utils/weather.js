import axios from 'axios';

// Accra, Ghana
const LAT = 5.6037;
const LONG = -0.1870;

export const checkWeather = async (lat, lng) => {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=cloud_cover,visibility`;
        const response = await axios.get(url);
        return response.data.current;
    } catch (error) {
        console.error('Error fetching weather:', error);
        return null;
    }
};
