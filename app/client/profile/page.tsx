import { redirect } from "next/navigation"

export default function ClientProfileRedirect() {
  redirect("/client/settings")
}
