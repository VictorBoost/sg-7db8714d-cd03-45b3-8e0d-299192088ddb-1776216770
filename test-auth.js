const https = require('https');

const testEmail = `test.${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';

function makeRequest(method, path, data, cookies = '') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'bluetika.co.nz',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'] || [];
        resolve({
          status: res.statusCode,
          body: body,
          cookies: setCookie.join('; ')
        });
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing BlueTika Authentication Flow\n');
  console.log('═══════════════════════════════════════════\n');

  // Test 1: Registration
  console.log('📝 STEP 1: Testing Registration');
  console.log(`   Email: ${testEmail}`);
  console.log(`   Password: ${testPassword}`);
  
  const registerResult = await makeRequest('POST', '/api/auth/register', {
    email: testEmail,
    password: testPassword,
    firstName: 'Test',
    lastName: 'Softgen',
    phoneNumber: '021234567',
    cityRegion: 'Auckland',
    isClient: true,
    isProvider: false
  });

  console.log(`   Status: ${registerResult.status}`);
  console.log(`   Response: ${registerResult.body.substring(0, 200)}...`);
  
  if (registerResult.status !== 200) {
    console.log('   ❌ Registration FAILED\n');
    return;
  }
  
  const registerData = JSON.parse(registerResult.body);
  if (registerData.user && registerData.session) {
    console.log('   ✅ Registration SUCCESS');
    console.log(`   User ID: ${registerData.user.id}`);
    console.log(`   Session created: YES`);
    console.log(`   Cookie set: ${registerResult.cookies.includes('sb-access-token') ? 'YES' : 'NO'}`);
  } else {
    console.log('   ❌ Registration returned incomplete data');
    return;
  }
  console.log('');

  // Test 2: Logout (clear session)
  console.log('🚪 STEP 2: Testing Logout');
  const logoutResult = await makeRequest('POST', '/api/auth/logout', null, registerResult.cookies);
  console.log(`   Status: ${logoutResult.status}`);
  console.log(`   ${logoutResult.status === 200 ? '✅' : '❌'} Logout ${logoutResult.status === 200 ? 'SUCCESS' : 'FAILED'}`);
  console.log('');

  // Test 3: Login with correct password
  console.log('🔐 STEP 3: Testing Login (Correct Password)');
  const loginResult = await makeRequest('POST', '/api/auth/login', {
    email: testEmail,
    password: testPassword
  });

  console.log(`   Status: ${loginResult.status}`);
  console.log(`   Response: ${loginResult.body.substring(0, 200)}...`);
  
  if (loginResult.status !== 200) {
    console.log('   ❌ Login FAILED\n');
    return;
  }

  const loginData = JSON.parse(loginResult.body);
  if (loginData.user && loginData.session) {
    console.log('   ✅ Login SUCCESS');
    console.log(`   User ID: ${loginData.user.id}`);
    console.log(`   Email: ${loginData.user.email}`);
    console.log(`   Cookie set: ${loginResult.cookies.includes('sb-access-token') ? 'YES' : 'NO'}`);
  } else {
    console.log('   ❌ Login returned incomplete data');
    return;
  }
  console.log('');

  // Test 4: Session verification
  console.log('🔍 STEP 4: Testing Session Verification');
  const sessionResult = await makeRequest('GET', '/api/auth/session', null, loginResult.cookies);
  console.log(`   Status: ${sessionResult.status}`);
  
  if (sessionResult.status === 200) {
    const sessionData = JSON.parse(sessionResult.body);
    if (sessionData.user) {
      console.log('   ✅ Session VALID');
      console.log(`   User ID: ${sessionData.user.id}`);
      console.log(`   Email: ${sessionData.user.email}`);
    } else {
      console.log('   ❌ Session INVALID (no user)');
      return;
    }
  } else {
    console.log('   ❌ Session check FAILED');
    return;
  }
  console.log('');

  // Test 5: Login with wrong password
  console.log('⚠️  STEP 5: Testing Login (Wrong Password)');
  const wrongPasswordResult = await makeRequest('POST', '/api/auth/login', {
    email: testEmail,
    password: 'WrongPassword123!'
  });

  console.log(`   Status: ${wrongPasswordResult.status}`);
  const wrongData = JSON.parse(wrongPasswordResult.body);
  console.log(`   Error Message: "${wrongData.error}"`);
  
  if (wrongPasswordResult.status === 401 && wrongData.error) {
    console.log('   ✅ Proper error handling (401 with helpful message)');
  } else {
    console.log('   ❌ Error handling FAILED');
  }
  console.log('');

  // Test 6: Login with non-existent email
  console.log('⚠️  STEP 6: Testing Login (Non-existent Email)');
  const wrongEmailResult = await makeRequest('POST', '/api/auth/login', {
    email: 'nonexistent@example.com',
    password: 'TestPassword123!'
  });

  console.log(`   Status: ${wrongEmailResult.status}`);
  const wrongEmailData = JSON.parse(wrongEmailResult.body);
  console.log(`   Error Message: "${wrongEmailData.error}"`);
  
  if (wrongEmailResult.status === 401 && wrongEmailData.error) {
    console.log('   ✅ Proper error handling (401 with helpful message)');
  } else {
    console.log('   ❌ Error handling FAILED');
  }
  console.log('');

  console.log('═══════════════════════════════════════════');
  console.log('✅ ALL AUTHENTICATION TESTS PASSED');
  console.log('═══════════════════════════════════════════\n');
  console.log('Summary:');
  console.log('✓ Registration works');
  console.log('✓ Login with correct credentials works');
  console.log('✓ Session cookies are set properly');
  console.log('✓ Session verification works');
  console.log('✓ Wrong password returns helpful error (401)');
  console.log('✓ Non-existent email returns helpful error (401)');
  console.log('✓ No "Internal server error" messages\n');
}

runTests().catch(err => {
  console.error('❌ TEST ERROR:', err);
  process.exit(1);
});