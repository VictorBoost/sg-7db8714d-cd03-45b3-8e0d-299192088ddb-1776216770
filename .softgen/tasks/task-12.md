---
title: Accounting Ledger
status: todo
priority: high
type: feature
tags: [service-provider, accounting, invoices, silver-tier]
created_by: agent
created_at: 2026-04-16T09:03:57Z
position: 12
---

## Notes
Silver+ sellers get access to accounting features including income/expense tracking and invoice generation for completed contracts. Features:
- Income and expense entries with optional GST toggle per entry
- Summary showing total income, expenses, and net
- Invoice creation from completed BlueTika contracts only
- Invoice includes company name/logo, job details, amount, date, mandatory BlueTika footer
- PDF download and email to client's registered BlueTika email only
- Customizable invoice template colours

Requires Silver tier or higher — show upgrade prompt for Bronze sellers.

## Checklist
- [ ] Create accounting_entries table: provider_id FK, type (income/expense), amount, gst_included, description, date, contract_id (nullable), created_at
- [ ] Create invoices table: provider_id FK, contract_id FK, company_name, company_logo_url, invoice_number, issued_date, custom_colors, created_at
- [ ] Add RLS policies for accounting_entries and invoices (T1: provider owns their records)
- [ ] Create accountingService.ts with CRUD for entries, summary calculations
- [ ] Create invoiceService.ts with PDF generation, email sending, contract validation
- [ ] Create accounting ledger UI: entries list, add income/expense form, summary cards
- [ ] Create invoice creation modal: select completed contract, customize details, preview
- [ ] Add PDF generation using jsPDF or similar library
- [ ] Integrate with SES for invoice email delivery
- [ ] Add tier check (Silver+) with upgrade prompt for Bronze sellers