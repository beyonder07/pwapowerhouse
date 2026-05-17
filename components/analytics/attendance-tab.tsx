"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts"
import { Clock, Loader2, TrendingUp, Users } from "lucide-react"
import { toast } from "sonner"
import { SurfaceCard } from "@/components/powerhouse"

const CC = { grid:"#1f2937", axis:"#4b5563", tip:{ bg:"#111827", border:"#1f2937" } }
const BRANCH_COLORS = ["#ef4444","#3b82f6","#10b981","#f59e0b","#8b5cf6","#ec4899"]

function fmtDay(v:string){return new Intl.DateTimeFormat("en-IN",{weekday:"short",day:"2-digit"}).format(new Date(v))}
function fmtWeek(v:string){
  const d=new Date(v)
  return `W${Math.ceil(d.getDate()/7)} ${d.toLocaleString("en-IN",{month:"short"})}`
}

type AttMode="daily"|"weekly"
type AttScope="combined"|"branch"

interface ToggleProps{value:string;options:{v:string;l:string}[];onChange:(v:string)=>void}
function Toggle({value,options,onChange}:ToggleProps){
  return(
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

function StatCard({label,value,sub,accent="default"}:{label:string;value:string|number;sub?:string;accent?:"red"|"amber"|"default"}){
  const c={red:"#ef4444",amber:"#f59e0b",default:"#6b7280"}[accent]
  return(
    <div className="rounded-xl border border-border bg-card p-4" style={{borderLeftWidth:4,borderLeftColor:c}}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground tabular-nums">{value}</p>
      {sub&&<p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export function AttendanceTab() {
  const [mode,setMode]=useState<AttMode>("daily")
  const [scope,setScope]=useState<AttScope>("combined")
  const [days,setDays]=useState(30)
  const [combined,setCombined]=useState<any>(null)
  const [peaks,setPeaks]=useState<any>(null)
  const [branches,setBranches]=useState<any[]>([])
  const [loading,setLoading]=useState(true)

  const load=useCallback(async()=>{
    setLoading(true)
    const from=new Date(Date.now()-days*86400000).toISOString().slice(0,10)
    const to=new Date().toISOString().slice(0,10)
    try{
      if(scope==="combined"){
        const [tR,pR]=await Promise.all([
          fetch(`/api/analytics/attendance?from=${from}&to=${to}`,{credentials:"include",cache:"no-store"}).then(x=>x.json()),
          fetch(`/api/analytics/peak-hours?from=${from}&to=${to}`,{credentials:"include",cache:"no-store"}).then(x=>x.json()),
        ])
        if(tR.success) setCombined(tR.data)
        if(pR.success) setPeaks(pR.data)
      } else {
        const r=await fetch(`/api/analytics/branch-attendance-series?from=${from}&to=${to}&mode=${mode}`,{credentials:"include",cache:"no-store"}).then(x=>x.json())
        if(r.success) setBranches(r.data.branches); else toast.error("Branch attendance unavailable")
      }
    } catch { toast.error("Attendance data unavailable") }
    finally { setLoading(false) }
  },[days,mode,scope])

  useEffect(()=>{load()},[load])

  const tipStyle={backgroundColor:CC.tip.bg,border:`1px solid ${CC.tip.border}`,borderRadius:8}
  const trendData=useMemo(()=>(combined?.trend??[]).map((d:any)=>({...d,date:fmtDay(d.date)})),[combined])

  // Aggregate combined trend into weekly buckets when mode=weekly
  const weeklyTrend=useMemo(()=>{
    if(!combined?.trend) return []
    const map=new Map<string,number>()
    for(const d of combined.trend){
      const dt=new Date(d.date); const dow=dt.getUTCDay(); const diff=dow===0?-6:1-dow
      dt.setUTCDate(dt.getUTCDate()+diff); const w=dt.toISOString().slice(0,10)
      map.set(w,(map.get(w)??0)+d.checkIns)
    }
    return [...map.entries()].map(([date,checkIns])=>({date,checkIns}))
  },[combined])

  const chartData=mode==="daily"?trendData:weeklyTrend

  return(
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Toggle value={mode} options={[{v:"daily",l:"Daily"},{v:"weekly",l:"Weekly"}]} onChange={v=>setMode(v as AttMode)}/>
        <Toggle value={scope} options={[{v:"combined",l:"Combined"},{v:"branch",l:"Branch-wise"}]} onChange={v=>setScope(v as AttScope)}/>
        <div className="flex items-center gap-1 ml-auto">
          {[7,30,90].map(d=>(
            <button key={d} onClick={()=>setDays(d)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all ${days===d?"bg-primary text-background border-primary":"border-border text-muted-foreground hover:text-foreground"}`}>
              {d}d
            </button>
          ))}
          {loading&&<Loader2 className="ml-1 h-4 w-4 animate-spin text-muted-foreground"/>}
        </div>
      </div>

      {/* Stats — combined only */}
      {scope==="combined"&&(
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total Check-ins" value={combined?.total??0} sub={`Last ${days}d`} accent="red"/>
          <StatCard label="Daily Average" value={combined?.average??0} sub="Per day"/>
          <StatCard label="Avg Session" value={peaks?.avgDurationMinutes?`${peaks.avgDurationMinutes}m`:"N/A"} sub="Duration" accent="amber"/>
        </div>
      )}

      {/* Trend chart */}
      <SurfaceCard>
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {scope==="combined"?`${mode==="daily"?"Daily":"Weekly"} Attendance Trend`:"Branch Comparison"}
        </h3>

        {scope==="combined"?(
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CC.grid} vertical={false}/>
              <XAxis dataKey="date" stroke={CC.axis} tick={{fontSize:10}} interval="preserveStartEnd"
                tickFormatter={v=>mode==="weekly"?fmtWeek(v):v}/>
              <YAxis stroke={CC.axis} tick={{fontSize:11}} allowDecimals={false}/>
              <Tooltip contentStyle={tipStyle} labelFormatter={v=>mode==="weekly"?`Week of ${fmtWeek(v)}`:v}/>
              <Area type="monotone" dataKey="checkIns" stroke="#ef4444" fill="url(#attGrad)" strokeWidth={2} name="Check-ins"/>
            </AreaChart>
          </ResponsiveContainer>
        ):(
          branches.length===0?(
            <p className="py-8 text-center text-sm text-muted-foreground">No branch data</p>
          ):(
            <ResponsiveContainer width="100%" height={260}>
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" stroke={CC.grid} vertical={false}/>
                <XAxis dataKey="date" type="category" allowDuplicatedCategory={false}
                  stroke={CC.axis} tick={{fontSize:10}} interval="preserveStartEnd"
                  tickFormatter={v=>mode==="weekly"?fmtWeek(v):fmtDay(v)}/>
                <YAxis stroke={CC.axis} tick={{fontSize:11}} allowDecimals={false}/>
                <Tooltip contentStyle={tipStyle}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                {branches.map((b,i)=>(
                  <Line key={b.branchId} data={b.data} dataKey="checkIns" name={b.branchName}
                    stroke={BRANCH_COLORS[i%BRANCH_COLORS.length]} strokeWidth={2} dot={false}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
          )
        )}
      </SurfaceCard>

      {/* Peak charts — combined only */}
      {scope==="combined"&&(
        <div className="grid gap-5 lg:grid-cols-2">
          <SurfaceCard>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Busiest Day of Week</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={peaks?.byDow??[]} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke={CC.grid} vertical={false}/>
                <XAxis dataKey="day" stroke={CC.axis} tick={{fontSize:11}}/>
                <YAxis stroke={CC.axis} tick={{fontSize:11}} allowDecimals={false}/>
                <Tooltip contentStyle={tipStyle}/>
                <Bar dataKey="checkIns" name="Check-ins" radius={[4,4,0,0]}>
                  {(peaks?.byDow??[]).map((_:any,i:number)=>{
                    const maxI=(peaks?.byDow??[]).reduce((mi:number,v:any,j:number,a:any[])=>v.checkIns>a[mi].checkIns?j:mi,0)
                    return <Cell key={i} fill={i===maxI?"#ef4444":"#374151"}/>
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SurfaceCard>
          <SurfaceCard>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Peak Hours</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={peaks?.byHour??[]} barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke={CC.grid} vertical={false}/>
                <XAxis dataKey="hour" stroke={CC.axis} tick={{fontSize:9}} interval={1}/>
                <YAxis stroke={CC.axis} tick={{fontSize:11}} allowDecimals={false}/>
                <Tooltip contentStyle={tipStyle}/>
                <Bar dataKey="checkIns" name="Check-ins" radius={[3,3,0,0]}>
                  {(peaks?.byHour??[]).map((_:any,i:number)=>{
                    const maxI=(peaks?.byHour??[]).reduce((mi:number,v:any,j:number,a:any[])=>v.checkIns>a[mi].checkIns?j:mi,0)
                    return <Cell key={i} fill={i===maxI?"#ef4444":"#374151"}/>
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SurfaceCard>
        </div>
      )}
    </div>
  )
}
