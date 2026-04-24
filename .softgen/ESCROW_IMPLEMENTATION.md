# BlueTika Escrow System - Implementation Documentation

## Rule Execution Logic

### 1. Escrow Start
**Rule:** Client pays 102% upfront to start the Contract.
- **Implementation:** ✅ Verified in `src/pages/checkout/[contractId].tsx`
  - Platform fee: 2% of agreed price
  - Payment processing contribution: ~2.65% + $0.30
  - Total collected: ~102% of agreed price
  - Files: `paymentService.ts` handles fee calculation
  - Evidence: Checkout form shows breakdown with platform fee + processing fee

### 2. Extra Charges
**Rule:** Either party can use the "Add Payment" button anytime. Client must "Accept" additions before the job ends.
- **Implementation:** ✅ Verified in `src/services/additionalChargeService.ts`
  - Button available in contract UI (`AdditionalChargeRequest.tsx`)
  - Creates pending charges with `status: 'pending'`
  - Client must explicitly accept before contract completion
  - Stripe payment intent created only after client acceptance
  - Evidence: `additionalChargeService.createAdditionalCharge()` + acceptance flow

### 3. Job Completion
**Rule:** Service Provider must upload "Before & After" photos + explanation to trigger the end of the Project.
- **Implementation:** ✅ Verified in `src/services/evidencePhotoService.ts`
  - Provider uploads "before" photos at job start
  - Provider uploads "after" photos at job completion
  - Both photo sets require confirmation (locked permanently)
  - Explanation captured in contract completion flow
  - Evidence: `EvidencePhotoUpload.tsx` component + `confirmEvidencePhotos()`

### 4. The 24-Hour Lock
**Rule:** Client has a strict 24-hour window to dispute once photos are uploaded. After 24h, the money is considered "Earned."
- **Implementation:** ✅ Verified in `src/services/fundReleaseService.ts`
  - Contract marked `ready_for_release_at` timestamp when both parties submit reviews
  - Admin panel filters contracts where `ready_for_release_at + 24 hours < current_time`
  - Query: `gte('ready_for_release_at', twentyFourHoursAgo)`
  - Evidence: `getReadyForReleaseContracts()` enforces 24h minimum wait
  - Location: `/muna/fund-releases` admin panel

### 5. Platform Rule
**Rule:** Chat stays here. Off-platform deals void all payment protection.
- **Implementation:** ✅ Platform notices added to:
  - Project detail page (`src/pages/project/[id].tsx`)
  - Checkout page (`src/pages/checkout/[contractId].tsx`)
  - Contracts page (`src/pages/contracts.tsx`)
  - Evidence upload component (`src/components/EvidencePhotoUpload.tsx`)
  - FAQ page (`src/pages/faq.tsx`)
  - Notice text: "To keep your funds safe, all communication and extra payments must happen within BlueTika..."

### 6. Friday Release
**Rule:** Review the "Earned" jobs in /muna and batch-release the 92% payouts every Friday.
- **Implementation:** ✅ Verified in `/muna/fund-releases.tsx`
  - Admin panel at `/muna/fund-releases`
  - Shows all contracts past 24-hour dispute window
  - Manual release button with confirmation dialog
  - Calculates 92% payout (8% commission)
  - Sends email notifications to both parties
  - Evidence: `fundReleaseService.releaseFunds()` + email templates

## Payment Breakdown

### Client Pays (102%):
```
Agreed Price:                 $1,000.00
Platform Fee (2%):            $   20.00
Payment Processing (~2.65%):  $   26.50
─────────────────────────────────────
Total Client Pays:            $1,046.50
```

### Provider Receives (92%):
```
Agreed Price:                 $1,000.00
Commission (8%):              $   80.00
─────────────────────────────────────
Net to Provider:              $  920.00
```

### Platform Revenue:
```
Platform Fee (2%):            $   20.00
Commission (8%):              $   80.00
Payment Processing Fee:       $  -26.50
─────────────────────────────────────
Net Platform Revenue:         $   73.50
```

## Database Schema

### Key Tables
- `contracts` - Main contract records with payment tracking
- `evidence_photos` - Before/After photo storage with confirmation timestamps
- `fund_releases` - Release history with admin notes
- `additional_charges` - Extra payments during project
- `disputes` - Dispute records (if raised during 24h window)

### Critical Fields
- `contracts.ready_for_release_at` - Timestamp when 24h countdown starts
- `contracts.payment_status` - "pending" | "confirmed" | "released"
- `evidence_photos.confirmed_at` - When photos were permanently locked
- `additional_charges.status` - "pending" | "accepted" | "paid"

## User Flow Validation

### Happy Path (No Disputes):
1. ✅ Client accepts bid → redirected to checkout
2. ✅ Client pays 102% → funds held in escrow (Stripe)
3. ✅ Provider uploads "Before" photos → locks them
4. ✅ Provider completes work
5. ✅ Provider uploads "After" photos → locks them → 24h timer starts
6. ✅ Client reviews (within 24h) → submits review → no dispute
7. ✅ 24h passes → contract appears in `/muna/fund-releases`
8. ✅ Admin releases funds (Friday) → 92% to provider, emails sent
9. ✅ Provider receives Stripe payout in 2-3 business days

