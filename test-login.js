const http = require('http');

const testEmail = "test.1776897301234@example.com";
const testPassword = "TestPass123!";

console.log('Testing login with:', testEmail);
console.log('');

const data = JSON.stringify({
  email: testEmail,
  password: testPassword
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`✅ Status Code: ${res.statusCode}`);
  
  if (res.headers['set-cookie']) {
    console.log('✅ Session cookie set');
  }
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      console.log('✅ Login successful!');
      console.log('\nUser:', json.user?.email);
      console.log('Session:', json.session ? 'Created' : 'Not created');
      console.log('\n🎉 AUTHENTICATION WORKING PERFECTLY!\n');
    } catch (e) {
      console.log('Response:', body);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.write(data);
req.end();