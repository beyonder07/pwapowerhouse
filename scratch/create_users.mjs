import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase env vars")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function createDummyUser(email, password, role, fullName) {
  console.log(`Creating ${role}: ${email}...`)
  
  // 1. Create Auth User
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { full_name: fullName, role }
  })

  if (authError) {
    if (authError.message.includes("already exists")) {
      console.log(`Auth user ${email} already exists.`)
      // Try to find the user
      const { data: users, error: findError } = await supabase.auth.admin.listUsers()
      const user = users.users.find(u => u.email === email)
      if (user) {
          console.log(`Found existing user ID: ${user.id}`)
          await syncProfile(user.id, email, fullName, role)
      }
    } else {
      console.error(`Error creating auth user ${email}:`, authError.message)
    }
    return
  }

  console.log(`Created auth user ${email} with ID: ${authData.user.id}`)
  await syncProfile(authData.user.id, email, fullName, role)
}

async function syncProfile(id, email, fullName, role) {
    const { error: profileError } = await supabase.from("users").upsert({
        id,
        email,
        full_name: fullName,
        role,
        is_active: true,
    })

    if (profileError) {
        console.error(`Error syncing profile for ${email}:`, profileError.message)
    } else {
        console.log(`Profile synced for ${email}`)
    }
}

async function main() {
  const usersToCreate = [
    { email: "suryanshgym@gmail.com", password: "Sumo@5678", role: "owner", name: "Suryansh (Owner)" },
    { email: "trainer@powerhouse.com", password: "trainer123", role: "trainer", name: "Priya Mehta (Trainer)" },
    { email: "client@powerhouse.com", password: "client123", role: "client", name: "Amit Kumar (Member)" }
  ]

  for (const user of usersToCreate) {
    await createDummyUser(user.email, user.password, user.role, user.name)
  }
}

main()
