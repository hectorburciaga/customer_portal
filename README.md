# Customer Portal

A self-service portal for ERPNext customers built on the Frappe Framework.
Customers can view their quotations, sales orders, invoices, payments, issues,
and addresses — and take actions like creating issues, editing addresses, and
downloading PDF documents.

---

## File Structure

```
your_app/
├── hooks.py                          ← Register assets + portal menu
├── __init__.py
│
├── www/
│   └── customer_portal/
│       ├── customer_portal.html      ← Main page template (shell + includes)
│       ├── customer_portal.py        ← Auth guard + all data fetching
│       │
│       ├── sections/                 ← One partial per portal section
│       │   ├── overview.html
│       │   ├── quotations.html
│       │   ├── sales_orders.html
│       │   ├── invoices.html
│       │   ├── payments.html
│       │   ├── issues.html
│       │   └── addresses.html
│       │
│       └── modals/                   ← One partial per modal / panel
│           ├── address_modal.html
│           ├── issue_modal.html
│           ├── print_modal.html
│           └── notification_panel.html
│
└── public/                           ← Served at /assets/customer_portal/
    ├── css/
    │   └── portal.css
    └── js/
        ├── portal_nav.js             ← Navigation, hash routing, filters
        └── portal_modals.js          ← Modals, notifications, user menu
```

---

## Deployment Steps

### 1. Place the files

Copy the folder structure above into your Frappe app. If your app is named
`myapp`, replace every occurrence of `customer_portal` in asset paths with
`myapp`.

```
# www files go here:
apps/myapp/myapp/www/customer_portal/

# Static assets go here (served at /assets/myapp/):
apps/myapp/myapp/public/css/portal.css
apps/myapp/myapp/public/js/portal_nav.js
apps/myapp/myapp/public/js/portal_modals.js
```

### 2. Update asset paths

If your app name differs from `customer_portal`, update these three references:

**customer_portal.html** (lines 9, 137, 138):
```html
<link rel="stylesheet" href="/assets/YOUR_APP/css/portal.css" />
...
<script src="/assets/YOUR_APP/js/portal_nav.js"></script>
<script src="/assets/YOUR_APP/js/portal_modals.js"></script>
```

**hooks.py**:
```python
web_include_css = ["/assets/YOUR_APP/css/portal.css"]
web_include_js  = ["/assets/YOUR_APP/js/portal_nav.js",
                   "/assets/YOUR_APP/js/portal_modals.js"]
```

### 3. Run bench migrate + build

```bash
bench --site your.site migrate
bench build --app YOUR_APP
bench --site your.site clear-cache
```

### 4. Register in Portal Settings (Frappe Desk)

Go to **Portal Settings → Portal Menu** and add:

| Title            | Route             | Role     |
|------------------|-------------------|----------|
| Customer Portal  | /customer_portal  | Customer |

This makes `page_roles` enforcement active. The explicit auth guard in
`customer_portal.py` also protects the page independently.

### 5. Link customers to portal users

Each portal user must have the **Customer** role assigned and must be linked
to a Customer record via one of:
- `Customer.email_id` field matching the user's email
- A **Contact** linked to the Customer via Dynamic Link, with a matching email

---

## Web Form URLs

The portal embeds these Frappe web forms in modals. Update them to match
your site's domain.

| Modal     | URL                          | Modes                        |
|-----------|------------------------------|------------------------------|
| Address   | `https://yoursite.com/address` | `?new=1` / `?name=<name>`  |
| Issue     | `https://yoursite.com/issues`  | `?new=1` / `?name=<name>`  |
| Profile   | `https://yoursite.com/me`      | Opens in new tab             |

Update these constants in `portal_modals.js`:
```js
const BASE_URL       = 'https://yoursite.com/address';
const ISSUE_BASE_URL = 'https://yoursite.com/issues';
```

And the profile link in `customer_portal.html`:
```html
<a href="https://yoursite.com/me" target="_blank">My Profile</a>
```

And the logout redirect in `portal_modals.js`:
```js
window.location.href = 'https://yoursite.com';
```

---

## Customisation Reference

### Adding a new section

1. Create `www/customer_portal/sections/my_section.html`
2. Add `{% include "www/customer_portal/sections/my_section.html" %}` to `customer_portal.html`
3. Add a nav item in `customer_portal.html` with `data-section="my-section"`
4. Add the section ID to the `SECTIONS` object in `portal_nav.js`
5. Fetch data in `customer_portal.py` and add it to `context`

### Adding a new modal

1. Create `www/customer_portal/modals/my_modal.html`
2. Add `{% include "www/customer_portal/modals/my_modal.html" %}` to `customer_portal.html`
3. Add open/close functions in `portal_modals.js`
4. Add the modal to the Escape key handler chain in `portal_modals.js`

### Changing the colour scheme

All colours are CSS custom properties in `portal.css` under `:root`. Change
them there and every component updates automatically.

### Adjusting the KPI grid columns

The grid breakpoints are at the bottom of `portal.css`:
```css
@media (max-width: 1100px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 400px)  { .kpi-grid { grid-template-columns: 1fr; } }
```

---

## JS Architecture

### portal_nav.js
- `navigate(sectionId)` — activates a section, updates the URL hash
- `reloadToSection()` — used by modals after save to reload on the same section
- `applyFilters(section)` — filters rows by chip status + search query
- Global topbar search proxies into each section's local search input

### portal_modals.js
- Each modal has an `_isOpen` flag to prevent stale `load` event side-effects
- `src` is never cleared on close — it is overwritten on next open instead
- All Frappe API calls include the `X-Frappe-CSRF-Token` header read from cookies
- Notifications use optimistic UI — DOM updates before the API call resolves
