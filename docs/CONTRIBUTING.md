# Contributing to Academic Registration Portal · Y23

First of all, thank you for considering contributing to the **Academic Registration Portal (Y23)**! Institutional software platforms thrive on precision, meticulous testing, and thoughtful engineering.

Whether you are fixing a typo in documentation, reporting an edge case in cohort allocation rules, or proposing performance enhancements, your contributions are sincerely appreciated.

---

## Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [How Can I Contribute?](#how-can-i-contribute)
   - [Reporting Bugs](#reporting-bugs)
   - [Suggesting Enhancements](#suggesting-enhancements)
   - [Contributing Code](#contributing-code)
3. [Local Development Setup](#local-development-setup)
4. [Pull Request (PR) Workflow](#pull-request-pr-workflow)
5. [Commit Message Conventions](#commit-message-conventions)
6. [Testing & Verification Protocol](#testing--verification-protocol)
7. [Style Guides & Coding Standards](#style-guides--coding-standards)

---

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to **[Bhaanugali@gmail.com](mailto:Bhaanugali@gmail.com)**.

---

## How Can I Contribute?

### Reporting Bugs
Before creating bug reports, please check existing issues to ensure the problem has not already been reported. When creating an issue, provide as much detail as possible:

- **A clear, descriptive title**.
- **Steps to reproduce the issue**: Exact sequential steps that lead to the behavior.
- **Expected vs. Actual behavior**: What you anticipated happening versus what actually transpired.
- **Context details**: Your Node.js version, browser (Chrome, Firefox, Safari, Edge), screen viewport, and whether the issue occurred on student or administrator views.
- **Screenshots or terminal stack traces**: Visual evidence or raw console errors when applicable.

### Suggesting Enhancements
Feature requests are welcomed! When proposing an architectural enhancement:
- Clearly explain the problem the enhancement solves.
- Detail why this solution is better than existing workarounds.
- Specify how it maintains backwards compatibility with existing SQLite schemas and cohort option sheet rules.

---

## Local Development Setup

### Prerequisites
- **Node.js**: `v22.x` or `v24.x` LTS (Required for native `node:sqlite` runtime)
- **npm**: `v10.x` or higher
- **Git**: `v2.x`

### Quickstart Commands
```bash
# 1. Fork and clone the repository
git clone https://github.com/<your-username>/Academic-Registration-Portal-Y23.git
cd Academic-Registration-Portal-Y23

# 2. Configure local development environment
cp .env.example .env.local

# 3. Install dependencies
npm install

# 4. Start local development server with Turbopack
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Pull Request (PR) Workflow

To submit code changes, follow this structured Git workflow:

1. **Fork the Repository**: Create your personal fork on GitHub.
2. **Branch from `main`**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```
3. **Branch Naming Standard**:
   - `feat/` for new features or student/admin capabilities.
   - `fix/` for bug fixes and logic corrections.
   - `refactor/` for code restructuring with zero behavioral change.
   - `perf/` for allocation engine or query performance improvements.
   - `docs/` for README or markdown documentation updates.
4. **Adhere to Code Quality**: Run `npm run build` locally to verify that Next.js Turbopack compiles cleanly with **0 errors**.
5. **Push and Open PR**:
   ```bash
   git push origin feature/your-feature-name
   ```
   Open a Pull Request targeting `main`. Provide a comprehensive summary of changes, linked issues, and before/after verification evidence.

---

## Commit Message Conventions

We follow the standard [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <short imperative description>

[optional body explaining reason for change]

[optional footer referencing issue numbers]
```

### Accepted Commit Types:
- `feat`: A new user-facing feature.
- `fix`: A bug patch.
- `docs`: Documentation modifications only.
- `style`: Changes that do not affect the meaning of code (formatting, white-space, CSS adjustments).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `perf`: A code change that improves execution speed or memory usage.
- `test`: Adding missing tests or correcting existing tests.
- `chore`: Build tooling, dependency upgrades, or configuration adjustments.

*Example:*
```bash
git commit -m "fix(auth): clear cross-tab localStorage keys upon session logout"
```

---

## Testing & Verification Protocol

Before submitting a Pull Request, verify:
1. **Compilation**: `npm run build` must succeed without warnings or fatal errors.
2. **Deterministic Cohort Safety**: Verify that changes do not violate 5D cohort boundaries in `src/lib/db/eligibilityEngine.js` or `optionSheetRules.json`.
3. **Security Standards**: Ensure zero hardcoded passwords or credentials exist in source files. All authentications must utilize constant-time comparison (`safeCompare`) and parameterized SQLite bindings.

---

## Attribution & Questions

For questions regarding institutional curriculum structures or architecture rationale, feel free to contact:
- **Lead Maintainer**: Bhaanu G (Bhaanu Gali)
- **Email**: [Bhaanugali@gmail.com](mailto:Bhaanugali@gmail.com) / [2400030952@kluniversity.in](mailto:2400030952@kluniversity.in)