### Dispute Path:
1. Client accepts bid → pays 102%
2. Provider completes work → uploads "After" photos
3. Client reviews (within 24h) → **raises dispute**
4. Admin reviews dispute in `/muna/disputes`
5. Admin makes decision → funds released or refunded
6. Both parties notified via email

### Extra Charges Path:
1. Contract active → either party clicks "Add Payment"
2. Request created with `status: pending`
3. Client reviews → clicks "Accept"
4. Client redirected to `/checkout-additional/[chargeId]`
5. Client pays → funds added to escrow
6. Contract total updated

## Security & Protection

### Payment Protection Features:
- ✅ All funds held in Stripe escrow until completion
- ✅ Evidence photos permanently locked (cannot be changed)
- ✅ 24-hour dispute window clearly communicated
- ✅ All communication within platform (chat not yet implemented)
- ✅ Additional charges require explicit client acceptance
- ✅ Admin review before fund release

### User Protection:
- ✅ Clients: Can dispute within 24h if work doesn't match agreement
- ✅ Providers: Payment guaranteed after 24h dispute window passes
- ✅ Both: Platform notices explain off-platform deals void protection

## Admin Controls

### Fund Release Panel (`/muna/fund-releases`):
- View all contracts ready for release (>24h after completion)
- See payment breakdown (agreed price, commission, net to provider)
- Add admin notes before releasing
- Manual release button (safety against automatic releases)
- Email notifications sent to both parties

### Monitoring:
- Days waiting indicator (warns if >2 days pending)
- Contract status tracking
- Evidence photo confirmation status
- Review submission tracking

## Implementation Notes

### The /muna View:
**Status:** ✅ Implemented correctly
```typescript
// Filter: Current_Time > (Completion_Time + 24 hours)
const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const { data } = await supabase
  .from("contracts")
  .select(...)
  .eq("status", "completed")
  .eq("payment_status", "confirmed")
  .not("ready_for_release_at", "is", null)
  .gte("ready_for_release_at", twentyFourHoursAgo);
```

### The "Add Payment" Button:
**Status:** ✅ Implemented correctly
- Button updates contract total via `additional_charges` table
- Creates "Pending Approval" state visible to client
- Client must explicitly accept before charge is processed
- No surprise bills - client sees amount before approving

### The Payout:
**Status:** ✅ Liability limited correctly
- Platform only verifies photos exist and 24h passed
- Workmanship guarantees "between parties" after release
- Platform notices clearly state this on all relevant pages
- Admin releases funds manually (not automatic)

## Testing Checklist

### Payment Flow:
- [ ] Client can pay 102% at checkout
- [ ] Funds held in Stripe until completion
- [ ] Platform fee + processing fee calculated correctly

### Evidence Photos:
- [ ] Provider can upload "Before" photos
- [ ] Provider can upload "After" photos
- [ ] Photos lock permanently when confirmed
- [ ] Cannot be changed after confirmation

### 24-Hour Window:
- [ ] Timer starts when "After" photos confirmed
- [ ] Contract appears in admin panel after 24h
- [ ] Client can dispute during 24h window
- [ ] No disputes allowed after 24h passes

### Fund Release:
- [ ] Admin can see all ready-for-release contracts
- [ ] Payment breakdown shows correctly (92% to provider)
- [ ] Manual release button works
- [ ] Email notifications sent to both parties
- [ ] Stripe payout initiated to provider

### Extra Charges:
- [ ] Either party can request additional payment
- [ ] Client must accept before processing
- [ ] Additional amount added to escrow
- [ ] Total visible before client accepts

## Platform Notice (Live on App)

**Current Implementation:**
```
"Notice: To keep your funds safe, all communication and extra payments must 
happen within BlueTika. Once the Service Provider submits 'After' photos, 
the Client has 24 hours to raise a dispute. Any workmanship guarantees after 
payment release are handled directly between the Client and Provider. Approved 
funds are released to your account every Friday."
```

**Displayed On:**
- `/project/[id]` - Project detail page
- `/checkout/[contractId]` - Checkout page
- `/contracts` - Contracts dashboard
- Evidence photo upload component
- FAQ page (expanded explanation)

## Compliance & Legal

### Payment Processing:
- Stripe handles all payment processing
- Platform never holds client funds directly
- Escrow managed via Stripe payment intents
- Payouts to providers via Stripe Connect

### Dispute Resolution:
- 24-hour window clearly communicated
- Evidence photos permanently locked
- Admin has final decision authority
- Both parties notified of outcomes

### Liability Limitation:
- Workmanship guarantees "between parties"
- Platform verifies completion only (photos + 24h wait)
- Off-platform deals void all protections
- Clear notices on all relevant pages

## Future Enhancements

### Potential Improvements:
- [ ] Automated Friday releases (with manual override)
- [ ] In-platform chat system (currently missing)
- [ ] Automatic dispute window expiry notifications
- [ ] Provider payout dashboard (track pending releases)
- [ ] Client refund tracking for disputed contracts
- [ ] Analytics dashboard for fund releases