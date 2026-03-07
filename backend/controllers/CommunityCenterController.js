const { fetchCommunityCenters } = require("../services/CommunityCenterService");

exports.getCommunityCenters = async (req, res) => {
  try {
    const { minLat, minLon, maxLat, maxLon } = req.query;

    // Basic validation
    if (!minLat || !minLon || !maxLat || !maxLon) {
      return res.status(400).json({
        success: false,
        message: "Bounding box coordinates are required"
      });
    }

    const elements = await fetchCommunityCenters(
      parseFloat(minLat),
      parseFloat(minLon),
      parseFloat(maxLat),
      parseFloat(maxLon)
    );

    // Normalize output
    const centers = elements.map(el => ({
      id: el.id,
      name: el.tags?.name || "Unnamed Community Centre",
      latitude: el.lat || el.center?.lat,
      longitude: el.lon || el.center?.lon,
      address: el.tags?.["addr:full"] || null,
      operator: el.tags?.operator || null
    }));

    return res.status(200).json({
      success: true,
      total: centers.length,
      data: centers
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch community centres",
      error: error.message
    });
  }
};