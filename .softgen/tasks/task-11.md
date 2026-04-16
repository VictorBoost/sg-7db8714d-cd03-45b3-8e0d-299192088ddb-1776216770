---
title: Staff Management
status: todo
priority: high
type: feature
tags: [service-provider, staff, subscriptions]
created_by: agent
created_at: 2026-04-16T09:03:57Z
position: 11
---

## Notes
Service providers can add staff members to help manage their business. Each staff member costs $2/month added to their subscription. Features:
- Add staff with name, email, password, role (Accept bids and manage contracts, Manage accounts, Other with custom label)
- Staff members can be deactivated anytime
- Cost of $2/month per active staff member added to subscription billing
- Staff members have limited access based on their role

## Checklist
- [ ] Create staff_members table with provider_id FK, name, email, password_hash, role, custom_role_label, is_active, created_at
- [ ] Add RLS policies for staff_members (T1: provider can CRUD their own staff)
- [ ] Create staffManagementService.ts with CRUD operations for staff members
- [ ] Create staff management UI component showing list of staff, add/edit/deactivate actions
- [ ] Add staff management tab to service provider dashboard
- [ ] Integrate staff member count with subscription billing system
- [ ] Add role-based access control for staff member features