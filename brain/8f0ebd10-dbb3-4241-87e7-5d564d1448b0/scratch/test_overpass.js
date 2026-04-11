const axios = require('axios');

async function testOverpass() {
  const minLat = 6.8;
  const minLon = 79.7;
  const maxLat = 7.1;
  const maxLon = 80.0;

  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="community_centre"](${minLat},${minLon},${maxLat},${maxLon});
      way["amenity"="community_centre"](${minLat},${minLon},${maxLat},${maxLon});
      relation["amenity"="community_centre"](${minLat},${minLon},${maxLat},${maxLon});
    );
    out center;
  `;

  try {
    const response = await axios.post(
      "https://overpass-api.de/api/interpreter",
      query,
      {
        headers: { "Content-Type": "text/plain" },
        timeout: 20000
      }
    );
    console.log("Success! Found:", response.data.elements.length, "elements");
    if (response.data.elements.length > 0) {
        console.log("First element name:", response.data.elements[0].tags.name);
    }
  } catch (error) {
    console.error("Failed:", error.message);
  }
}

testOverpass();
