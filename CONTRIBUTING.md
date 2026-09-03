# Contributing to MPLADS AI Risk Intelligence

Thank you for contributing! Our team follows a simple but structured workflow to ensure our prototype is stable and integrated smoothly.

## Branch Naming
Create feature branches from `main` using descriptive names:
- `feature/frontend-dashboard`
- `feature/project-investigation`
- `feature/api-endpoints`
- `feature/anomaly-detection`

## Commit Conventions
Keep commit messages concise and descriptive.
Examples:
- `feat: add risk scoring module`
- `fix: resolve progress mismatch calculation`
- `docs: update API schema`

## Pull Requests
1. Push your branch and open a Pull Request against `main`.
2. Ensure your code does not break the vertical slice (data -> DB -> AI -> API -> UI).
3. Request a review from the Team Lead or the module owner.

## Merging
- Rebase and merge after approval.
- Ensure the main branch always represents a working demo state.

## Folder Ownership
- `frontend/` - Members 1 & 2
- `backend/` - Members 4 & 6
- `ai/` - Member 5
- `research/` & `docs/` - Member 3 and Team Lead
- Architecture / Overall Integration - Team Lead

## Environment Setup
Never commit secrets or `.env` files. Always use `.env.example` as the template.
