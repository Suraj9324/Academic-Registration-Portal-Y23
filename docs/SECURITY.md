# Security Policy

## Supported Versions

The following table indicates which versions of the Academic Registration Portal (Y23) currently receive security patches and updates:

| Version | Next.js Engine | Supported | Security Maintenance Status |
| :--- | :--- | :---: | :--- |
| **v1.2.x (Current)** | `Next.js 16.4.6` | :white_check_mark: | Actively supported & patched |
| **v1.1.x** | `Next.js 16.4.2` | :x: | Deprecated (Upgraded to 16.4.6) |
| **v1.0.x** | Legacy Next.js | :x: | Unsupported |

---

## Reporting a Vulnerability

We prioritize the security and integrity of student and institutional academic records. If you discover a security vulnerability, we request that you practice responsible disclosure.

### ⚠️ Please Do NOT Open Public GitHub Issues for Security Vulnerabilities

Public issues expose academic records and credentials before a patch can be applied. Instead, follow this reporting protocol:

1. **Email Details Privately**:
   Send an encrypted or direct email to the lead architect and security administrator:
   - **Primary Contact**: `Bhaanugali@gmail.com`
   - **Institutional Contact**: `2400030952@kluniversity.in`

2. **Information to Include**:
   - A detailed description of the vulnerability.
   - The specific route or component affected (e.g. `/portal-api/auth`, `eligibilityEngine.js`, or session handling).
   - Clear, reproducible step-by-step instructions or proof-of-concept payload.
   - Potential impact if exploited (e.g. unauthorized preference modification, privilege escalation).

3. **Response Timelines**:
   - **Initial Acknowledgment**: Within **24 hours**.
   - **Triage & Assessment**: Within **48 hours**.
   - **Patch Delivery & Coordinated Release**: Within **3 to 7 business days** depending on vulnerability severity.

---

## Security Architecture Principles

This project enforces strict zero-trust operational security guidelines:
- **Zero Hardcoded Secrets**: No administrative passwords or tokens are stored in source code.
- **Timing-Safe Cryptography**: All authentications utilize `crypto.timingSafeEqual()` (`safeCompare`) to protect against side-channel timing analysis.
- **100% Parameterized Statements**: All queries against `.data/academic_portal.sqlite` use bound parameters to prevent SQL injection.
- **Signed Session Tokens**: Authentication sessions are cryptographically signed using HMAC keys with strict expiration boundaries.
