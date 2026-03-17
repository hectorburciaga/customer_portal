import frappe
from frappe import _

# Registers the page in Portal Settings so Frappe enforces role-based access.
# This alone is not sufficient — the explicit guard in get_context is required.
page_roles = ["Customer", "Sales User", "Sales Manager", "System Manager", "Administrator"]


def get_context(context):
    # ── Auth guard (hard redirect — runs before any data is fetched) ─────────
    #
    # page_roles only works if the page is registered in Portal Settings.
    # This explicit check is the reliable enforcement layer and handles all
    # cases: guests, users with no Customer role, and direct URL access.
    #
    # frappe.local.response["location"] triggers an immediate HTTP 301
    # redirect at the WSGI layer, before any HTML is rendered.

    if frappe.session.user == "Guest":
        frappe.local.response["type"] = "redirect"
        frappe.local.response["location"] = "/login?redirect-to=/customer_portal"
        raise frappe.Redirect

    # Also block logged-in users who don't have the Customer role
    if not _has_customer_role():
        frappe.throw(
            _("You do not have permission to access this page."),
            frappe.PermissionError,
        )

    # Disable page caching so every customer sees their own live data
    context.no_cache = 1

    # ── Resolve the Customer record linked to this portal user ───────────────
    customer_name = _get_customer(frappe.session.user)

    if not customer_name:
        frappe.throw(
            _("No Customer record is linked to your account. Please contact support."),
            frappe.PermissionError,
        )

    user_doc = frappe.get_doc("User", frappe.session.user)
    context.customer_name = customer_name
    context.user_full_name = user_doc.full_name
    context.user_email = user_doc.email

    # ── Fetch all portal data ────────────────────────────────────────────────
    context.quotations   = _get_quotations(customer_name)
    context.sales_orders = _get_sales_orders(customer_name)
    context.invoices     = _get_invoices(customer_name)
    context.payments     = _get_payments(customer_name)
    context.issues       = _get_issues(customer_name)
    context.addresses    = _get_addresses(customer_name)

    # ── Dashboard KPI summary ────────────────────────────────────────────────
    context.kpi = _build_kpi(
        context.quotations,
        context.sales_orders,
        context.invoices,
        context.issues,
    )

    # ── Recent activity feed (last 5 events across all doctypes) ─────────────
    context.recent_activity = _get_recent_activity(customer_name)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _has_customer_role():
    """Returns True if the current user has the 'Customer' role assigned."""
    return frappe.db.exists(
        "Has Role",
        {"parent": frappe.session.user, "role": "Customer"},
    )


def _get_customer(user_email):
    """
    Returns the Customer name linked to the portal user.
    ERPNext stores the customer's email on the Customer doctype directly,
    or via the linked Contact. We try both approaches.
    """
    # 1. Direct match on Customer.email_id (common in simple setups)
    customer = frappe.db.get_value(
        "Customer", {"email_id": user_email}, "name"
    )
    if customer:
        return customer

    # 2. Match via Contact → Dynamic Link to Customer
    contact = frappe.db.get_value(
        "Contact Email", {"email_id": user_email, "parenttype": "Contact"}, "parent"
    )
    if contact:
        customer = frappe.db.get_value(
            "Dynamic Link",
            {"parent": contact, "link_doctype": "Customer"},
            "link_name",
        )
        if customer:
            return customer

    return None


# ── Quotations ───────────────────────────────────────────────────────────────

def _get_quotations(customer_name):
    rows = frappe.get_list(
        "Quotation",
        filters={
            "party_name": customer_name,
            "quotation_to": "Customer",
            "docstatus": ["!=", 2],          # exclude cancelled
        },
        fields=[
            "name",
            "transaction_date",
            "valid_till",
            "grand_total",
            "status",
        ],
        order_by="transaction_date desc",
        limit=50,
    )

    for row in rows:
        row["item_count"] = frappe.db.count(
            "Quotation Item", {"parent": row["name"]}
        )
        row["status_class"] = _quotation_badge(row["status"])

    return rows


def _quotation_badge(status):
    return {
        "Draft":    "badge-grey",
        "Open":     "badge-amber",
        "Replied":  "badge-blue",
        "Ordered":  "badge-green",
        "Lost":     "badge-red",
        "Cancelled":"badge-red",
        "Expired":  "badge-red",
    }.get(status, "badge-grey")


# ── Sales Orders ─────────────────────────────────────────────────────────────

