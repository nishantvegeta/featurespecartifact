# Project Overview

- **Name:** hey
- **Type:** Full-stack TypeScript/React application
- **GitLab:** root/hey (ID: 6)
- **Domain:** Banking/Company user management system
- **Structure:** Frontend (React, TSX), backend (Node), docs (FRS, specs)
- **Key Directories:**
  - `.claude/` — Claude Code configuration and skills
  - `docs/` — Documentation (FRS, feature specs)
  - `raw-sources/` — UI prototypes
  - `businessrules/` — Business logic documentation
  - `featurespec/` — Feature specifications

## Tech Stack
- **Frontend:** React, TypeScript, Tailwind CSS, shadcn/ui components
- **State:** useState (local), Auth context
- **Backend:** Node (inferred from project structure)
- **Icons:** lucide-react
- **Notifications:** sonner (toast)
- **Git:** GitHub/GitLab workflow

## Development Commands
- `git` — version control
- `npm` / `pnpm` — package management (infer from package.json)
- Testing, linting, formatting — to be confirmed from package.json

## Code Style
- **Language:** TypeScript (strict types)
- **Components:** Functional React with hooks
- **Naming:** snake_case for data (user_id, entity_id, created_at), camelCase for JS
- **UI:** Component-driven (Card, Badge, Button, Dialog, Table from shadcn/ui)
- **Auth:** useAuth hook pattern for context
