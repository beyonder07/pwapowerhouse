"use client"

import { AccountSettingsPanel } from "@/components/profile/account-settings-panel"

export default function OwnerSettingsPage() {
  return (
    <AccountSettingsPanel
      config={{
        profileApi: "/api/owner/profile",
        avatarApi: "/api/owner/profile/avatar",
        govtIdApi: "/api/owner/profile/govt-id",
        verifiedBadge: "Verified Owner Account",
      }}
    />
  )
}