def _get_sales_orders(customer_name):
    rows = frappe.get_list(
        "Sales Order",
        filters={
            "customer": customer_name,
            "docstatus": 1,                  # submitted only
        },
        fields=[
            "name",
            "transaction_date",
            "delivery_date",
            "grand_total",
            "status",
            "per_delivered",
            "per_billed",
        ],
        order_by="transaction_date desc",
        limit=50,
    )

    for row in rows:
        row["item_count"] = frappe.db.count(
            "Sales Order Item", {"parent": row["name"]}
        )
        row["status_class"] = _so_badge(row["status"])

    return rows


def _so_badge(status):
    return {
        "Draft":              "badge-grey",
        "To Deliver and Bill":"badge-blue",
        "To Deliver":         "badge-blue",
        "To Bill":            "badge-amber",
        "Completed":          "badge-green",
        "Cancelled":          "badge-red",
        "Closed":             "badge-grey",
        "On Hold":            "badge-purple",
    }.get(status, "badge-grey")


# ── Sales Invoices ───────────────────────────────────────────────────────────

def _get_invoices(customer_name):
    rows = frappe.get_list(
        "Sales Invoice",
        filters={
            "customer": customer_name,
            "docstatus": 1,
        },
        fields=[
            "name",
            "posting_date",
            "due_date",
            "grand_total",
            "outstanding_amount",
            "status",
        ],
        order_by="posting_date desc",
        limit=50,
    )

    for row in rows:
        # Resolve the originating Sales Order (first linked SO, if any)
        so_ref = frappe.db.get_value(
            "Sales Invoice Item",
            {"parent": row["name"]},
            "sales_order",
        )
        row["sales_order_ref"] = so_ref or ""
        row["status_class"] = _invoice_badge(row["status"])

    return rows


def _invoice_badge(status):
    return {
        "Unpaid":            "badge-amber",
        "Paid":              "badge-green",
        "Partly Paid":       "badge-blue",
        "Overdue":           "badge-red",
        "Return":            "badge-grey",
        "Credit Note Issued":"badge-purple",
        "Cancelled":         "badge-red",
    }.get(status, "badge-grey")


# ── Payment Entries ──────────────────────────────────────────────────────────

def _get_payments(customer_name):
    rows = frappe.get_list(
        "Payment Entry",
        filters={
            "party_type": "Customer",
            "party": customer_name,
            "docstatus": 1,
            "payment_type": "Receive",
        },
        fields=[
            "name",
            "posting_date",
            "paid_amount",
            "mode_of_payment",
            "reference_no",
            "remarks",
        ],
        order_by="posting_date desc",
        limit=50,
    )

    for row in rows:
        # Attach the invoice(s) this payment was applied to
        refs = frappe.get_all(
            "Payment Entry Reference",
            filters={"parent": row["name"], "reference_doctype": "Sales Invoice"},
            fields=["reference_name", "allocated_amount"],
        )
        row["invoice_refs"] = refs
        row["status_class"] = "badge-green"   # submitted payment entries are completed

    # Also surface outstanding invoices as "pending" items in the timeline
    outstanding = frappe.get_list(
        "Sales Invoice",
        filters={
            "customer": customer_name,
            "docstatus": 1,
            "outstanding_amount": [">", 0],
        },
        fields=["name", "due_date", "outstanding_amount", "status"],
        order_by="due_date asc",
    )

    return {
        "received": rows,
        "outstanding": outstanding,
        "total_paid": sum(r["paid_amount"] for r in rows),
        "total_outstanding": sum(o["outstanding_amount"] for o in outstanding),
    }


# ── Issues ───────────────────────────────────────────────────────────────────

def _get_issues(customer_name):
    rows = frappe.get_list(
        "Issue",
        filters={"customer": customer_name},
        fields=[
            "name",
            "subject",
            "status",
            "priority",
            "opening_date",
            "modified",
        ],
        order_by="modified desc",
        limit=50,
    )

    for row in rows:
        row["status_class"]   = _issue_badge(row["status"])
        row["priority_class"] = _priority_badge(row["priority"])

    return rows


def _issue_badge(status):
    return {
        "Open":        "badge-blue",
        "Replied":     "badge-amber",
        "Hold":        "badge-purple",
        "Resolved":    "badge-green",
        "Closed":      "badge-grey",
        "Cancelled":   "badge-red",
    }.get(status, "badge-grey")


def _priority_badge(priority):
    return {
        "Low":      "badge-grey",
        "Medium":   "badge-amber",
        "High":     "badge-red",
        "Urgent":   "badge-red",
    }.get(priority, "badge-grey")


# ── Addresses ────────────────────────────────────────────────────────────────

