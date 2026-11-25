# Firestore Security Specification

## Data Invariants
1. Public visitors can only read active `heroVideos` (`resource.data.active == true`), active `categories` (`resource.data.active == true`), and the `heroConfig/default` document; inactive drafts and `admins` records are restricted to verified admins.
2. Only verified store administrators (`request.auth != null && request.auth.token.email_verified == true`) whose UID is in `/admins/{uid}` or whose verified email matches a bootstrapped store owner (`ibrahimzadran.info@gmail.com` or `mdebrahim.contact@gmail.com`) may create, update, or delete `heroVideos`, `heroConfig`, or `categories`.
3. Every write must satisfy strict key checks (`hasAll` + `hasOnly`), type/length bounds matching `firebase-blueprint.json`, safe media URL schemes (`https://`, `/assets/`, `/src/assets/`, `/media/`, or verified image data URI for categories — never `javascript:` or SVG), immutable `createdAt`, and server-enforced `request.time` timestamps and `updatedByUid == request.auth.uid`.
4. Sub-categories (`parentId != ""`) cannot reference themselves (`parentId != categoryId`), must use a valid ID format, and must point to an existing parent category (`existsAfter` in `/categories/{parentId}`) to prevent orphaned or cyclic sub-categories.
5. Unauthenticated users or non-admin signed-in users cannot escalate privileges by writing `/admins/{uid}`.

## Dirty Dozen Adversarial Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated `create` on `/heroVideos/slide-1` or `/categories/cat-sub`
2. Non-admin verified user `create` on `/categories/cat-sub`
3. Admin email with `email_verified: false` attempting `create` on `/categories/cat-sub`
4. Shadow field injection (`isVerified: true`) on `/heroVideos/slide-1` or `/categories/cat-sub`
5. Malicious `videoSrc: "javascript:alert(1)"` or `image: "data:image/svg+xml;base64,..."`
6. Oversized `headline` (>140 chars) or `name` (>100 chars)
7. Forged `updatedByUid` != `request.auth.uid` on `/categories/cat-sub`
8. Client-forged `createdAt` or `updatedAt` != `request.time`
9. Self-referential or orphaned sub-category (`parentId == categoryId` or nonexistent `parentId`) on `/categories/cat-sub`
10. Modifying immutable `createdAt` during `update` on `/heroVideos/slide-1` or `/categories/cat-sub`
11. Unauthenticated `list` of inactive drafts (`active == false`) in `/heroVideos` or `/categories`
12. Non-admin `create` or `get` on `/admins/{uid}`

