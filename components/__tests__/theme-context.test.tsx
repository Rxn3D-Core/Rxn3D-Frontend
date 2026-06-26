import { render, act } from "@testing-library/react"
import { ThemeProvider, useTheme } from "@/contexts/theme-context"

function ToggleButton() {
  const { theme, setTheme } = useTheme()
  return <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme}</button>
}

function DarkButton() {
  const { setTheme } = useTheme()
  return <button onClick={() => setTheme("dark")}>go dark</button>
}

function LightButton() {
  const { setTheme } = useTheme()
  return <button onClick={() => setTheme("light")}>go light</button>
}

beforeEach(() => {
  document.documentElement.classList.remove("dark")
  localStorage.clear()
})

test("defaults to light — no .dark class on html", () => {
  render(
    <ThemeProvider storageKey="t1">
      <div />
    </ThemeProvider>
  )
  expect(document.documentElement.classList.contains("dark")).toBe(false)
})

test("setTheme('dark') adds .dark class to documentElement", () => {
  const { getByText } = render(
    <ThemeProvider storageKey="t2">
      <DarkButton />
    </ThemeProvider>
  )
  act(() => { getByText("go dark").click() })
  expect(document.documentElement.classList.contains("dark")).toBe(true)
})

test("setTheme('light') removes .dark class from documentElement", () => {
  document.documentElement.classList.add("dark")
  const { getByText } = render(
    <ThemeProvider storageKey="t3" defaultTheme="dark">
      <LightButton />
    </ThemeProvider>
  )
  act(() => { getByText("go light").click() })
  expect(document.documentElement.classList.contains("dark")).toBe(false)
})

test("defaultTheme='dark' adds .dark class on mount", () => {
  render(
    <ThemeProvider storageKey="t4" defaultTheme="dark">
      <div />
    </ThemeProvider>
  )
  expect(document.documentElement.classList.contains("dark")).toBe(true)
})

test("persists theme to localStorage", () => {
  const { getByText } = render(
    <ThemeProvider storageKey="t5">
      <DarkButton />
    </ThemeProvider>
  )
  act(() => { getByText("go dark").click() })
  expect(localStorage.getItem("t5")).toBe("dark")
})
