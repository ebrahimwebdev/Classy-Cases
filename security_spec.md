# Firestore Security Specification

## Data Invariants
1. Public visitors can only read active `heroVideos` (`resource.data.active == true`), active `categories` (`resource.data.active == true`), and the `heroConfig/default` document; inactive drafts and `admins` records are restricted to verified admins.
2. Only verified store administrators (`request.auth != null && request.auth.token.email_verified == true`) whose UID is in `/admins/{uid}` or whose verified email matches a bootstrapped store owner (`ibrahimzadran.info@gmail.com`, `mdebrahim.contact@gmail.com`, or `official.fashionlife@gmail.com`) may create, update, or delete `heroVideos`, `heroConfig`, or `categories`.
3. Every write must satisfy strict key checks (`hasAll` + `hasOnly`), type/length bounds matching `firebase-blueprint.json`, safe media URL schemes (`https://`, `/assets/`, `/src/assets/`, `/media/`, or verified image data URI for categories — never `javascript:` or SVG), immutable `createdAt`, and server-enforced `request.time` timestamps and `updatedByUid == request.auth.uid`.
4. Sub-categories (`parentId != ""`) cannot reference themselves (`parentId != categoryId`), must use a valid ID format, and must point to an existing parent category (`existsAfter` in `/categories/{parentId}`) to prevent orphaned or cyclic sub-categories.
5. Unauthenticated users or non-admin signed-in users cannot escalate privileges by writing `/admins/{uid}`.
6. Customer profiles under `/users/{userId}` contain private PII (name, email, phone, saved delivery addresses, account status) and are strictly isolated to the owning authenticated user (`isOwner(userId)`) or verified store administrators (`isAdmin()` for single-doc reads/status updates and `isVerifiedAdminToken()` for admin directory listing). Collection `list` is denied to non-admins; non-admins can never modify `status` or `deactivatedAt`, cannot edit profiles or create orders while `status == 'deactivated'`, and are bounded to at most 10 saved delivery addresses with immutable `uid`/`createdAt` and server-enforced `request.time` timestamps.
7. Customer orders under `/orders/{orderId}` contain PII (`customerName`, `customerPhone`, `customerEmail`, `deliveryAddress`) and financial/fulfillment states. Single-document `get` is strictly limited to `isAdmin() || isOwner(existing().userId)` and collection `list` strictly enforces `isVerifiedAdminToken() || (isSignedIn() && existing().userId == request.auth.uid)`. Customers may only create orders owned by themselves (`userId == request.auth.uid`) in initial non-completed states (`fulfillmentStatus in ['pending', 'confirmed']`) when their account is active, and may never update or delete orders; only verified admins can transition fulfillment, payment, or courier tracking fields with `id`, `userId`, and `createdAt` locked immutable.

## Dirty Dozen Adversarial Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated `create` on `/heroVideos/slide-1`, `/categories/cat-sub`, or `/orders/ord-1`
2. Non-admin verified user `create` on `/categories/cat-sub`, `update` on `/orders/ord-1` (status escalation to `delivered` or `paid`), or `update` on `/users/{uid}` changing `status` from `deactivated` to `active`
3. Admin email with `email_verified: false` attempting `create` on `/categories/cat-sub`, `list` on `/users`, or `list` on `/orders`
4. Shadow field injection (`isVerified: true` or `role: "admin"`) on `/heroVideos/slide-1`, `/categories/cat-sub`, `/users/{uid}`, or `/orders/ord-1`
5. Malicious `videoSrc: "javascript:alert(1)"`, `image: "data:image/svg+xml;base64,..."`, or `photoUrl: "javascript:alert(1)"`
6. Oversized `headline` (>140 chars), `name` (>100 chars), `address` (>300 chars), >10 saved `addresses` on `/users/{uid}`, or unbounded `items` list (>50 entries) on `/orders/ord-1`
7. Forged `updatedByUid` != `request.auth.uid` on `/categories/cat-sub`, mismatched `uid` != `userId` on `/users/{uid}`, or forged `userId` != `request.auth.uid` on `/orders/ord-1`
8. Client-forged `createdAt` or `updatedAt` != `request.time` on any collection including `/orders/{orderId}` and `/users/{uid}`
9. Self-referential or orphaned sub-category (`parentId == categoryId` or nonexistent `parentId`) on `/categories/cat-sub`, or deactivated customer creating `/orders/ord-1` or `/users/{uid}` with `status: "deactivated"`
10. Modifying immutable `createdAt` (or `userId` / `id` on `/orders/{orderId}`) during `update`
11. Unauthenticated or non-admin `list` of inactive drafts (`active == false`), `/users`, cross-user `get` on `/users/{otherUid}` or `/orders/{otherOrderId}`, or blanket `list` on `/orders` without `userId == request.auth.uid`
12. Non-admin `create`/`get` on `/admins/{uid}` or any `delete` on `/users/{uid}` or `/orders/{orderId}`

