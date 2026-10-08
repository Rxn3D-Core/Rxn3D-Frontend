"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { createCapacityAddon, deleteCapacityAddon, listCapacityAddons, updateCapacityAddon, type CapacityAddon } from "@/lib/api/billing-config-entitlements"

export function CapacityAddonManager() {
  const { toast } = useToast()
  const [rows, setRows] = useState<CapacityAddon[]>([])
  const [name, setName] = useState("")
  const [addonType, setAddonType] = useState<CapacityAddon["addon_type"]>("office_connection")
  const [units, setUnits] = useState("10")
  const [fee, setFee] = useState("25")
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await listCapacityAddons())
    } catch (error: any) {
      toast({ title: "Could not load capacity add-ons", description: error?.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  async function create() {
    setMutating(true)
    try {
      await createCapacityAddon({
        name,
        addon_type: addonType,
        units: Number(units),
        monthly_fee: Number(fee),
        active: true,
      })
      setName("")
      toast({ title: "Capacity add-on created" })
      await load()
    } catch (error: any) {
      toast({ title: "Create failed", description: error?.message, variant: "destructive" })
    } finally {
      setMutating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capacity add-ons</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-5">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={addonType}
            onChange={(e) => setAddonType(e.target.value as CapacityAddon["addon_type"])}
          >
            <option value="office_connection">+ connections</option>
            <option value="admin_seat">+ admin seat</option>
            <option value="user_seat">+ user seats</option>
          </select>
          <Input placeholder="Units" value={units} onChange={(e) => setUnits(e.target.value)} />
          <Input placeholder="Monthly fee" value={fee} onChange={(e) => setFee(e.target.value)} />
          <Button disabled={mutating || !name} onClick={() => void create()}>
            Add pack
          </Button>
        </div>
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="text-xs text-slate-500">
                  {row.addon_type} · +{row.units} · ${row.monthly_fee}/mo
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={row.active}
                  onCheckedChange={(active) =>
                    void updateCapacityAddon(row.id, { active }).then(load)
                  }
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void deleteCapacityAddon(row.id).then(load)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
