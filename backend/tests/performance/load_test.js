const autocannon = require('autocannon');

async function runLoadTest() {
  const result = await autocannon({
    url: 'http://localhost:5000/api/facilities',
    connections: 10, // default
    pipelining: 1, // default
    duration: 10 // seconds
  });

  console.log('--- Performance Test Results for GET /api/facilities ---');
  console.log(`URL: ${result.url}`);
  console.log(`Total Requests: ${result.requests.total}`);
  console.log(`Average Latency: ${result.latency.average} ms`);
  console.log(`Requests/sec: ${result.requests.average}`);
  console.log(`Errors: ${result.errors}`);
  console.log('-------------------------------------------------------');
}

if (require.main === module) {
  runLoadTest();
}

module.exports = runLoadTest;
