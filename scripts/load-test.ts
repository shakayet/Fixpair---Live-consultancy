import axios from 'axios';

/**
 * FixPair Advanced Load Test Script
 * Supports multiple endpoints and high concurrency.
 */

const BASE_URL = 'http://10.10.7.106:5000/api/v1';
const ROOT_URL = 'http://10.10.7.106:5000';

interface TestScenario {
  name: string;
  endpoint: string;
  useRoot?: boolean;
  method: 'GET' | 'POST';
  body?: any;
  headers?: any;
}

const SCENARIOS: TestScenario[] = [
  { name: 'Root/Health', endpoint: '/', useRoot: true, method: 'GET' },
  { name: 'FAQ List', endpoint: '/faq', method: 'GET' },
  { name: 'Terms', endpoint: '/terms', method: 'GET' },
  { name: 'Recent Reviews', endpoint: '/review/recent', method: 'GET' },
  {
    name: 'Recommended Consultants',
    endpoint: '/recommendation/recommended',
    method: 'GET',
  },
];

async function runScenario(
  scenario: TestScenario,
  total: number,
  concurrency: number,
) {
  const url = scenario.useRoot
    ? `${ROOT_URL}${scenario.endpoint}`
    : `${BASE_URL}${scenario.endpoint}`;
  console.log(`\n--- Scenario: ${scenario.name} ---`);
  console.log(`Endpoint: ${url}`);
  console.log(`Total: ${total}, Concurrency: ${concurrency}`);

  const latencies: number[] = [];
  let successCount = 0;
  let errorCount = 0;
  let completed = 0;
  const startTime = Date.now();

  const executeRequest = async () => {
    const start = Date.now();
    try {
      if (scenario.method === 'GET') {
        await axios.get(`${BASE_URL}${scenario.endpoint}`, {
          headers: scenario.headers,
        });
      } else {
        await axios.post(`${BASE_URL}${scenario.endpoint}`, scenario.body, {
          headers: scenario.headers,
        });
      }
      latencies.push(Date.now() - start);
      successCount++;
    } catch (error: any) {
      errorCount++;
    } finally {
      completed++;
    }
  };

  const batches = Math.ceil(total / concurrency);
  for (let i = 0; i < batches; i++) {
    const currentBatchSize = Math.min(concurrency, total - i * concurrency);
    const promises = Array.from({ length: currentBatchSize }, executeRequest);
    await Promise.all(promises);
    process.stdout.write(
      `\rProgress: ${Math.round((completed / total) * 100)}% (${completed}/${total})`,
    );
  }

  const totalTime = (Date.now() - startTime) / 1000;
  const avgLatency =
    latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const p50 =
    sortedLatencies.length > 0
      ? sortedLatencies[Math.floor(sortedLatencies.length * 0.5)]
      : 0;
  const p90 =
    sortedLatencies.length > 0
      ? sortedLatencies[Math.floor(sortedLatencies.length * 0.9)]
      : 0;
  const p95 =
    sortedLatencies.length > 0
      ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)]
      : 0;
  const p99 =
    sortedLatencies.length > 0
      ? sortedLatencies[Math.floor(sortedLatencies.length * 0.99)]
      : 0;

  console.log(`\n\n--- Results for ${scenario.name} ---`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed:  ${errorCount}`);
  console.log(`⏱️ Total Time: ${totalTime.toFixed(2)}s`);
  console.log(`⚡ Requests/sec: ${(total / totalTime).toFixed(2)}`);
  console.log(`📉 Avg Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`📊 P50 Latency: ${p50.toFixed(2)}ms`);
  console.log(`📊 P90 Latency: ${p90.toFixed(2)}ms`);
  console.log(`📊 P95 Latency: ${p95.toFixed(2)}ms`);
  console.log(`📊 P99 Latency: ${p99.toFixed(2)}ms`);
  console.log('---------------------------------\n');
}

async function start() {
  const args = process.argv.slice(2);
  const total = parseInt(args[0]) || 1000;
  const concurrency = parseInt(args[1]) || 50;

  console.log('🚀 Starting Advanced Load Test');
  console.log(`Environment: ${total} requests, ${concurrency} concurrency\n`);

  for (const scenario of SCENARIOS) {
    await runScenario(scenario, total, concurrency);
  }

  console.log('\n🌟 All Scenarios Completed');
}

start().catch(console.error);
