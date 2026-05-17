"use client"

import { AccountSettingsPanel } from "@/components/profile/account-settings-panel"

export default function ClientSettingsPage() {
  return (
    <AccountSettingsPanel
      config={{
        profileApi: "/api/client/profile",
        avatarApi: "/api/client/profile/avatar",
        govtIdApi: "/api/client/profile/govt-id",
        verifiedBadge: "Verified Member Account",
        bannerText: undefined,
      }}
    />
  )
}
