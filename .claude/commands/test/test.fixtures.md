---
name: test.fixtures
description: Generate test fixtures for all annotation types, languages, and schema files
version: 1.0.0
category: test
phase: all
priority: P1
pattern: generator
inputs:
  - Annotation specification
  - Schema definitions
outputs:
  - fixtures/annotations/ (per-language)
  - fixtures/schemas/ (valid/invalid)
  - fixtures/workspaces/ (integration)
handoffs:
  - target: test.unit
    context: "Fixtures generated, use in unit tests"
  - target: test.integration
    context: "Workspace fixtures for integration tests"
---

# Test Fixture Generation

## Purpose

Generate comprehensive test fixtures covering all annotation types, languages, edge cases, and schema variations.

## Fixture Categories

### 1. Annotation Fixtures

Location: `fixtures/annotations/`

```
fixtures/annotations/
├── typescript/
│   ├── valid/
│   │   ├── file-level.ts
│   │   ├── symbol-level.ts
│   │   ├── constraints.ts
│   │   ├── inline.ts
│   │   └── variables.ts
│   └── invalid/
│       ├── unknown-namespace.ts
│       ├── invalid-lock-level.ts
│       └── malformed.ts
├── python/
├── rust/
├── go/
├── java/
├── csharp/
├── cpp/
└── c/
```

### 2. Schema Fixtures

Location: `fixtures/schemas/`

```
fixtures/schemas/
├── config/
│   ├── valid/
│   │   ├── minimal.json
│   │   ├── complete.json
│   │   └── with-layers.json
│   └── invalid/
│       ├── missing-version.json
│       └── invalid-type.json
├── cache/
├── vars/
├── attempts/
├── sync/
└── primer/
```

### 3. Workspace Fixtures

Location: `fixtures/workspaces/`

```
fixtures/workspaces/
├── minimal/
│   ├── .acp.config.json
│   └── src/index.ts
├── cross-file-refs/
│   ├── .acp.config.json
│   ├── .acp.vars.json
│   └── src/
│       ├── auth.ts
│       └── user.ts
└── large-project/
    ├── .acp.config.json
    └── src/ (100+ files)
```

## Sample Fixtures

### TypeScript Valid - File Level

```typescript
/**
 * @acp:purpose Authentication Service - Handles user authentication
 * @acp:module "Auth" - Core authentication module
 * @acp:domain Security
 * @acp:layer service
 * @acp:stability stable
 * @acp:owner @security-team
 * @acp:ref https://docs.example.com/auth
 */

export class AuthService {
  // ...
}
```

### TypeScript Valid - Symbol Level

```typescript
/**
 * @acp:fn validateUser - Validates user credentials
 * @acp:param username - The username to validate
 * @acp:param password - The password to check
 * @acp:returns boolean - True if valid
 * @acp:throws AuthError - When credentials invalid
 * @acp:example validateUser("john", "secret123")
 */
export function validateUser(username: string, password: string): boolean {
  // ...
}
```

### TypeScript Valid - Constraints

```typescript
/**
 * @acp:lock frozen - Security-critical code, do not modify
 * @acp:lock-reason Approved by security audit 2024-01
 * @acp:quality test-coverage:90
 * @acp:behavior pure
 */
export function hashPassword(password: string): string {
  // ...
}
```

### TypeScript Valid - Variables

```typescript
/**
 * @acp:fn uses $SYM_AUTH_SERVICE.full - Depends on auth service
 * @acp:fn uses $SYM_USER_REPO.ref - User repository dependency
 */
export function login(username: string): User {
  // Uses auth service and user repo
}
```

### TypeScript Invalid - Unknown Namespace

```typescript
// @acp:unknown something - This should produce a warning
```

### TypeScript Invalid - Invalid Lock Level

```typescript
// @acp:lock super-locked - Invalid lock level
```

### Schema Valid - Minimal Config

```json
{
  "version": "1.0.0",
  "project": {
    "name": "test-project"
  }
}
```

### Schema Invalid - Missing Version

```json
{
  "project": {
    "name": "test-project"
  }
}
```

## Fixture Generation Script

```bash
# Generate all fixtures
node scripts/generate-fixtures.js --all

# Generate specific category
node scripts/generate-fixtures.js --category annotations --language typescript
```

## Completion Criteria

- [ ] All 8 language fixtures created
- [ ] Valid/invalid variants for each
- [ ] All 6 schema types covered
- [ ] Workspace fixtures for integration
- [ ] Edge cases documented
