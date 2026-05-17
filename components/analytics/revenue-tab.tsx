"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Clock, IndianRupee, Loader2, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import { SurfaceCard } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"

const CC = { grid:"#1f2937", axis:"#4b5563", tip:{ bg:"#111827", border:"#1f2937" } }
const BRANCH_COLORS = ["#ef4444","#3b82f6","#10b981","#f59e0b","#8b5cf6","#ec4899"]

function fmt(v:number){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(v)}
function fmtMonth(v:string){return new Intl.DateTimeFormat("en-IN",{month:"short",year:"2-digit"}).format(new Date(v+"T00:00:00"))}
function fmtDay(v:string){return new Intl.DateTimeFormat("en-IN",{weekday:"short",day:"2-digit"}).format(new Date(v))}
function yFmt(v:number){return v===0?"₹0":`₹${(v/1000).toFixed(0)}k`}

type Mode = "weekly"|"monthly"
type Scope = "combined"|"branch"

interface ToggleProps { value:string; options:{v:string;l:string}[]; onChange:(v:string)=>void }
function Toggle({value,options,onChange}:ToggleProps){
  return (
    <div className="flex rounded-lg border border-border bg-card p-0.5 gap-0.5">
      {options.map(o=>(
        <button key={o.v} onClick={()=>onChange(o.v)}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${value===o.v?"bg-primary text-background shadow":"text-muted-foreground hover:text-foreground"}`}>
          {o.l}
        </button>
      ))}
    </div>
  )
}

function StatCard({label,value,sub,accent="default"}:{label:string;value:string|number;sub?:string;accent?:"green"|"amber"|"default"}){
  const c={green:"#10b981",amber:"#f59e0b",default:"#6b7280"}[accent]
  return (
    <div className="rounded-xl border border-border bg-card p-4" style={{borderLeftWidth:4,borderLeftColor:c}}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground tabular-nums">{value}</p>
      {sub&&<p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export function RevenueTab() {
  const [mode,setMode]=useState<Mode>("weekly")
  const [scope,setScope]=useState<Scope>("combined")
  const [combined,setCombined]=useState<any>(null)
  const [branches,setBranches]=useState<any[]>([])
  const [loading,setLoading]=useState(true)

  const load=useCallback(async()=>{
    setLoading(true)
    try {
      const from=new Date(Date.now()-6*86400000).toISOString().slice(0,10)
      const to=new Date().toISOString().slice(0,10)
      if(scope==="combined"){
        const r=await fetch("/api/analytics/revenue",{credentials:"include",cache:"no-store"}).then(x=>x.json())
        if(r.success) setCombined(r.data); else toast.error("Revenue data unavailable")
      } else {
        const r=await fetch(`/api/analytics/branch-revenue?from=${from}&to=${to}&mode=${mode}`,{credentials:"include",cache:"no-store"}).then(x=>x.json())
        if(r.success) setBranches(r.data.branches); else toast.error("Branch revenue unavailable")
      }
    } catch { toast.error("Revenue data unavailable") }
    finally { setLoading(false) }
  },[mode,scope])

  useEffect(()=>{load()},[load])

  const weeklyData=useMemo(()=>(combined?.weekly??[]).map((d:any)=>({...d,date:fmtDay(d.date)})),[combined])
  const monthlyData=useMemo(()=>(combined?.monthly??[]).map((d:any)=>({...d,month:fmtMonth(d.monthStart)})),[combined])

  const chartData=mode==="weekly"?weeklyData:monthlyData
  const xKey=mode==="weekly"?"date":"month"
  const tipStyle={backgroundColor:CC.tip.bg,border:`1px solid ${CC.tip.border}`,borderRadius:8}

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Toggle value={mode} options={[{v:"weekly",l:"Weekly"},{v:"monthly",l:"Monthly"}]} onChange={v=>setMode(v as Mode)} />
        <Toggle value={scope} options={[{v:"combined",l:"Combined"},{v:"branch",l:"Branch-wise"}]} onChange={v=>setScope(v as Scope)} />
        {loading&&<Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/>}
      </div>

      {/* Stats row — combined only */}
      {scope==="combined"&&combined&&(
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="This Month" value={fmt(combined.monthlyRevenue)} sub="Approved" accent="green"/>
          <StatCard label="This Week" value={fmt(combined.weeklyRevenue)} sub="7-day" accent="green"/>
          <StatCard label="Pending" value={fmt(combined.pendingPaymentsTotal)} sub="Awaiting" accent="amber"/>
        </div>
      )}

      {/* Chart */}
      <SurfaceCard>
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {scope==="combined"?`${mode==="weekly"?"Daily (7 Days)":"6-Month Trend"}`:"Branch Comparison"}
        </h3>

        {scope==="combined"?(
          <ResponsiveContainer width="100%" height={240}>
            {mode==="weekly"?(
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={CC.grid} vertical={false}/>
                <XAxis dataKey={xKey} stroke={CC.axis} tick={{fontSize:11}}/>
                <YAxis stroke={CC.axis} tick={{fontSize:11}} tickFormatter={yFmt} domain={[0,"auto"]}/>
                <Tooltip contentStyle={tipStyle} formatter={(v:number)=>[fmt(v)]}/>
                <Bar dataKey="revenue" fill="#10b981" name="Paid" radius={[4,4,0,0]}/>
                <Bar dataKey="pendingTotal" fill="#f59e0b" name="Pending" radius={[4,4,0,0]}/>
              </BarChart>
            ):(
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CC.grid} vertical={false}/>
                <XAxis dataKey={xKey} stroke={CC.axis} tick={{fontSize:11}}/>
                <YAxis stroke={CC.axis} tick={{fontSize:11}} tickFormatter={yFmt} domain={[0,"auto"]}/>
                <Tooltip contentStyle={tipStyle} formatter={(v:number)=>[fmt(v)]}/>
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#revGrad)" strokeWidth={2} name="Revenue"/>
                <Area type="monotone" dataKey="pendingTotal" stroke="#f59e0b" fill="none" strokeWidth={1.5} strokeDasharray="4 2" name="Pending"/>
              </AreaChart>
            )}
          </ResponsiveContainer>
        ):(
          /* Branch-wise: multi-line chart */
          branches.length===0?(
            <p className="py-8 text-center text-sm text-muted-foreground">No branch data</p>
          ):(
            <ResponsiveContainer width="100%" height={260}>
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" stroke={CC.grid} vertical={false}/>
                <XAxis dataKey={mode==="weekly"?"date":"monthStart"} type="category" allowDuplicatedCategory={false}
                  stroke={CC.axis} tick={{fontSize:10}} tickFormatter={v=>mode==="weekly"?fmtDay(v):fmtMonth(v)}/>
                <YAxis stroke={CC.axis} tick={{fontSize:11}} tickFormatter={yFmt} domain={[0,"auto"]}/>
                <Tooltip contentStyle={tipStyle} formatter={(v:number)=>[fmt(v)]}
                  labelFormatter={v=>mode==="weekly"?fmtDay(v):fmtMonth(v)}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                {branches.map((b,i)=>(
                  <Line key={b.branchId} data={b.data} dataKey="revenue" name={b.branchName}
                    stroke={BRANCH_COLORS[i%BRANCH_COLORS.length]} strokeWidth={2} dot={false}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
          )
        )}

        {scope==="combined"&&mode==="weekly"&&(
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500"/>Paid</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500"/>Pending</span>
          </div>
        )}
      </SurfaceCard>
    </div>
  )
}
