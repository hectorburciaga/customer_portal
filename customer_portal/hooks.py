# hooks.py — Customer Portal App
# ─────────────────────────────────────────────────────────────────
# Add these entries to your app's hooks.py.
# Replace "customer_portal" with your actual Frappe app name if different.

app_name        = "customer_portal"
app_title       = "Customer Portal"
app_publisher   = "Bimxcloud"
app_description = "Bimxcloud Customer Portal"
app_version     = "1.0.0"

# ── Portal page roles ─────────────────────────────────────────
# Ensures the page shows up in Portal Settings and enforces
# the Customer role before get_context even runs.
portal_menu_items = [
    {
        "title": "Customer Portal",
        "route": "/customer_portal",
        "reference_doctype": "Customer",
        "role": ["Customer", "Sales User", "Sales Manager", "System Manager"],
    }
]

# ── Static assets ─────────────────────────────────────────────
# Frappe serves files from <app>/public/ at /assets/<app_name>/
# So  customer_portal/public/css/portal.css
#  → /assets/customer_portal/css/portal.css
#
# The web_include_* lists below inject the files into every portal
# page automatically. If you prefer to load them only on the
# customer_portal page, reference them directly in the HTML
# <link> / <script> tags instead and remove these entries.

web_include_css = [
    "/assets/customer_portal/css/portal.css",
]

web_include_js = [
    "/assets/customer_portal/js/portal_nav.js",
    "/assets/customer_portal/js/portal_modals.js",
]

# ── Jinja environment ─────────────────────────────────────────
# Exposes frappe.format_value / frappe.format_date inside templates.
# These are available by default in Frappe's Jinja environment;
# no extra configuration is needed.
