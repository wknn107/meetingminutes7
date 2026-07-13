# Security Specification: Commercial Registry Document Assistant

This specification documents the high-severity threat model, security invariants, and test payload declarations for the Firebase Firestore Rules.

## 1. Security Invariants
- **Identity Isolation**: A user's profile and archives collection can only be read, created, updated, or deleted by the exact user owning that data. No cross-tenant reads or list queries are allowed.
- **Strict Format Controls**: Document IDs, user IDs, and other critical identifiers must conform to strict alpha-numeric schemas (`^[a-zA-Z0-9_\-]+$`) and have length limits to prevent Denial of Wallet and storage poisoning.
- **Immutable Timestamps**: `createdAt` timestamps must strictly match `request.time` on creation.
- **Limited Update Paths**: Updating archives is strictly controlled; only valid fields can be modified.

## 2. The "Dirty Dozen" Payloads
The following payloads are designed to break the rules of Identity, Integrity, and State, and must be strictly blocked:

1. **User Profile Creation Spoofing (UID Mismatch)**:
   - Path: `/users/victim_user_123`
   - Payload: `{ "uid": "victim_user_123", "email": "victim@example.com", "createdAt": "request.time" }` (sent by attacker `attacker_456`)
   - Target Outcome: `PERMISSION_DENIED`

2. **User Profile Email Hijack**:
   - Path: `/users/attacker_456`
   - Payload: `{ "uid": "attacker_456", "email": "admin@gen-lang-client.com", "createdAt": "request.time" }`
   - Target Outcome: `PERMISSION_DENIED` (if email must match verified auth token)

3. **Archive ID Poisoning**:
   - Path: `/users/attacker_456/archives/WAY_TOO_LONG_JUNK_CHAR_STRING_THAT_EXCEEDS_128_CHARS_OR_CONTAINS_INVALIDS_$$$`
   - Payload: `{ "id": "...", "taskType": "OTHER", "createdAt": "request.time", ... }`
   - Target Outcome: `PERMISSION_DENIED`

4. **Archive Shadow Update (Ghost Field Injection)**:
   - Path: `/users/attacker_456/archives/archive_789`
   - Payload: `{ "id": "archive_789", "taskType": "OTHER", "createdAt": "request.time", "isVerifiedAdmin": true, ... }`
   - Target Outcome: `PERMISSION_DENIED`

5. **Cross-Tenant Archive Theft (Read Victim Archive)**:
   - Path: `/users/victim_user_123/archives/archive_789`
   - Action: `get` / `read` (by attacker `attacker_456`)
   - Target Outcome: `PERMISSION_DENIED`

6. **Cross-Tenant List Scraping**:
   - Path: `/users/victim_user_123/archives`
   - Action: `list` (by attacker `attacker_456`)
   - Target Outcome: `PERMISSION_DENIED`

7. **Temporal Fraud (Backdated Archive)**:
   - Path: `/users/attacker_456/archives/archive_789`
   - Payload: `{ "createdAt": "2020-01-01T00:00:00Z", ... }` (instead of `request.time`)
   - Target Outcome: `PERMISSION_DENIED`

8. **Unauthenticated Read Request**:
   - Path: `/users/any_user/archives/archive_789`
   - Action: `get` (unauthenticated client)
   - Target Outcome: `PERMISSION_DENIED`

9. **Invalid Task Type Infiltration**:
   - Path: `/users/attacker_456/archives/archive_789`
   - Payload: `{ "taskType": "MALICIOUS_HACK_TYPE", ... }`
   - Target Outcome: `PERMISSION_DENIED`

10. **Null/Missing Company Info on Archive Creation**:
    - Path: `/users/attacker_456/archives/archive_789`
    - Payload: `{ "id": "archive_789", "taskType": "DIRECTOR_CHANGE", "createdAt": "request.time" }` (omitting `companyInfo`, `documents`, `detectedPlaceholders`, `tasks`)
    - Target Outcome: `PERMISSION_DENIED`

11. **Malicious Empty Documents List**:
    - Path: `/users/attacker_456/archives/archive_789`
    - Payload: `{ "documents": [] }` (when required fields are empty/null)
    - Target Outcome: `PERMISSION_DENIED`

12. **Tampering with Immutable Creation Fields**:
    - Path: `/users/attacker_456/archives/archive_789`
    - Update Payload: Changing `createdAt` or `id` on an existing archive.
    - Target Outcome: `PERMISSION_DENIED`
