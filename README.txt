LOOPLY — DEALS + VERIFIED TRANSACTION REVIEWS (FRONTEND DEMO)

INSTALL
1. Copy deals/ into the Looply project root.
2. Open Dashboard > Deals (existing js/navigation.js already maps deals to deals/deals.html).
3. Keep the current company/company.js, quotes/quote-requests.js, orders/orders.js, shared files, and messages files.

HOW IT WORKS
- Deals are DERIVED from existing data, not duplicated:
  * looply_purchase_orders with status confirmed/completed
  * looply_quote_requests (or configured QUOTE_REQUESTS key) with status accepted/completed
- The seller can mark an in-progress deal completed.
- After completion, the buyer can leave one 1–5 star review per deal.
- Reviews are saved to looply_company_reviews, already used by the public company/company.js page.
- Company profile, listing, and message links are included.

TEST
1. With two company accounts in the SAME browser storage, confirm a direct purchase request in Purchase Orders, or accept a supplier quotation in Quote Requests.
2. Open Deals from either account; the deal should show In progress.
3. Sign in as seller, mark it Completed.
4. Sign in as buyer, open Deals, submit a review.
5. Open seller public company profile; the review and average rating should appear.

IMPORTANT LIMITATIONS
- No real payments, fulfillment verification, inventory reservation, or real-time cross-device messaging.
- Completing a quote deal does NOT deduct inventory: the quote acceptance flow currently does not reserve/commit stock.
- This frontend demo stores data locally. A backend with server-side authorization and transaction locks is required before production use. A seller can mark a deal completed without buyer confirmation in this demo.
- If company public profile uses a different review storage schema, keep its current expected key 'looply_company_reviews'.