def _get_addresses(customer_name):
    # Addresses are linked via Dynamic Link
    linked = frappe.get_all(
        "Dynamic Link",
        filters={"link_doctype": "Customer", "link_name": customer_name, "parenttype": "Address"},
        fields=["parent"],
    )

    address_names = [row["parent"] for row in linked]
    if not address_names:
        return []

    addresses = []
    for addr_name in address_names:
        doc = frappe.get_doc("Address", addr_name)
        addresses.append({
            "name":           doc.name,
            "address_title":  doc.address_title,
            "address_type":   doc.address_type,
            "address_line1":  doc.address_line1,
            "address_line2":  doc.address_line2 or "",
            "city":           doc.city,
            "state":          doc.state or "",
            "pincode":        doc.pincode or "",
            "country":        doc.country,
            "is_primary_address": doc.is_primary_address,
            "is_shipping_address": doc.is_shipping_address,
        })

    # Primary billing address first, then shipping, then rest
    addresses.sort(key=lambda a: (
        not a["is_primary_address"],
        not a["is_shipping_address"],
    ))

    return addresses


# ── Dashboard KPIs ────────────────────────────────────────────────────────────

def _build_kpi(quotations, sales_orders, invoices, issues):
    open_orders = sum(
        1 for so in sales_orders
        if so["status"] in ("To Deliver and Bill", "To Deliver", "To Bill")
    )
    pending_quotes = sum(
        1 for q in quotations if q["status"] in ("Open", "Draft")
    )
    unpaid_invoices = [
        inv for inv in invoices if inv["outstanding_amount"] > 0
    ]
    outstanding_total = sum(inv["outstanding_amount"] for inv in unpaid_invoices)
    orders_total = sum(
        so["grand_total"] or 0 for so in sales_orders
        if so["status"] in ("To Deliver and Bill", "To Bill")
    )
    open_issues = sum(
        1 for iss in issues if iss["status"] in ("Open", "Replied", "Hold")
    )
    in_progress_issues = sum(
        1 for iss in issues if iss["status"] == "Replied"
    )

    return {
        "open_orders":        open_orders,
        "pending_quotes":     pending_quotes,
        "outstanding_total":  outstanding_total,
        "unpaid_count":       len(unpaid_invoices),
        "orders_total":       orders_total,
        "open_issues":        open_issues,
        "in_progress_issues": in_progress_issues,
    }


# ── Recent Activity Feed ─────────────────────────────────────────────────────

def _get_recent_activity(customer_name):
    """
    Builds a unified, time-sorted activity feed from the last 10 events
    across Sales Orders, Invoices, Payments, and Issues.
    """
    events = []

    # Latest Sales Orders
    for so in frappe.get_list(
        "Sales Order",
        filters={"customer": customer_name, "docstatus": 1},
        fields=["name", "transaction_date", "status"],
        order_by="transaction_date desc",
        limit=3,
    ):
        events.append({
            "date":  so["transaction_date"],
            "color": "var(--amber)",
            "text":  f"Sales Order <strong>{so['name']}</strong> — {so['status']}",
        })

    # Latest Invoices
    for inv in frappe.get_list(
        "Sales Invoice",
        filters={"customer": customer_name, "docstatus": 1},
        fields=["name", "posting_date", "status"],
        order_by="posting_date desc",
        limit=3,
    ):
        events.append({
            "date":  inv["posting_date"],
            "color": "var(--blue)",
            "text":  f"Invoice <strong>{inv['name']}</strong> — {inv['status']}",
        })

    # Latest Payments
    for pay in frappe.get_list(
        "Payment Entry",
        filters={"party_type": "Customer", "party": customer_name, "docstatus": 1},
        fields=["name", "posting_date", "paid_amount"],
        order_by="posting_date desc",
        limit=3,
    ):
        events.append({
            "date":  pay["posting_date"],
            "color": "var(--green)",
            "text":  f"Payment received <strong>{frappe.format_value(pay['paid_amount'], 'Currency')}</strong> — {pay['name']}",
        })

    # Latest Issues
    for iss in frappe.get_list(
        "Issue",
        filters={"customer": customer_name},
        fields=["name", "opening_date", "subject", "status"],
        order_by="opening_date desc",
        limit=2,
    ):
        events.append({
            "date":  iss["opening_date"],
            "color": "var(--red)",
            "text":  f"Issue <strong>{iss['name']}</strong> opened — {iss['subject']}",
        })

    # Sort descending by date and return the 5 most recent
    events.sort(key=lambda e: e["date"], reverse=True)
    return events[:5]
