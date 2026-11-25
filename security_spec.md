# Firestore Security Specification

## Data Invariants
1. Public visitors can only read active `heroVideos` (`resource.data.active == true`) and the `heroConfig/default` document; private/inactive drafts and `admins` records are restricted to verified admins.
2. Only verified store administrators (`request.auth != null && request.auth.token.email_verified == true`) whose UID is in `/admins/{uid}` or whose verified email matches the bootstrapped store owner (`ibrahimzadran.info@gmail.com`) may create, update, or delete `heroVideos` or `heroConfig`.
3. Every write must satisfy strict key checks (`hasAll` + `hasOnly`), type/length bounds matching `firebase-blueprint.json`, safe video URL schemes (`https://`, `/assets/`, or `/media/` — never `javascript:` or `data:`), immutable `createdAt`, and server-enforced `request.time` timestamps and `updatedByUid == request.auth.uid`.
4. Unauthenticated users or non-admin signed-in users cannot escalate privileges by writing `/admins/{uid}`.

## Dirty Dozen Adversarial Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated `create` on `/heroVideos/slide-1`
2. Non-admin verified user `create` on `/heroVideos/slide-1`
3. Admin email with `email_verified: false` attempting `create` on `/heroVideos/slide-1`
4. Shadow field injection (`isVerified: true`) on `/heroVideos/slide-1`
5. Malicious `videoSrc: "javascript:alert(1)"` on `/heroVideos/slide-1`
6. Oversized `headline` (>140 chars) on `/heroVideos/slide-1`
7. Forged `updatedByUid` != `request.auth.uid` on `/heroVideos/slide-1`
8. Client-forged `createdAt` or `updatedAt` != `request.time`
9. Invalid document ID (`../bad-id` or >128 chars) on `/heroVideos/{slideId}`
10. Modifying immutable `createdAt` during `update` on `/heroVideos/slide-1`
11. Unauthenticated `list` of inactive drafts (`active == false`) in `/heroVideos`
12. Non-admin `create` or `get` on `/admins/{uid}`
