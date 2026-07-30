# Session Log: Cross-Listener Mistake History and Exact-Word Links

**Date:** 2026-07-30  
**Session:** 011  
**Author:** Kyle

## Requested behavior

1. From **Mistakes & Recitation Review**, selecting a mistake and pressing **Open in Quran** must open the linked session/Quran page at the exact mistaken word rather than only opening the session root.
2. If a reciter has multiple listeners, each listener must see the reciter's prior mistakes—including mistakes recorded by another listener—in a later session.
3. Previous-session mistake history must identify which listener recorded the mistake.

## Investigation

The mistake rows and `mistake_occurrences` were already reciter-scoped, so a listener connected to Maryam could retrieve Maryam's mistake history across listeners. However:

- `classes` RLS only allowed the session owner or enrolled reciter to read session metadata.
- Consequently, another listener could receive the mistake and occurrence ID but not the previous session's date/day/listener metadata.
- `profiles` RLS did not allow two listeners who share a reciter to resolve each other's display names.
- The Mistakes page navigated only to `/sessions/{id}` and omitted the Surah, Ayah, and zero-based word index.

Production data currently has three Maryam sessions, all listened to by Hamza Feroze. A real second-listener Maryam session does not currently exist, so the two-listener behavior was tested with temporary production records and then fully cleaned up.

## Changes

### Exact-word deep link

- Mistakes now chooses the latest linked occurrence.
- Navigation includes `student`, `surah`, `ayah`, and `word` query parameters.
- Classroom and personal Quran Reader consume those parameters, open the calculated Mushaf page, scroll to the word, and highlight it for four seconds.
- Quran word spans now expose stable `data-word-key` targets.

### Cross-listener attribution

- Mistake occurrence loading now includes session listener ID.
- Listener profile names are resolved and returned as `listener_name`.
- Previous-session history is grouped per actual session rather than combining sessions only by date.
- Each previous session shows **Listened by {name}**.
- Selected mistake details show **Last recorded by**.

### Supabase read-only policies

Applied `docs/supabase_cross_listener_mistake_history.sql` to production:

- `Contact listeners can view reciter sessions` — SELECT only.
- `Listeners can view co-listener profiles` — SELECT only.
- Security-definer helpers safely evaluate shared-reciter relationships without granting cross-listener update/delete permissions.
- Function execution is restricted to the authenticated role.

## Live RLS verification

A disposable Aathifa → Maryam relationship, session, enrollment, mistake, and occurrence were created solely for the test. As Hamza's authenticated account, verification confirmed:

- Other-listener Maryam mistake visible: **yes**
- Other-listener occurrence visible: **yes**
- Other-listener session metadata visible: **yes**
- Listener name resolved as **Aathifa Feroze**: **yes**

All temporary records and the temporary relationship were deleted immediately afterward.

## Validation

- Production build: passed.
- Regression tests: **26/26 passed**.
- Targeted ESLint: no errors; one pre-existing Classroom hook dependency warning remains.
- SQL migration recorded in source control and applied to production.
