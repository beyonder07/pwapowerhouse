import { createClient } from "@supabase/supabase-js"
import fs from "fs"

const envFile = fs.readFileSync(".env.local", "utf8")
const envVars = {}
envFile.split("\n").forEach((line) => {
  const parts = line.split("=")
  if (parts.length >= 2) {
    const key = parts[0].trim()
    const val = parts.slice(1).join("=").trim()
    envVars[key] = val
  }
})

const supabaseUrl = envVars["NEXT_PUBLIC_SUPABASE_URL"]
const serviceRoleKey = envVars["SUPABASE_SERVICE_ROLE_KEY"]

console.log("Supabase URL:", supabaseUrl)
console.log("Service Key exists:", !!serviceRoleKey)

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing credentials")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function test() {
  const { data, error } = await supabase
    .from("user_details")
    .select("*")
    .limit(1)

  if (error) {
    console.error("Error fetching user_details:", error)
  } else {
    console.log("Sample user_details record keys:", data.length > 0 ? Object.keys(data[0]) : "No records")
    console.log("Full record:", data[0])
  }
}

test()
