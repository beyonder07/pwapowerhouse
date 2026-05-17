"use client"

import { AccountSettingsPanel } from "@/components/profile/account-settings-panel"

export default function TrainerSettingsPage() {
  return (
    <AccountSettingsPanel
      config={{
        profileApi: "/api/trainer/profile",
        avatarApi: "/api/trainer/profile/avatar",
        govtIdApi: "/api/trainer/profile/govt-id",
        verifiedBadge: "Verified Trainer Account",
      }}
    />
  )
}
