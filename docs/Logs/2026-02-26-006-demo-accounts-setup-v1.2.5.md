# Session Log: Demo Accounts Setup for Video Recording

**Date:** 2026-02-26
**Session:** 006
**Version:** v1.2.5

## Objective

Set up demo accounts and data for recording demo videos to share with siblings and student's parents.

## Demo Accounts

| Name | Email | Role | Password |
|------|-------|------|----------|
| Hamza Feroze | hamzaferoze115@gmail.com | Teacher | 12345678 |
| Aathifa Feroze | hamzaferoze115+aathifa@gmail.com | Teacher | 12345678 |
| Maryam Suhail | hamzaferoze115+maryam@gmail.com | Teacher | 12345678 |
| Hamza Reyal | hamzaferoze115+reyal@gmail.com | Student | 12345678 |

## Teaching Relationships

```
Hamza Feroze (teacher) ←→ Aathifa Feroze (student)    [both ways — each teaches the other]
Hamza Feroze (teacher) ←→ Maryam Suhail (student)     [both ways — each teaches the other]
Hamza Feroze (teacher)  → Hamza Reyal (student)        [one way — Hamza listens to Reyal only]
Aathifa Feroze (teacher) → Maryam Suhail (student)    [one way — mother listens to daughter]
```

### Summary per person:
- **Hamza Feroze**: Teaches Aathifa, Maryam, Reyal. Gives Quran to Aathifa, Maryam.
- **Aathifa Feroze**: Teaches Maryam, Hamza. Gives Quran to Hamza.
- **Maryam Suhail**: Gives Quran to Hamza, Aathifa.
- **Hamza Reyal**: Gives Quran to Hamza only (student account only).

## Demo Scenarios to Show

1. **One student, one teacher** — Hamza Reyal → Hamza Feroze
2. **One student, multiple teachers** — Maryam → Hamza + Aathifa
3. **Teachers who are also students** — Hamza ↔ Aathifa, Hamza ↔ Maryam
4. **Multiple students in one class** — Hamza creates one class with both Aathifa + Maryam, each with their own portions

## Work Completed

### Nuked all existing data
- Ran `nuke_all_data.py` — cleared all Supabase tables and auth users
- Deleted 2 existing auth users

## Summary

[To be updated as work progresses]

## Files Changed

| File | Action | Description |
|------|--------|-------------|

## Next Steps

- [ ] Create all 4 accounts in Supabase
- [ ] Set up teacher-student relationships
- [ ] Populate with sample classes and mistakes for demo
- [ ] Record demo videos

## Notes

- Continues from: docs/Logs/2026-02-26-005-remove-demo-accounts-v1.2.4.md
- All accounts use hamzaferoze115 Gmail with + suffixes (all go to same inbox)
- All passwords: 12345678
