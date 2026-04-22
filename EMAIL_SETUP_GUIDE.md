# Email Configuration Guide

## Current Status
- ❌ Emails are currently **NOT WORKING** due to AWS Lambda 403 error
- SES Lambda endpoint: `https://eaxewbojkxomhp2xrhgddnfkrq0ivwbn.lambda-url.ap-southeast-2.on.aws/`
- Error: `AccessDeniedException` - Lambda is rejecting public requests

## Affected Features
1. Welcome email after registration
2. Password reset emails
3. Email verification (if enabled in Supabase)
4. Receipt emails after payment
5. Contract notification emails

## How to Fix

### Option 1: Configure Lambda Resource Policy (Recommended)
1. Go to AWS Lambda Console: https://ap-southeast-2.console.aws.amazon.com/lambda
2. Find your SES email Lambda function
3. Go to "Configuration" → "Permissions"
4. Under "Resource-based policy statements", click "Add permissions"
5. Choose:
   - **Statement ID**: `AllowPublicAccess`
   - **Principal**: `*`
   - **Action**: `lambda:InvokeFunctionUrl`
   - **Function URL auth type**: `NONE`
6. Save

### Option 2: Add API Key Authentication
If you want to keep Lambda secure, add API key authentication:

1. In Lambda, add environment variable: `API_KEY=your-secret-key-here`
2. Update Lambda code to check for `x-api-key` header
3. Update `.env.local` to include:
   ```
   NEXT_PUBLIC_SES_API_KEY=your-secret-key-here
   ```
4. Update `src/services/sesEmailService.ts` to send API key in headers:
   ```typescript
   headers: {
     "Content-Type": "application/json",
     "x-api-key": process.env.NEXT_PUBLIC_SES_API_KEY || ""
   }
   ```

### Option 3: Use Supabase Auth Emails (Temporary)
For password reset and verification, you can rely on Supabase's built-in auth emails:
1. Configure email templates in Supabase Dashboard
2. Supabase will send password reset emails automatically
3. Welcome emails won't be sent (non-critical)

## Testing Email After Fix

```bash
node -e "
const https = require('https');

const postData = JSON.stringify({
  from: 'noreply@bluetika.co.nz',
  to: 'your-email@example.com',
  subject: 'Test Email',
  htmlBody: '<h1>Test from BlueTika</h1>',
  textBody: 'Test from BlueTika'
});

const url = new URL('https://eaxewbojkxomhp2xrhgddnfkrq0ivwbn.lambda-url.ap-southeast-2.on.aws/');

const options = {
  hostname: url.hostname,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
};

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log('Response:', body));
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(postData);
req.end();
"
```

Expected output after fix:
```
Status: 200
Response: {"message":"Email sent successfully"}
```

## Current Workaround
The app works without emails - users just won't receive:
- Welcome message after registration
- Password reset links (can use Google OAuth instead)
- Email notifications

All core functionality (login, registration, posting projects, bidding) works without email.