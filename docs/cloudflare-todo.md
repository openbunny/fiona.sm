# Cloudflare migration checklist

`https://fiona.sm` is canonical; `www.fiona.sm` redirects to it. 101domain remains the registrar. The submitted nameserver change awaits approval: `dig NS fiona.sm` still returns 101domain nameservers, the apex still resolves to the old Vercel A records, and Cloudflare's zone API reports `pending`. Public cutover checks depend on registrar approval.

## Prepared on Cloudflare

- [x] Create the full `fiona.sm` zone on the Free plan. Cloudflare assigned `jerome.ns.cloudflare.com` and `mira.ns.cloudflare.com`. The zone remains pending until the registrar publishes them.
- [x] Copy every non-Vercel record visible in the supplied 101domain screenshots. The owner confirmed there are no additional registrar records. Direct queries to the old and new authoritative nameservers match for both Proton MX records, Proton verification, SPF, `_dmarc`, and all three DKIM CNAMEs. The three effective CAA entries are present; [Cloudflare also publishes CAA entries for its certificate authorities](https://developers.cloudflare.com/ssl/edge-certificates/caa-records/#caa-records-added-by-cloudflare).
- [x] Exclude the Vercel apex A records `216.150.1.1` and `216.150.16.1` and the Vercel `www` CNAME. Cloudflare created the proxied Worker custom-domain record for `fiona.sm` as `AAAA 100::`; `www` is a proxied CNAME to `fiona.sm`. The zone is pending, and its authoritative servers return no apex A answer yet.
- [x] Attach the verified `fiona-sm` Worker to `fiona.sm` and declare that route in `wrangler.jsonc`. `bun run deploy` verified the signed canary and post manifest before upload. `workers.dev` and preview URLs remain disabled.
- [x] Create Cloudflare Page Rules that permanently redirect `www.fiona.sm/*` to `https://fiona.sm/$1` and `http://fiona.sm/*` to `https://fiona.sm/$1`. [Page Rule wildcards can include the query string](https://developers.cloudflare.com/rules/page-rules/reference/wildcard-matching/); verify path and query preservation after activation.
- [x] Check DNSSEC feasibility for `.sm`. The signed root zone has no DS record for `.sm`, and `.sm` nameservers return no DNSKEY. A DS record for `fiona.sm` therefore cannot establish a publicly validated chain. Evidence: `dig +dnssec DS sm. @a.root-servers.net` and `dig +dnssec DNSKEY sm. @dns.intelcom.sm`; see [IANA's `.sm` delegation](https://www.iana.org/domains/root/db/sm.html) and [Cloudflare's DNSSEC requirements](https://developers.cloudflare.com/dns/dnssec/). Do not enable DNSSEC for this zone or add a DS record at 101domain.
- [x] Run `just check` and `just bun-e2e` locally. The local end-to-end suite covers the exported site and headers. The Cloudflare upload is from an uncommitted checkout and is not a repository release.

## DNS records staged at Cloudflare

Cloudflare holds the Proton MX, verification, SPF, and DKIM records, the DMARC record, and the three original CAA records. Cloudflare manages the zone NS and SOA records, the apex Worker record, and the proxied `www` CNAME. The old Vercel website records are absent. Query `jerome.ns.cloudflare.com` with `dig` to inspect the live values.

Cloudflare publishes additional CAA authorizations for its Universal SSL certificate authorities, including wildcard issuance. The prior `issuewild ";"` entry remains present, but it is no longer the only wildcard policy entry. This is [Cloudflare's documented behavior](https://developers.cloudflare.com/ssl/edge-certificates/caa-records/#caa-records-added-by-cloudflare) for a full zone using Universal SSL.

The owner confirmed the 101domain record list contains no entries outside the screenshots. A public DNS zone transfer was refused; the confirmation and direct queries are the inventory evidence.

## Analytics replacement

- [x] Compare the former Vercel measurements with Cloudflare. [Free-plan HTTP Traffic](https://developers.cloudflare.com/analytics/account-and-zone-analytics/zone-analytics/#free-plan) reports requests, bandwidth, and unique visitors, including crawlers and threats; it does not replace browser page views or Web Vitals. Wrangler's OAuth token can query the zone through Cloudflare GraphQL, but the migration API token lacks zone analytics read permission. The query has no traffic data while the zone is pending.
- [x] Prepare and deploy [Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/about/) in the production CSP and `/privacy`. It measures page views and [Core Web Vitals](https://developers.cloudflare.com/web-analytics/data-metrics/core-web-vitals/) but [does not support custom events](https://developers.cloudflare.com/web-analytics/faq/#does-web-analytics-support-custom-events), so the former `copy`, `citation-click`, and `post-read` events are omitted. Its [beacon](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/) loads from `static.cloudflareinsights.com`; automatic installation sends reports to the same-origin `/cdn-cgi/rum` endpoint. The application has no manual beacon script tag.
- [ ] Add `fiona.sm` at [Web Analytics](https://dash.cloudflare.com/da3ce18220a32da9e5ea44310a9cee4f/web-analytics): select **Add a site**, choose `fiona.sm` from the hostname list, then select **Done**. Cloudflare [enables automatic setup by default](https://developers.cloudflare.com/web-analytics/get-started/#sites-proxied-through-cloudflare). The [RUM site API](https://developers.cloudflare.com/api/resources/rum/subresources/site_info/methods/create/) requires Account Settings Write, which the available CLI credentials lack. [Free-plan RUM excludes EU traffic by default](https://developers.cloudflare.com/speed/observatory/rum-beacon/#rum-excluding-eeaeu), which includes visitors connecting through Cyprus. The Free plan has [no per-page Web Analytics rules](https://developers.cloudflare.com/web-analytics/limits/#rules-limits); automatic injection covers the zone's HTML pages.
- [ ] After activation, verify the public HTML contains one Cloudflare beacon with an integrity attribute, the public CSP allows only its exact external URL, and browser requests send to `/cdn-cgi/rum`. Check `/privacy` against the observed behavior.

## Your step at 101domain

- [x] At [101domain](https://my.101domain.com/), open **Manage Name Servers**, select `fiona.sm`, and continue. Submit the replacement of `ns1.101domain.com`, `ns2.101domain.com`, and `ns5.101domain.com` with exactly:

  ```text
  jerome.ns.cloudflare.com
  mira.ns.cloudflare.com
  ```

  Leave any additional nameserver boxes blank and select **Next** to submit. Follow [101domain's changing-nameservers guide](https://help.101domain.com/kb/changing-name-servers). This changes DNS authority, not the registrar. Do not edit individual DNS records at 101domain for this cutover; Cloudflare already holds their replacements.

- [ ] Wait for 101domain to approve or process the submitted nameserver change. Its [nameserver guide](https://help.101domain.com/kb/changing-name-servers) says updates for some ccTLDs are processed manually but does not identify them. Public `.sm` WHOIS and DNS still list 101domain nameservers. Tell the agent when that changes. Keep the old DNS records in place while delegation propagates so resolvers using cached old nameservers still receive the existing records. If 101domain sends no status update, ask its [support team](https://help.101domain.com/) whether this `.sm` change awaits registry processing or owner confirmation.

[Cloudflare Universal SSL](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/enable-universal-ssl/#full-dns-setup) issues after zone activation; Cloudflare documents a range of 15 minutes to 24 hours. Staged DNS records protect the mail records, but cannot guarantee HTTPS availability immediately after the nameserver switch. The Vercel apex already returns `DEPLOYMENT_DISABLED` before cutover.

A direct request to a Cloudflare edge before activation returned HTTP 409 for `fiona.sm` and failed the TLS handshake. Public route and certificate checks remain open until the zone activates.

Wrangler's remote development session followed the existing Vercel route. A named Preview received no URL while preview URLs are disabled, and a temporary test Worker had no usable TLS address because this account has no registered `workers.dev` subdomain. Both temporary deployments were deleted. Use local Wrangler tests before activation and public checks afterward.

## Agent checks after your step

- [ ] Confirm the `.sm` parent delegates to the two Cloudflare nameservers and Cloudflare marks the zone active. Then check that apex and `www` resolve and serve HTTPS over IPv4 and IPv6, and that the edge certificate covers both hostnames.
- [ ] Verify authoritative and public MX, TXT, DKIM, DMARC, and CAA answers against the staged values. Confirm no DS record was added for `fiona.sm`; `.sm` does not publish the DNSSEC chain needed to validate it.
- [ ] Verify TLS, `/`, `/blog`, `/canary`, `/fiona.asc`, `/posts.asc`, `/feed.xml`, WKD, social images, `www` and HTTP redirects with paths and query strings, security headers, and missing signed archives against the public site. Check the signed article text against the published post manifest.
- [ ] If automatic repository deployments are wanted, create a user-scoped Cloudflare API token with **Workers Builds Configuration: Edit** and **Workers Scripts: Read**, then authorize the GitHub connection in Workers Builds. The [Builds API requires a user-scoped token](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/); the available account-scoped migration token fails authentication for this API. Create the token at [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens). Do not add the migration token to GitHub Actions. Direct Wrangler deployment is configured and does not need GitHub secrets.
- [ ] Retire the Vercel project only after production checks pass. Revoke the [migration token](https://dash.cloudflare.com/profile/api-tokens) when it is no longer needed.
- [ ] Review the local migration changes before any repository release. Do not push to the live repository. No commit is authorized; an agent commit requires a separate explicit request and must use `git-bot`.

## Your mail check after activation

- [ ] Send a message from a non-Proton address to `mail@fiona.sm`, confirm it arrives in Proton, and reply to confirm outbound delivery. DNS answers alone cannot prove mail delivery.

## Merge gate

- [ ] `just quality` reports the [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). `bun pm why braces` identifies its development-tool dependency path; `just osv` prints the live finding and whether an upstream fix exists. Keep the scan enabled and report this gate as failing until a remediation exists.
- [x] Run CodeRabbit against tracked and untracked migration changes under the `openbunny` plan. Its review found a preview configuration mismatch and duplicate reports of the `/blog/page/1` redirect mismatch. Both changes are applied locally; a fresh follow-up review completed with no findings. `just check` and the local Wrangler end-to-end suite passed after the fixes.
