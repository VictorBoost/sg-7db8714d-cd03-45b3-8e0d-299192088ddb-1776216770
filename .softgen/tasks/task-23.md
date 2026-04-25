---
title: Create automated sitemap.xml generator
status: done
priority: high
type: feature
tags: [seo, sitemap, automation]
created_by: agent
created_at: 2026-04-25T19:38:27Z
position: 23
---

## Notes
Build a dynamic sitemap.xml that automatically indexes:
- All active projects (from database)
- All 8 category pages
- Static pages (home, about, contact, faq, terms, privacy)
- Updates in real-time when projects are added/removed

## Checklist
- [x] Create /api/sitemap.xml.ts API route
- [x] Query database for all active projects
- [x] Include all category slugs
- [x] Add static pages with proper priority
- [x] Set lastmod dates from database
- [x] Configure proper XML headers and format
- [x] Test sitemap validates at /sitemap.xml

## Acceptance
- Sitemap.xml accessible at domain root
- All pages indexed correctly
- Valid XML format passes validators
- Search Console accepts sitemap