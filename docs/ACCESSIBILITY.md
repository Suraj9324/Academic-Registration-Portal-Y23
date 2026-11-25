# Accessibility Statement (A11y)

The **Academic Registration Portal (Y23)** is engineered to ensure that digital academic registration is equitable, accessible, and barrier-free for all students, faculty members, and administrative staff, including individuals with visual, auditory, motor, or cognitive disabilities.

---

## Standards & Conformance

We strive to conform to the **Web Content Accessibility Guidelines (WCAG) 2.1 Level AA** benchmarks:

- **Perceivable**: All UI elements maintain accessible contrast ratios. Text badges, status indicators, and course tags use distinct luminance and color definitions that exceed the 4.5:1 minimum contrast threshold.
- **Operable**: All critical interactive controls—including the Date of Birth calendar picker, faculty ranking dropdowns (`PreferenceSelect`), and the mandatory registration guidelines modal—are fully operable via standard keyboard navigation (Tab, Shift+Tab, Enter, Space, Escape).
- **Understandable**: The multi-step registration workflow provides clear contextual headings, validation alerts, and non-ambiguous error feedback.
- **Robust**: The application utilizes semantic HTML5 structural elements (`<header>`, `<nav>`, `<main>`, `<footer>`, `<button>`, `<table>`) and ARIA roles for screen reader compatibility.

---

## Built-In Accessibility Features

1. **Keyboard Navigability & Focus Management**:
   - Focus states feature visible high-contrast focus rings (`focus-visible: ring-2`).
   - Modal overlays (`RegistrationGuidelinesModal`, `RecordModal`) automatically capture and trap focus until dismissed, and support instant closure via the `Escape` key.
2. **Color Independence**:
   - Statuses (e.g. `FINALIZED`, `EDITABLE`, `Mandatory`, `Prescribed`) are accompanied by textual labels and geometric icons, never relying on color alone.
3. **Screen Reader Compatibility**:
   - Icon-only interactive buttons (such as the top-right `<LogOut />` button and mobile navigation triggers) include explicit `aria-label` attributes (`aria-label="Sign out"`).
4. **Fluid Responsiveness & Zoom Support**:
   - Layouts are tested up to 200% browser zoom without layout breakage or overlapping text.

---

## Feedback & Reporting Accessibility Barriers

If you encounter an accessibility barrier or require an alternate format to complete course registration, please contact:

- **Accessibility Lead**: Bhaanu G (Bhaanu Gali)
- **Email**: `Bhaanugali@gmail.com` (cc: `2400030952@kluniversity.in`)

Please include the page URL or screen name and the assistive technology you were using. We aim to respond to accessibility reports within **48 hours**.
