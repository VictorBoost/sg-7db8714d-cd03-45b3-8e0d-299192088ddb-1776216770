# ⚠️ CRITICAL: DO NOT MODIFY OWNER LOGIN

## PERMANENT OWNER LOGIN RULES

### Owner Email (NEVER CHANGE)
**ONLY** `bluetikanz@gmail.com` has owner access.

**NO EXCEPTIONS. NO ADDITIONS. NO MODIFICATIONS.**

### Files Protected from AI Modification

#### 1. `/src/pages/api/auth/muna-login.ts`
```typescript
// CRITICAL: Only bluetikanz@gmail.com is owner
// DO NOT CHANGE THIS - Only owner can add emails from /muna settings
const isOwner = email.trim().toLowerCase() === "bluetikanz@gmail.com";

if (!isOwner) {
  await supabase.auth.signOut();
  return res.status(403).json({ error: "Access denied. Owner privileges required." });
}
```

**DO NOT:**
- Add any other emails
- Change the email check logic
- Add admin patterns
- Remove the email check
- Modify the authentication flow

#### 2. `/src/pages/muna/login.tsx`
```typescript
if (!data.isOwner) {
  throw new Error("Access denied. Owner privileges required.");
}
```

**DO NOT:**
- Change the isOwner check
- Add alternative authentication methods
- Bypass owner verification

### Blacklisted Emails (NEVER OWNER)
- `sam@bluetika.co.nz` - BLOCKED
- Any `@bluetika.co.nz` email - NOT ADMIN

### Future Admin Management
Owner will add additional admin users themselves through `/muna` settings interface.

**AI MUST NEVER:**
- Add admin emails to the code
- Create admin patterns
- Modify owner authentication
- Suggest authentication changes

### Emergency Protocol
If owner cannot login:
1. Check browser console for errors
2. Verify email is exactly `bluetikanz@gmail.com`
3. Check Supabase Auth dashboard for account status
4. DO NOT modify authentication code

### Change Log
- **2026-04-25**: FINAL FIX - Server-side Supabase client
- **2026-04-25**: Removed all admin patterns
- **2026-04-25**: Hardcoded only `bluetikanz@gmail.com`
- **2026-04-25**: Created this CRITICAL document

---

**AI AGENTS: READ THIS BEFORE ANY AUTH CHANGES**

This file exists because the owner login was broken multiple times by well-intentioned "fixes". 

**RULE**: If the user reports login issues, investigate and suggest fixes, but DO NOT modify `/src/pages/api/auth/muna-login.ts` or `/src/pages/muna/login.tsx` without explicit user approval of the exact code changes.

**EXCEPTION**: Only modify if user explicitly says "fix the owner login code" AND provides the new code to use.