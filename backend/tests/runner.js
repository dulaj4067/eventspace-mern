const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const requiredDeps = [
    'jest',
    'supertest',
    'mongodb-memory-server',
    'autocannon'
];

function checkDeps() {
    console.log('🔍 Checking testing dependencies...');
    const missing = [];
    for (const dep of requiredDeps) {
        try {
            require.resolve(dep);
        } catch (e) {
            missing.push(dep);
        }
    }
    return missing;
}

function installDeps(missing) {
    if (missing.length === 0) return;
    console.log(`📦 Installing missing dependencies: ${missing.join(', ')}...`);
    console.log('⚠️ Using --no-save to keep package.json clean.');
    try {
        execSync(`npm install ${missing.join(' ')} --no-save`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    } catch (e) {
        console.error('❌ Failed to install dependencies. Please run:');
        console.error(`npm install ${missing.join(' ')} --no-save`);
        process.exit(1);
    }
}

function runTests() {
    console.log('\n🚀 Starting Test Suite...\n');

    try {
        console.log('--- 🧪 Running Unit & Integration Tests (Jest) ---');
        execSync('npx jest --config tests/jest.config.js --verbose', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
        
        console.log('\n--- ⚡ Running Performance Tests (Autocannon) ---');
        // Note: Performance test requires the server to be running. 
        // We'll try to run it, but inform the user if it fails due to server being off.
        try {
            require('./performance/load_test');
            execSync('node tests/performance/load_test.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
        } catch (e) {
            console.log('⚠️ Performance test skipped or failed. Ensure the server is running on port 5000.');
        }

        console.log('\n✅ All tests completed!');
    } catch (e) {
        console.error('\n❌ Some tests failed.');
        process.exit(1);
    }
}

// Execution flow
const missing = checkDeps();
if (missing.length > 0) {
    installDeps(missing);
}
runTests();
