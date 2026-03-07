const axios = require("axios");

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

exports.fetchCommunityCenters = async (minLat, minLon, maxLat, maxLon) => {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="community_centre"](${minLat},${minLon},${maxLat},${maxLon});
      way["amenity"="community_centre"](${minLat},${minLon},${maxLat},${maxLon});
      relation["amenity"="community_centre"](${minLat},${minLon},${maxLat},${maxLon});
    );
    out center;
  `;

  const response = await axios.post(
    OVERPASS_URL,
    query,
    {
      headers: { "Content-Type": "text/plain" },
      timeout: 20000
    }
  );

  return response.data.elements;
};