# Sanity schema fields

Field reference for TEHS Document DB. Source of truth: types exported from [`schemaTypes/index.ts`](../schemaTypes/index.ts). Incoming-reference decorations, orderings, and preview config are omitted.

**Columns:** Field (`name`) · Title · Type · Group · Required · Notes

Object types used inside documents (`historicalDate`, `navLink`, …) have their own tables. `reference → x` means a Sanity reference to that document type.

---

## Contents

**The Archive:** [primarySource](#primarysource) · [historicalImage](#historicalimage) · [donation](#donation)

**The Website:** [researchArticle](#researcharticle) · [thenAndNow](#thenandnow) · [quarterlyIssue](#quarterlyissue) · [quarterlyArticle](#quarterlyarticle) · [siteNavigation](#sitenavigation)

**Taxonomies:** [county](#county) · [township](#township) · [location](#location) · [person](#person) · [familyLine](#familyline) · [property](#property) · [deed](#deed) · [business](#business) · [organization](#organization) · [category](#category) · [donationCategory](#donationcategory)

**Objects:** [historicalDate](#historicaldate) · [censusRecord](#censusrecord) · [immediateRelative](#immediaterelative) · [historicalImageEmbed](#historicalimageembed) · [mapEmbed](#mapembed) · [internalSubLinks](#internalsublinks) · [navLink](#navlink) · [pageBreak](#pagebreak) · [thenAndNowView](#thenandnowview)

**[Planned types](#planned-not-in-indexts)** — not exported from `index.ts`

---

## The Archive

### `primarySource`

Document. Studio title: **Primary Source**. One clipping, letter, or notice.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `archiveId` | Archive ID | `string` | identity | yes | Unique. e.g. Doc505 |
| `title` | Headline / Subject Title | `string` | identity | yes | |
| `date` | Publication Date | `historicalDate` | identity | | Prefer year-only when day unknown |
| `newspaper` | Source Publication Name | `string` | identity | | |
| `articleImage` | Scan of Clipping | `image` (hotspot) | content | | |
| `transcription` | Full Transcription Text | Portable Text (`block`) | content | | |
| `isSheriffSale` | Is this a Sheriff's Sale? | `boolean` | content | | |
| `legalWrit` | Legal Writ Type | `string` (`fieriFacias` / `levariFacias` / `venditioniExponas`) | content | | Hidden unless sheriff’s sale |
| `associatedProperties` | Associated Properties | `array` of `reference → property` | place | | Prefer over standalone township |
| `township` | Township | `reference → township` | place | | Hidden when properties are set |
| `peopleMentioned` | People Mentioned | `array` of `reference → person` | place | | |
| `organizations` | Organizations and Businesses | `array` of `reference → business \| organization` | research | | |
| `subjects` | Subjects | `array` of `reference → category` | research | | Archive search themes |
| `citations` | Research References | `array` of `reference → quarterlyArticle \| thenAndNow` | research | | |

### `historicalImage`

Document. Studio title: **Historical Image**.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `archiveId` | Archive ID | `string` | identity | yes | Unique. e.g. MF37. Weighted in Studio search |
| `serialNumber` | Serial Number | `string` | identity | | |
| `title` | Caption / Title | `string` | identity | yes | Weighted in Studio search |
| `dateTaken` | Date Taken | `historicalDate` | identity | | Prefer year-only when day unknown |
| `imageFile` | Photograph | `image` (hotspot) | content | yes | |
| `description` | Full Description | `text` | content | | |
| `people` | People Depicted | `array` of `reference → person` | content | | Unique refs |
| `location` | Specific Location | `reference → location` | place | | Townships come from the location |
| `township` | Township | `reference → township` | place | | Hidden when location is set |
| `coordinates` | Coordinates | `geopoint` | place | | Google Maps input |
| `organizations` | Organizations and Businesses | `array` of `reference → business \| organization` | research | | |
| `subjects` | Subjects | `array` of `reference → category` | research | | |
| `citations` | Research References | `array` of `reference → quarterlyArticle \| thenAndNow` | research | | Not books/PDFs |
| `references` | References | Portable Text (`block` + URL marks) | research | | Books, PDFs, other URLs |
| `source` | Source | `string` | provenance | | |
| `contributor` | Contributor | `string` | provenance | | |
| `donation` | Donation | `reference → donation` | provenance | | Accession / gift |
| `photographer` | Photographer / Artist | `string` | provenance | | |
| `rights` | Rights / Ownership | `string` | provenance | | |
| `notes` | Archivist Notes | `text` | provenance | | |
| `featuredOnSite` | Show in the public highlight grid | `boolean` | website | | Default false |
| `featuredRank` | Highlight order | `number` (1–24) | website | | Hidden unless featured |

### `donation`

Document. Studio title: **Donation**. Accession / gift — not a fundraising page.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `name` | Donation Name | `string` | identity | yes | |
| `donationId` | Donation ID | `number` | identity | yes | Unique |
| `acquisitionDate` | Donation Acquisition Date | `historicalDate` | identity | | |
| `donor` | Donor | `string` | identity | | |
| `description` | Donation Description | `text` | details | | |
| `donationCategories` | Donation Categories | `array` of `reference → donationCategory` | details | | Warning if empty |

---

## The Website

### `researchArticle`

Document. Studio title: **Research Article**. Modern essays and township overviews.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `archiveId` | Archive ID | `string` | identity | yes | Unique. CSV clipID for book imports |
| `title` | Page Title | `string` | identity | yes | |
| `slug` | URL Slug | `slug` (from title) | identity | yes | Unique per type |
| `featuredOnSite` | Show in the public highlight grid | `boolean` | identity | | Default false |
| `featuredRank` | Highlight order | `number` (1–24) | identity | | Hidden unless featured |
| `townships` | Townships | `array` of `reference → township` | context | | |
| `peopleMentioned` | People Mentioned | `array` of `reference → person` | context | | |
| `propertiesMentioned` | Properties / Historic Sites Mentioned | `array` of `reference → property` | context | | |
| `organizations` | Organizations and Businesses | `array` of `reference → business \| organization` | context | | |
| `body` | Page Content & Layout Canvas | Portable Text: `block`, `historicalImageEmbed`, uploaded `image` (caption / alt / `imageRole`), `mapEmbed`, `internalSubLinks` | content | | |
| `notesAndReferences` | Notes & References | Portable Text (`block` + URL marks) | content | | Published bibliography |
| `internalComments` | Internal Comments | `text` | internal | | Studio-only; not public |

Uploaded images in `body` are inline `image` blocks (hotspot) with nested `caption`, `alt` (warning if empty), `imageRole` (`figure` / `aside`). Prefer `historicalImageEmbed` when the photo is cataloged.

### `thenAndNow`

Document. Studio title: **Then & Now**.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `title` | Page Title | `string` | identity | yes | |
| `slug` | URL Slug | `slug` (from title) | identity | yes | Unique per type |
| `featuredOnSite` | Show in the public highlight grid | `boolean` | identity | | Default false |
| `featuredRank` | Highlight order | `number` (1–24) | identity | | Hidden unless featured |
| `authorText` | Author Name | `string` | publication | | Bylines stay as text |
| `issueRef` | Issue | `reference → quarterlyIssue` | publication | yes | |
| `startPage` | Start Page | `number` | publication | | |
| `endPage` | End Page | `number` | publication | | Must be ≥ start page |
| `introduction` | Introduction | Portable Text (`block` + URL marks) | content | | Not tied to either photo |
| `then` | Then | `thenAndNowView` | content | yes | Historical photograph |
| `now` | Now | `thenAndNowView` | content | yes | Modern photograph |
| `notesAndReferences` | Notes & References | Portable Text (`block` + URL marks) | content | | |
| `townships` | Townships | `array` of `reference → township` | context | | |
| `peopleMentioned` | People Mentioned | `array` of `reference → person` | context | | |
| `propertiesMentioned` | Properties / Historic Sites Mentioned | `array` of `reference → property` | context | | |
| `organizations` | Organizations and Businesses | `array` of `reference → business \| organization` | context | | |
| `internalComments` | Internal Comments | `text` | internal | | Studio-only |

### `quarterlyIssue`

Document. Studio title: **TEHS Quarterly Issue**.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `volume` | Volume | `number` | publication | yes | Unique together with issue number |
| `issueNumber` | Issue / Number | `number` | publication | yes | Printed number (1–4, or 5 on Vol. 1) |
| `combinedIssue` | Combined / double issue | `boolean` | publication | | Default false |
| `issueNumberEnd` | Also numbered as | `number` | publication | when combined | Higher number; hidden unless combined |
| `season` | Season | `string` (`spring` / `summer` / `autumn` / `winter`) | publication | | Fall stored as autumn |
| `publicationDate` | Publication Date | `historicalDate` | publication | | Month+year, or year when seasonal |
| `yearSearch` | Year Search | `string` | publication | | Hidden; derived search tokens |
| `sourceKey` | Source Key | `string` | publication | | Unique. e.g. `v22n1`, `v44n1+2` |
| `coverImage` | Cover Image | `image` (hotspot) | media | | |
| `pdfAsset` | Issue PDF | `file` (PDF) | media | | Empty on many HTML-imported volumes |
| `tocNotes` | Table of Contents Notes | `text` | notes | | Not a stored TOC; site generates TOC from articles |

### `quarterlyArticle`

Document. Studio title: **TEHS Quarterly Article**.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `title` | Article Title | `string` | publication | yes | |
| `authorText` | Author Name | `string` | publication | | Not a `person` unless also a historical figure |
| `issueRef` | Issue | `reference → quarterlyIssue` | publication | yes | |
| `startPage` | Start Page | `number` | publication | | |
| `endPage` | End Page | `number` | publication | | Must be ≥ start page |
| `sourceKey` | Source Key | `string` | publication | | Unique. URL stem e.g. `v22n1p003` |
| `sourceUrl` | Source URL | `url` | publication | | Canonical tehistory.org URL for redirects |
| `summary` | Summary / Abstract | `text` | content | | |
| `body` | Article Text | Portable Text: `block`, `historicalImageEmbed`, uploaded `image`, `pageBreak` | content | | |
| `notesAndReferences` | Notes & References | Portable Text (`block` + URL marks) | content | | |
| `internalComments` | Internal Comments | `text` | internal | | Studio-only |
| `subjects` | Subjects | `array` of `reference → category` | entities | | |
| `propertiesMentioned` | Properties / Historic Sites Mentioned | `array` of `reference → property` | entities | | |
| `peopleMentioned` | People Mentioned | `array` of `reference → person` | entities | | |
| `organizations` | Organizations and Businesses | `array` of `reference → business \| organization` | entities | | |

### `siteNavigation`

Document. Studio title: **Public site navigation**. Singleton id `siteNavigation`. Editors / Administrators / Developers only.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `primaryLinks` | Header links | `array` of `navLink` | Header | | Max 8 (warn above 6). Search is a kind, not a separate setting |
| `secondaryLinks` | Explore links | `array` of `navLink` | Explore | | Homepage Explore, sidebars, footer |

Paths must be unique across both lists. Duplicate and delete are blocked on this singleton.

---

## Taxonomies & Entities

### `county`

Document. Studio title: **County**.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `name` | County Name | `string` | | yes | Unique |

### `township`

Document. Studio title: **Township**.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `name` | Township Name | `string` | | yes | |
| `county` | County | `reference → county` | | yes | |
| `migrationKey` | Migration Mapping Key | `string` | | | Unique. CSV keyword match |

### `location`

Document. Studio title: **Specific Location / Village**.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `name` | Location Name | `string` | | yes | e.g. Paoli, Berwyn |
| `townships` | Townships | `array` of `reference → township` | | yes | Min 1; unique; can span townships |
| `coordinates` | Coordinates | `geopoint` | | | Google Maps input |

### `person`

Document. Studio title: **Historical Person**. Living board members must not use this type.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `prefix` | Title / Prefix | `string` | identity | | e.g. Capt., Rev. |
| `firstName` | First Name | `string` | identity | yes | Warns on duplicate name |
| `middleName` | Middle Name | `string` | identity | | Warns on duplicate name |
| `lastName` | Last Name | `string` | identity | yes | Warns on duplicate name |
| `suffix` | Suffix | `string` | identity | | e.g. Jr., Sr. |
| `born` | Born | `historicalDate` | identity | | Prefer year-only |
| `died` | Died | `historicalDate` | identity | | Must be on or after born |
| `alternateSpellings` | Alternate Spellings / Aliases | `array` of `string` | genealogy | | |
| `familyLines` | Family Lineages | `array` of `reference → familyLine` | genealogy | | |
| `immediateRelatives` | Known Immediate Relatives | `array` of `immediateRelative` | genealogy | | |
| `censusAppearances` | Census / Occupation Records | `array` of `censusRecord` | records | | |

### `familyLine`

Document. Studio title: **Family / Lineage**.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `title` | Family Name | `string` | | yes | e.g. The Bean Family |
| `description` | Historical Background | `text` | | | People tag *to* this lineage; not stored here |

### `property`

Document. Studio title: **Property / Building**.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `historicalName` | Historical Name | `string` | identity | yes | |
| `propertyType` | Property Type | `string` (`dwelling` / `estate` / `church` / `inn` / `industrial` / `institutional` / `railroad`) | identity | yes | Building class, not a subject category |
| `yearBuilt` | Estimated Year Built / Converted | `historicalDate` | identity | | Usually year-only |
| `coordinates` | Coordinates | `geopoint` | place | | |
| `parentEstate` | Parent Estate / Land Tract | `reference → property` | place | | Hidden when type is estate |
| `location` | Specific Location | `reference → location` | place | | Valley Forge via location |
| `township` | Township | `reference → township` | place | | Hidden when location is set |
| `modernAddress` | Modern Address | `string` | place | | |
| `evolutionNotes` | Structural Evolution & Origins | `text` | research | | |
| `notableResidents` | Notable Residents / Owners | `array` of `reference → person` | research | | |
| `titleChain` | Title Chain | `array` of `reference → deed` | research | | Ordered conveyances |

### `deed`

Document. Studio title: **Deed / Land Instrument**. One conveyance, not a transcribed clipping.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `archiveId` | Archive ID | `string` | identity | yes | Unique. e.g. G2-182 |
| `instrumentType` | Instrument Type | `string` (`patent` / `deed` / `will` / `probate` / `warrant` / `survey` / `taxReturn` / `atlas` / `other`) | identity | yes | |
| `reference` | Reference | `string` | identity | | Deed book / patent citation |
| `dateText` | Date (Textual) | `string` | identity | | As-recorded wording; prefer for display |
| `date` | Structured Date | `historicalDate` | identity | | Sorting / filtering |
| `grantors` | Grantors (From) | `array` of `reference → person` | parties | | |
| `grantorsText` | Grantors (Text) | `string` | parties | | When people are not yet linked |
| `grantees` | Grantees (To) | `array` of `reference → person` | parties | | |
| `granteesText` | Grantees (Text) | `string` | parties | | |
| `areaText` | Area | `string` | terms | | As-recorded acreage |
| `costText` | Cost (Textual) | `string` | terms | | As-recorded |
| `costKind` | Cost Kind | `string` (`sale` / `groundRent` / `other`) | terms | | Mark ground rents |
| `costCurrency` | Cost Currency | `string` (`gbp` / `usd`) | terms | | |
| `costAmount` | Cost Amount (Normalized) | `number` | terms | | Major units for sort; do not mix currencies |
| `associatedProperties` | Associated Properties | `array` of `reference → property` | place | | Tracts this conveyance concerns |
| `branchLabel` | Branch Label | `string` | place | | e.g. Branch A |
| `notes` | Notes | `text` | research | | |
| `scanImage` | Scan / Survey Image | `image` (hotspot) | research | | |
| `scanSource` | Full Transcription (Primary Source) | `reference → primarySource` | research | | Full instrument text |

### `business`

Document. Studio title: **Business**. Shared historical-entity fields.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `name` | Business Name | `string` | identity | yes | |
| `migrationKey` | Migration Mapping Key | `string` | identity | | Unique across business + organization |
| `migrationKeyAliases` | Migration Key Aliases | `array` of `string` | identity | | Extra CSV spellings |
| `description` | Description | `text` | identity | | |
| `activeFrom` | Active From | `historicalDate` | identity | | Often year-only |
| `activeTo` | Active To | `historicalDate` | identity | | |
| `associatedProperties` | Associated Properties / Sites | `array` of `reference → property` | place | | Map pins live on the property |
| `owners` | Owners / Operators | `array` of `reference → person` | relations | | |

### `organization`

Document. Studio title: **Organization**. Same field names as `business`; labels differ.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `name` | Organization Name | `string` | identity | yes | |
| `migrationKey` | Migration Mapping Key | `string` | identity | | Unique across business + organization |
| `migrationKeyAliases` | Migration Key Aliases | `array` of `string` | identity | | |
| `description` | Description | `text` | identity | | Civic / institutional context |
| `activeFrom` | Active From | `historicalDate` | identity | | |
| `activeTo` | Active To | `historicalDate` | identity | | |
| `associatedProperties` | Associated Properties / Sites | `array` of `reference → property` | place | | |
| `owners` | Leaders / Associated People | `array` of `reference → person` | relations | | Same field name as business owners |

### `category`

Document. Studio title: **Subject Category**. Archive search themes.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `title` | Category Title | `string` | | yes | e.g. Schools, Railroads |
| `description` | Historical Context / Description | `text` | | | |
| `migrationKey` | Migration Mapping Key | `string` | | | Unique. CSV keyword |
| `migrationKeyAliases` | Migration Key Aliases | `array` of `string` | | | Extra CSV spellings |

### `donationCategory`

Document. Studio title: **Donation Category**. Material types for gifts.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `title` | Category Title | `string` | | yes | Unique. e.g. Photographic prints |
| `description` | Description | `text` | | | |
| `migrationKey` | Migration Mapping Key | `string` | | | Unique. Legacy dtype |

---

## Objects

### `historicalDate`

Object. Studio title: **Historical Date**.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `precision` | Precision | `string` (`year` / `month` / `day`) | | when any date value | Radio |
| `qualifier` | Qualifier | `string` (`exact` / `circa` / `before` / `after`) | | | Default `exact` |
| `year` | Year | `number` (1000–2100) | | when precision is year or month | Hidden for exact day |
| `month` | Month | `number` (1–12) | | when precision is month | Hidden otherwise |
| `date` | Date | `date` | | when precision is day | Calendar; hidden otherwise |

### `censusRecord`

Object. Studio title: **Census / Occupation Record**.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `year` | Census Year | `number` | | | |
| `occupation` | Recorded Occupation | `string` | | | |

### `immediateRelative`

Object. Studio title: **Immediate Relative**.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `relative` | Relative Profile | `reference → person` | | yes | |
| `relationshipType` | Relationship to this person | `string` (`spouse` / `parent` / `child` / `sibling` / `cousin` / `other`) | | yes | |

### `historicalImageEmbed`

Object. Studio title: **Historical Image**. Used in Portable Text.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `historicalImage` | Historical Image | `reference → historicalImage` | | yes | Cannot create new from this field |
| `caption` | Caption | `string` | | | Blank → catalog caption |
| `alt` | Alt Text | `string` | | | Blank → catalog caption |
| `imageRole` | Image Role | `string` (`figure` / `aside`) | | yes | Default `figure` |

### `mapEmbed`

Object. Studio title: **Interactive Map Module**.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `mapYear` | Historical Map Target Year | `string` | | | |
| `mapUrl` | Engine Application Embedded URL | `url` | | | |

### `internalSubLinks`

Object. Studio title: **Nested Navigation Portal Index**.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `links` | Links | `array` of `reference → researchArticle` | | | |

### `navLink`

Object. Studio title: **Navigation link**.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `label` | Label | `string` | | yes | Public menu text |
| `href` | Path | `string` | | yes | Must start with `/`; not a full URL |
| `kind` | Kind | `string` (`page` / `search`) | | yes | Default `page`. Search is the header field |
| `purpose` | Purpose (Studio only) | `text` | | | Not shown on the public site |

### `pageBreak`

Object. Studio title: **Original Print Page Break**.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `pageNumber` | Page Number | `string` | | | e.g. 3 |

### `thenAndNowView`

Object. Studio title: **Photograph & commentary**.

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `source` | Photograph source | `string` (`historicalImage` / `upload`) | | yes | Prefer catalog |
| `historicalImage` | Historical Image | `reference → historicalImage` | | when source is catalog | Hidden unless catalog |
| `image` | Uploaded photograph | `image` (hotspot) | | when source is upload | Hidden unless upload |
| `takenYear` | Year Taken | `number` | | | Upload only; hidden otherwise |
| `caption` | Caption | `string` | | | Catalog caption is fallback |
| `alt` | Alt Text | `string` | | | Warning for uploads without alt |
| `commentary` | Commentary | Portable Text (`block` + URL marks) | | | |

---

## Planned (not in `index.ts`)

These types are specified in the [PRD](./tehs-website-rebuild-prd.md) and/or exist as unexported draft files. Do not treat them as live Studio types until they are registered.

### Draft files not exported

`siteSettings`, `homePage`, `sitePage`, `societyEvent` live under `schemaTypes/` but are **not** in `index.ts`. Nested objects `purposeEmail` and `awardRecipient` are also unexported.

#### `siteSettings` (draft singleton id `siteSettings`)

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `postalAddress` | Postal address | `text` | | yes | |
| `emails` | Purpose emails | `array` of `purposeEmail` | | | |
| `facebookUrl` | Facebook URL | `url` | | | |
| `twitterUrl` | Twitter / X URL | `url` | | | |
| `mailchimpEmbedUrl` | Mailchimp signup URL | `url` | | | List stays in Mailchimp |
| `privacySentence` | Email privacy sentence | `text` | | | |

#### `purposeEmail` (draft object)

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `purpose` | Purpose | `string` | | yes | e.g. Membership |
| `address` | Email | `string` | | yes | |

#### `homePage` (draft singleton id `homePage`)

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `intro` | Introduction | Portable Text (`block`, `historicalImageEmbed`, uploaded `image`) | | yes | Min 1 block |
| `heroImage` | Hero photograph | `reference → historicalImage` | | | |
| `noUpcomingEventNote` | Note when no upcoming event | `string` | | | |

#### `sitePage` (draft)

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `title` | Page title | `string` | | yes | |
| `slug` | URL slug | `slug` (from title) | | yes | e.g. about, membership |
| `body` | Page content | Portable Text (`block`, `historicalImageEmbed`, uploaded `image`) | | yes | |
| `files` | Downloadable files | `array` of `file` with nested `label` | | | PDFs |

#### `societyEvent` (draft)

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `title` | Title | `string` | | yes | |
| `slug` | URL slug | `slug` (from title) | | yes | |
| `kind` | Kind | `string` (`meeting` / `exhibit` / `talk` / `other`) | | yes | Default `meeting` |
| `startAt` | Starts | `datetime` | | yes | |
| `endAt` | Ends | `datetime` | | | |
| `venue` | Venue | `string` | | | |
| `speaker` | Speaker / presenter | `string` | | | |
| `body` | Description | Portable Text | | | |
| `videoUrl` | Video URL | `url` | | | YouTube or Vimeo only |

#### `awardRecipient` (draft object)

| Field | Title | Type | Group | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `name` | Name | `string` | | yes | |
| `posthumous` | Posthumous | `boolean` | | | Default false |
| `deceased` | Since deceased | `boolean` | | | Default false |
| `photo` | Photograph | `image` (hotspot) | | | |
| `notes` | Notes | `text` | | | Public with recipient |

### Specified in the PRD only (no schema file)

| Type | Kind | Fields (minimum) | Notes |
| --- | --- | --- | --- |
| `societyOfficer` | document | `name`, `role`, `sortOrder`, optional `photo`, `exOfficio` | Living board; not `person` |
| `membershipTier` | document | `name`, `slug`, `price`, `paypalItemId`, `benefits`, `sortOrder` | Household / Patron |
| `relatedLink` | document | `title`, `url`, optional `notes` | `/links` |
| `sponsor` | document | `name`, `blurb`, optional `logo`, `url`, `sortOrder` | `/sponsors` |
| `salesOutlet` | document | `name`, `address`, optional `hoursNote`, `sortOrder` | `/publications` distributors |
| `award` | document | unique `year`, `recipients[]` (`awardRecipient`) | Teamer awards |
| `findingAid` | document | title, covering dates, donor, abstract, body/tables, optional PDF, optional `donation` refs | Archives collections |

### Fields to add on live types (PRD)

On `quarterlyIssue`: `forSale` (`boolean`), `price` (`number`), `paypalItemId` (`string`). Not in the schema yet.

### Later (not v1)

`historicMap`, `taxAssessment`, `newsletterIssue`.
