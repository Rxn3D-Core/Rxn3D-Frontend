"use client"

import { useEffect, useRef } from "react"
import { Bold, Italic, Link2, List, ListOrdered, Underline } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EMPTY_EDITOR_HTML, normalizeStatementEmailMessageHtml } from "@/lib/statement-email-rich-text"

type StatementEmailRichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  label?: string
}

type ToolbarAction = "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList" | "createLink"

export function StatementEmailRichTextEditor({
  value,
  onChange,
  label = "Body",
}: StatementEmailRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const element = editorRef.current
    if (!element) return

    const nextHtml = normalizeStatementEmailMessageHtml(value)
    if (element.innerHTML !== nextHtml) {
      element.innerHTML = nextHtml
    }
  }, [value])

  const emitChange = () => {
    const element = editorRef.current
    if (!element) return
    onChange(element.innerHTML || EMPTY_EDITOR_HTML)
  }

  const runCommand = (command: ToolbarAction) => {
    if (typeof document === "undefined") return
    editorRef.current?.focus()

    if (command === "createLink") {
      const url = window.prompt("Enter a full URL", "https://")
      if (!url) return
      document.execCommand(command, false, url)
      emitChange()
      return
    }

    document.execCommand(command, false)
    emitChange()
  }

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <span className="mr-2 text-sm font-semibold text-black">{label}</span>
        <Button type="button" variant="outline" size="sm" className="h-8 px-2" onClick={() => runCommand("bold")}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 px-2" onClick={() => runCommand("italic")}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 px-2" onClick={() => runCommand("underline")}>
          <Underline className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 px-2" onClick={() => runCommand("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 px-2" onClick={() => runCommand("insertOrderedList")}>
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 px-2" onClick={() => runCommand("createLink")}>
          <Link2 className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        className="min-h-[11rem] px-4 py-3 text-sm leading-7 text-black outline-none [&_a]:text-[#1565b3] [&_a]:underline [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc"
      />
    </div>
  )
}
