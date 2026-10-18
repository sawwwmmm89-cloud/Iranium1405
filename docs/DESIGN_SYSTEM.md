# BAMA — Design System

## Identity
Name: باما / BAMA · Slogan: «همه چی باما!» · Logo: lowercase `b` + Persian «ب» merged in a circle (SVG, mono + color variants).

## Color tokens
| Token | Hex | Use |
|---|---|---|
| primary | #155EEF | CTAs, links, active states |
| primary-deep | #0B3FA8 | hover/pressed, headings accents |
| accent | #FF7A00 | rare highlights (badge, key CTA, progress milestone) |
| ink | #111111 | text |
| surface | #FFFFFF | backgrounds |
| primary-soft | #EFF6FF | tinted sections |
| accent-soft | #FFF4E8 | accent backgrounds |
Ratio target: white 60 / blue 25 / black 10 / orange 5. Neutral grays derived from ink with opacity.

## Typography
Vazirmatn (self-hosted via next/font/local, `font-display: swap`). Scale: 12/14/16/18/20/24/30/36/48. Body line-height 1.9 for Persian; headings 1.4. Persian digits for display, tabular numerals in tables.

## Shape & depth
Radius: 8 (inputs) / 12 (buttons) / 16–20 (cards). Shadow: one soft level (`0 1px 2px rgba(17,17,17,.04), 0 8px 24px rgba(17,17,17,.06)`), 1px border `rgba(17,17,17,.08)`. Glass only in sticky header. Gradients: max one subtle blue gradient in hero.

## Spacing / layout
4px base grid. Container max 1200px. Mobile-first breakpoints: sm 640, md 768, lg 1024, xl 1280, 2xl 1536. Logical properties (`ms-`, `pe-`) for RTL.

## Motion (Framer Motion)
150–300ms, ease-out; opacity/translate/scale only; hero floating elements ≤ 4, slow loop; all wrapped with `useReducedMotion`.

## Components
Button, Input, Select, Modal, Dialog, Toast, Dropdown, Tabs, Card, CourseCard, InstructorCard, LiveCard, VideoPlayer, ProgressBar, Badge, Avatar, Navbar, Footer, Sidebar, DataTable, Pagination, EmptyState, Skeleton, Loading, ConfirmDialog. Each: typed props, variants via `cva`, focus ring (primary, 2px), disabled/loading/error states, accessible roles (Radix primitives).

## States checklist per page
hierarchy · spacing · responsive · empty · loading (skeleton) · error · hover/focus · mobile UX.
