// Mock API for the RXN-48 offboarding dialog. Serves the contract fixtures in e2e/fixtures/rxn-48.
// Usage: node e2e/mock/rxn-48-mock-api.mjs <port>   (task port: 8100 + N mod 100 = 8151). Never 8080.
// Control (used by the Playwright spec):
//   POST /__mock/scenario {"preview":"open-cases","submit":"ok"|"stale"|"last-admin"|"invalid"|"inactive"}
//   GET  /__mock/requests   -> recorded calls to the offboarding endpoints
//   POST /__mock/reset
import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/rxn-48")
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), "utf8"))
const port = Number(process.argv[2] || 8151)
if (port === 8080 || port === 3000) throw new Error("Refusing to use a protected port")

const SUBMIT = {
  ok: ["offboard-200", 200],
  stale: ["offboard-409-stale", 409],
  "last-admin": ["offboard-409-last-admin", 409],
  invalid: ["offboard-422-target", 422],
  inactive: ["access-403-membership-inactive", 403],
}

const MEMBERS = { 812: "Ana Ruiz", 813: "Ben Ortiz" }
let scenario = { preview: "open-cases", submit: "ok" }
let requests = []
let left = false // set after a successful self-leave so /me stops listing the organization

const me = () => ({
  success: true,
  data: {
    id: 812, first_name: "Ana", last_name: "Ruiz", email: "ana@example.test", status: "Active",
    customers: [
      ...(left ? [] : [{ id: 55, name: "Smile Dental", type: "office", is_primary: true }]),
      { id: 56, name: "Bright Smiles", type: "office", is_primary: left },
    ],
  },
})

const send = (res, status, body) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "*",
  })
  res.end(JSON.stringify(body))
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`)
    let raw = ""
    req.on("data", (c) => (raw += c))
    req.on("end", () => {
      if (req.method === "OPTIONS") return send(res, 204, {})
      const body = raw ? JSON.parse(raw) : null
      const p = url.pathname

      if (p === "/__mock/scenario") { scenario = { ...scenario, ...body }; left = false; return send(res, 200, scenario) }
      if (p === "/__mock/reset") { scenario = { preview: "open-cases", submit: "ok" }; requests = []; left = false; return send(res, 200, {}) }
      if (p === "/__mock/requests") return send(res, 200, requests)

      if (req.method === "GET" && p.endsWith("/offboarding-preview")) {
        requests.push({ method: "GET", path: p })
        const f = fixture(`preview-${scenario.preview}`)
        if (p.startsWith("/me/")) f.data.is_self = true
        // Admin route: show the member that was asked for (office members only; the lab fixture has its own).
        const asked = /^\/customers\/\d+\/users\/(\d+)\//.exec(p)
        if (asked && f.data.customer.type === "office") {
          f.data.member = { ...f.data.member, user_id: Number(asked[1]), name: MEMBERS[asked[1]] ?? f.data.member.name }
        }
        return send(res, 200, f)
      }
      if (req.method === "POST" && (p.endsWith("/leave") || p.endsWith("/offboard"))) {
        requests.push({ method: "POST", path: p, body })
        const [name, status] = SUBMIT[scenario.submit] ?? SUBMIT.ok
        if (status === 200 && p.endsWith("/leave")) left = true
        // A stale answer is served once; the refreshed list then submits fine.
        if (scenario.submit === "stale") scenario.submit = "ok"
        return send(res, status, fixture(name))
      }
      if (req.method === "POST" && p === "/set-customer-id") {
        requests.push({ method: "POST", path: p, body })
        return send(res, 200, { success: true, data: { customer_id: body?.customer_id } })
      }
      if (req.method === "GET" && p === "/users/permissions") {
        const customerId = Number(url.searchParams.get("customer_id") || 55)
        const permissions = ["view_users", "view_user", "edit_user", "delete_user", "create_user"]
        return send(res, 200, {
          success: true,
          data: {
            customer_id: customerId,
            role: customerId === 7 ? "lab_admin" : "office_admin",
            permissions,
            role_permissions: permissions,
            override_permissions: [],
          },
        })
      }
      if (req.method === "GET" && p === "/me") return send(res, 200, me())
      if (req.method === "GET" && p === "/users") {
        return send(res, 200, {
          success: true,
          data: [
            { id: 812, first_name: "Ana", last_name: "Ruiz", email: "ana@example.test", status: "Active", created_at: "2026-01-02T00:00:00Z",
              customer_users: [{ customer_id: 55, status: "Active", role: { name: "doctor" } }], customers: [{ id: 55, name: "Smile Dental", type: "office" }] },
            { id: 813, first_name: "Ben", last_name: "Ortiz", email: "ben@example.test", status: "Active", created_at: "2026-01-03T00:00:00Z",
              customer_users: [{ customer_id: 55, status: "Active", role: { name: "doctor" } }], customers: [{ id: 55, name: "Smile Dental", type: "office" }] },
          ],
        })
      }
      // Anything else: an empty success so unrelated widgets stay quiet.
      return send(res, 200, { success: true, message: "mock", data: [] })
    })
  })
  .listen(port, "127.0.0.1", () => console.log(`rxn-48 mock API on http://127.0.0.1:${port}`))
