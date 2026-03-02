const algoliasearch = require('algoliasearch');
const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_KEY);

exports.algoliaSearch = async (req, res) => {
  const { query, type, category } = req.query;

  // Build the filter string (e.g., "type:Workshop")
  const filters = type ? `type:"${type}"` : '';

  try {
    const queries = [];

    // Search Events if requested or if searching everything
    if (!category || category === 'events') {
      queries.push({
        indexName: 'events_index',
        query: query,
        params: { filters: filters, hitsPerPage: 10 }
      });
    }

    // Search Facilities if requested or if searching everything
    if (!category || category === 'facilities') {
      queries.push({
        indexName: 'facilities_index',
        query: query,
        params: { filters: filters, hitsPerPage: 10 }
      });
    }

    const { results } = await client.multipleQueries(queries);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};