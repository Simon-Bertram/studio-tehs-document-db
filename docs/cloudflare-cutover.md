# Cloudflare cutover runbook — tehistory.org

Operational companion to [tehs-website-rebuild-prd.md](./tehs-website-rebuild-prd.md) §10. Do not switch nameservers until the MX inventory is complete and the Astro Worker is reviewed on a staging hostname.

Studio already deploys as Worker `studio-tehs-document-db` ([CLOUDFLARE_WORKERS.md](../CLOUDFLARE_WORKERS.md)). The **public site is a separate Worker** with [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) and **SSG** routing — not `not_found_handling = "single-page-application"` (that setting is for Studio).

Do **not** use Cloudflare Pages for the new app.

---

## 1. Current hosting (baseline)

| Record | Today (confirm before cutover) |
| --- | --- |
| Registrar | DreamHost, LLC |
| Nameservers | `ns1.dreamhost.com`, `ns2.dreamhost.com`, `ns3.dreamhost.com` |
| Public HTML | DreamHost shared hosting |
| Image JPEGs / MySQL `tehsimages2` | DreamHost (`the2nomads.site`); keep until Sanity/R2 holds every public JPEG |
| Studio | Cloudflare Worker `studio-tehs-document-db` |

**Leave DreamHost billed** until MySQL exports and leftover JPEGs are unused. Do not delete the old HTML tree until redirects have been watched for seven days.

---

## 2. DNS / MX inventory (fill before any NS change)

Copy live records (`dig NS/A/MX/TXT tehistory.org`, and the same for each hostname). Empty cells are blockers.

| Hostname | Type | Current value | Action at cutover |
| --- | --- | --- | --- |
| `tehistory.org` | NS | `ns1/2/3.dreamhost.com` | Cloudflare nameservers **or** keep DreamHost NS and change A/CNAME only |
| `tehistory.org` | A / AAAA | | Proxied AAAA/CNAME to Astro Worker |
| `www.tehistory.org` | A / CNAME | | Same Worker |
| `tehistory.org` | **MX** | | **Copy unchanged** unless mail is moving too |
| `tehistory.org` | TXT (SPF) | | Recreate; include Mailchimp `include:` |
| `_dmarc.tehistory.org` | TXT | | Copy |
| Mailchimp DKIM (`k1._domainkey` etc.) | CNAME/TXT | | Copy or Mailchimp mail will spam-folder |
| `images.tehistory.org` | A/CNAME | | Keep on DreamHost until `/images` is live, then redirect |
| `documents.tehistory.org` | | | Same pattern |
| `thda.tehistory.org` | | | Redirect to `/research` + `/deeds` after content exists |
| `easttown.tehistory.org` | | | Redirect to `/deeds` |
| `charlestown.tehistory.org` | | | Redirect to `/deeds` / `/people` |
| Studio custom domain (if any) | | | Unrelated Worker; do not collide |

**Mailbox question (officer):** where do `info@`, `membership@`, `archive@`, `quarterly@`, `board@`, `webmaster@` actually land — DreamHost mailbox, Google Workspace, or forward? Nameserver moves without MX copies take email offline.

Cloudflare Email Sending is **transactional only**. It is not Mailchimp. Optional later: contact-form receipts.

---

## 3. Astro Worker

1. New Worker (name TBD in the Astro repo, e.g. `tehs-website`).
2. `[assets]` directory = Astro `dist/`.
3. SSG / static-site `not_found_handling` per [Static Assets SSG routing](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/) — custom `404.html`, not SPA fallback.
4. Deploy to `*.workers.dev` (or a staging hostname). Society reviews slices 1–2.
5. Add custom domains `tehistory.org` and `www` (proxied).
6. CORS: public site origin on the Sanity project allowlist (credentials as required for preview).

---

## 4. Redirect Rules (legacy HTML)

Prefer [Cloudflare Redirect Rules](https://developers.cloudflare.com/rules/) over origin `_redirects` for the `.html` forest. Studio’s Worker must **not** ship a Netlify `/* → /index.html 200` file (`code: 100324`).

| Incoming | Target | Code |
| --- | --- | --- |
| `/` already on Worker | `/` | — |
| `/index.html` | `/` | 301 |
| `/about.html` | `/about` | 301 |
| `/contact.html` | `/contact` | 301 |
| `/links.html` | `/links` | 301 |
| `/news.html` | `/news` | 301 |
| `/news.html#ov` | `/news` (fragment dropped) | 301 |
| `/membership.html` | `/membership` | 301 |
| `/support.html` | `/support` | 301 |
| `/sponsors.html` | `/sponsors` | 301 |
| `/hqstore.html` | `/store` | 301 |
| `/pubs.html` | `/publications` | 301 |
| `/archives.html` | `/archives` | 301 |
| `/signup.html` | `/signup` | 301 |
| `/homepix.html` | `/` | 301 |
| `/tnindex.html` | `/then-and-now` | 301 |
| `/search.html` | `/search` | 301 |
| `/qtoc1.html`, `/hqda/qtoc2.html` | `/quarterly` | 301 |
| `/hqda/toc/qv22toc.html` (pattern `qvNNtoc`) | `/quarterly/v{NN}` | 301 |
| `/hqda/.../{sourceKey}.html` | `/quarterly/{sourceKey}` | 301 |

Article-level HQDA redirects should use each `quarterlyArticle.sourceUrl` / `sourceKey` from Sanity (generate the rule list from GROQ at launch, do not hand-type 1,800 rows).

After go-live: watch 404s for seven days; add misses to this table.

---

## 5. Cutover sequence

1. Fill the inventory table (section 2).
2. Staging Worker reviewed.
3. Create Cloudflare zone (if nameservers will move) and **import every record**, especially MX and Mailchimp DKIM.
4. Attach custom domains to the Astro Worker.
5. Switch NS at DreamHost **or** change only A/CNAME if MX must stay on DreamHost DNS.
6. Enable Redirect Rules.
7. Confirm `mailto:` still works and a Mailchimp test send is not junked.
8. Monitor 404s; keep DreamHost origin until leftovers are gone.

**Do not** change PayPal or Mailchimp in this window.

---

## 6. Society access

Named launch contact needs: DreamHost panel, Cloudflare account that owns the Studio Worker, domain registrar (if separate), PayPal, Mailchimp.
