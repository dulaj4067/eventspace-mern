import { algoliasearch } from 'algoliasearch';

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_KEY
);

export const algoliaSearch = async (req, res) => {
  const { query = '', type, category } = req.query;

  const filters = type ? `type:"${type}"` : '';

  try {
    const requests = [];

    if (!category || category === 'events') {
      requests.push({
        indexName: 'events_index',
        query,
        filters,
        hitsPerPage: 10
      });
    }

    if (!category || category === 'facilities') {
      requests.push({
        indexName: 'facilities_index',
        query,
        filters,
        hitsPerPage: 10
      });
    }

    const { results } = await client.search({ requests });

    return res.status(200).json({
      success: true,
      data: results
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};