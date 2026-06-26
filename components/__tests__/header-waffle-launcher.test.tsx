import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HeaderWaffleLauncher } from "@/components/header-waffle-launcher"

// Mock auth context
jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { roles: ["lab_admin"] },
    profilePermissions: [],
    isSuperadmin: false,
  }),
}))

// Mock menu config
jest.mock("@/config/sidebar-menu", () => ({
  getMenuForProfile: () => [
    { id: "dashboard", title: "Dashboard", path: "/dashboard", icon: null, permission: [] },
    {
      id: "cases",
      title: "Cases",
      icon: null,
      children: [
        { id: "all-cases", title: "All Cases", path: "/cases/all", icon: null, permission: [] },
      ],
    },
  ],
}))

jest.mock("@/lib/menu-permissions", () => ({
  filterMenuByPermissions: (_items: any, _perms: any, isSuperadmin: boolean) =>
    isSuperadmin ? _items : _items,
}))

jest.mock("@/lib/get-primary-role", () => ({ getPrimaryRole: () => "lab_admin" }))
jest.mock("@/lib/permissions", () => ({ PROFILE_SCOPED_ROLES: ["lab_admin"] }))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }))

describe("HeaderWaffleLauncher", () => {
  it("renders the grid trigger button", () => {
    render(<HeaderWaffleLauncher />)
    expect(screen.getByRole("button", { name: /open navigation/i })).toBeInTheDocument()
  })

  it("opens popover on click and shows nav tiles", async () => {
    render(<HeaderWaffleLauncher />)
    await userEvent.click(screen.getByRole("button", { name: /open navigation/i }))
    expect(screen.getByText("menu.dashboard")).toBeInTheDocument()
    expect(screen.getByText("menu.all-cases")).toBeInTheDocument()
  })

  it("does NOT render parent-only items without a path", async () => {
    render(<HeaderWaffleLauncher />)
    await userEvent.click(screen.getByRole("button", { name: /open navigation/i }))
    // "cases" has no path — only its child "all-cases" should appear
    expect(screen.queryByText("menu.cases")).not.toBeInTheDocument()
  })

  it("highlights the active tile", async () => {
    render(<HeaderWaffleLauncher />)
    await userEvent.click(screen.getByRole("button", { name: /open navigation/i }))
    const dashboardLink = screen.getByRole("link", { name: /menu.dashboard/i })
    expect(dashboardLink.closest("div")).toHaveClass("ring-2")
  })
})
