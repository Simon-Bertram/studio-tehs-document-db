# Donations — needs manual category links

8 donations did not get Donation Categories from the CSV `dtype` column.
Use this checklist in Studio: **The Archive → Donations**. Search by **Donation ID**.

Canonical categories you can assign (create if missing, with matching Migration Mapping Key):

- Photographic prints
- Digital photographs
- Newspaper clipping
- Postcards
- Slides
- Drawings
- Posters

Leave blank only if the gift truly has no known material type.

---

## 1. `dtype` was "Multiple" (mixed / unknown materials)

Pick one or more categories from the gift description.

### Donation ID `1` — not in any

| Field            | Value                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| Donor            | not defined                                                           |
| Acquisition date | various                                                               |
| Description      | images not assigned to any collection                                 |
| Legacy dtype     | Multiple                                                              |
| Sanity ID        | _(dry-run — not written yet; after_ `--live`_, search Donation ID 1)_ |

**Do in Studio:** Open donation **1**. Under **Donation Categories**, add whatever materials this holding bucket actually contains (often Photographic prints and/or Digital photographs), or leave empty if it is only a catch-all and images will carry their own donation links later.

- [x] Categories set (or intentionally left empty)

### Donation ID `25` — Krider family

| Field            | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| Donor            | Ronald Jones                                                   |
| Acquisition date | 2009                                                           |
| Description      | Photographs of the Krider family and the Berwyn Carriage Works |
| Legacy dtype     | Multiple                                                       |

**Suggested categories:** Photographic prints (description says photographs). Add Digital photographs only if the gift also includes born-digital files.

- [x] Categories set

---

## 2. `dtype` was a report title (not a material type)

### Donation ID `60` — PA Turnpike Reconstruction

| Field            | Value                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| Donor            | Pennsylvania                                                             |
| Acquisition date | 2012                                                                     |
| Description      | STV company report on local historical assets with photos of structures. |
| Legacy dtype     | Report by the STV company to the Pennsylvania Turnpike Commission        |

**Suggested categories:** Photographic prints (photos of structures) and/or treat the report as supporting paperwork — there is no “Report” donation category. Prefer **Photographic prints**; add **Digital photographs** if the files are scans/digital only.

- [x] Categories set

---

## 3. Missing / empty `dtype`

Infer from description (or ask the donor record owner).

### Donation ID `85` — Paul Roth

| Field            | Value             |
| ---------------- | ----------------- |
| Donor            | Paul Roth         |
| Acquisition date | _(empty)_         |
| Description      | Paoli train photo |

**Suggested:** Photographic prints (or Digital photographs if the file is a digital image).

- [x] Categories set

### Donation ID `86` — Gondola Giannantonio

| Field            | Value                         |
| ---------------- | ----------------------------- |
| Donor            | Gondola Giannantonio          |
| Acquisition date | _(empty)_                     |
| Description      | Photo of Cedar Hollow station |

**Suggested:** Photographic prints (or Digital photographs).

- [x] Categories set

### Donation ID `109` — Meg Wiederseim

| Field            | Value                         |
| ---------------- | ----------------------------- |
| Donor            | Meg Wiederseim                |
| Acquisition date | 2022                          |
| Description      | Donations from Meg Wiederseim |

**Suggested:** Confirm materials with the archivist; description is non-specific. Common default for recent photo gifts: Digital photographs.

- [x] Categories set

### Donation ID `113` — Martha Boland

| Field            | Value                                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| Donor            | Martha Boland                                                          |
| Acquisition date | 2024                                                                   |
| Description      | Photos of Chesterbrook from 1968 taken by her husband, John P. Boland. |

**Suggested:** Photographic prints (1968 photos) and/or Digital photographs if only scans were donated.

- [ ] Categories set

### Donation ID `999` — Holding area

| Field            | Value     |
| ---------------- | --------- |
| Donor            | _(empty)_ |
| Acquisition date | _(empty)_ |
| Description      | _(empty)_ |

**Suggested:** Placeholder / holding bucket — leave **Donation Categories** empty unless you know what sits here, or delete after cleanup.

- [ ] Reviewed (categories set or left empty on purpose)

---

## After you finish

1. Publish each edited Donation.
2. Re-run `bun run csv-import:donations -- --live` only if you need the importer to refresh other fields; category fixes made in Studio are kept if you later switch to create-if-missing / careful patching — today live mode **patches** all mapped fields and can overwrite categories. Prefer finishing category edits **after** the live donation import, or re-apply categories after a re-run.
3. Then run the images import so `donationID` links resolve.
