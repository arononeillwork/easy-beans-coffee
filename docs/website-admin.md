# Website admin (`/admin/website`)

The owner's website desk. It sits behind the leads admin token (`ADMIN_LEADS_TOKEN`), not the
board PIN, because a DNS change can take the site and email offline. It has two tabs.

## Domain & DNS

- **Domain names** come from the Vercel project (the addresses the site answers on). Each one
  shows whether Vercel has verified it and whether DNS points at Vercel. When a record is
  missing, the row shows it (e.g. `TXT _vercel… → vc-domain-verify=…`, or `CNAME shop → cname.vercel-dns.com`)
  with an **Add it in Cloudflare** button that creates it in the zone. Proxy is left off for
  these, because Vercel issues its own certificate. **Connect a domain** adds a new name (or
  a redirect) to the project. **Remove** takes it off the project but leaves its DNS alone.
- **DNS records** are every record in the Cloudflare zone, editable in place: type, name (`@`
  for the apex, or a label like `www`), value, TTL, MX/SRV priority and the Cloudflare proxy.
  A save goes live immediately. Before deleting a record you have to tick a confirmation box.
  Types the editor doesn't handle (PTR, DS, …) are listed read-only.

### Setup

| Variable | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → *Create token* → "Edit zone DNS" template, scoped to the one zone |
| `CLOUDFLARE_ZONE_ID` | *(optional)* Pins the zone; otherwise it is looked up by name |
| `WEBSITE_DOMAIN` | *(optional)* The zone's domain. Defaults to `NEXT_PUBLIC_SITE_URL` without `www.` |
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens, with access to the team that owns the project |
| `VERCEL_TEAM_ID` | The team id (`team_…`) when the project is under a team, e.g. arononeillworks-projects |
| `VERCEL_PROJECT_ID` | *(optional)* Project id or name. Defaults to `easy-beans-coffee` |

Either half works without the other. If its variables are unset, that card shows setup help
instead.

## Website studio

There are two ways to start:

- **I have a website** → enter its address. The server reads the page (its title, headings,
  copy, links, images and colours, without the markup) and Claude designs a fresh version that
  keeps the real content. The reader refuses private and loopback addresses, and checks again
  on every redirect. A site that renders everything in JavaScript has no readable content, and
  the studio says so.
- **I don't have a website yet** → fill in a short brief (name, type, location, description,
  look and feel, contact details) and Claude generates an example site.

Every draft is one self-contained HTML file. It is saved as a numbered version (v1, v2, …) and
previewed in a sandboxed frame: no scripts run, and the frame can't reach the admin's cookies.
**Regenerate** with notes to revise the version you're looking at, or with no notes for a
completely different design. Previews are free.

**Buy** is a separate one-off purchase: a Square quick-pay link for the build-out of the chosen
version, kept apart from the café catalog and the collection-order checkout. After payment,
Square sends the owner back to the studio. The project is marked paid as soon as its Square
order has a tender (the page checks this each time it opens). Paid projects unlock the HTML
download, and they can't be regenerated or deleted.

### Setup

| Variable | Value |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude API key (console.anthropic.com). Generation uses `claude-opus-5-5`, with refusal fallbacks on |
| `WEBSITE_PRICE_NEW_CENTS` | *(optional)* Price of a new site build. Default `49900` (€499) |
| `WEBSITE_PRICE_REDESIGN_CENTS` | *(optional)* Price of a redesign build. Default `39900` (€399) |

It also needs Supabase migration `0012_website_studio.sql` (the tables `website_projects` and
`website_versions`) and the existing Square variables. A generation takes a minute or two.
The page sets `maxDuration = 300`, which fits within Vercel Pro's function limit.
