# Security & Access Control Guidelines

## Rule 1: Database-First Enforcement
Any permission/access-control fix MUST include a corresponding RLS policy or RPC-level check. UI-only conditionals are never an acceptable complete solution.
UI-level hiding/disabling of buttons is merely a "UI convenience". The true source of security is the backend data store (Supabase). Do not submit a UI-only fix for an authorization issue without also verifying and hardening the relevant RLS policies.

## Rule 2: Wait for Explicit User Review
If a plan contains 'User Review Required' or 'Open Questions', STOP and wait for explicit human answers before implementation. Do not proceed with self-selected defaults and report completion.
