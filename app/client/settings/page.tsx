"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { PageIntro, SurfaceCard, ConfirmDialog } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Bell,
  Shield,
  Globe,
  Smartphone,
  Moon,
  LogOut,
  Trash2,
  Eye,
  EyeOff,
  Save,
} from "lucide-react"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function ClientSettingsPage() {
  const [notifications, setNotifications] = useState({
    workoutReminders: true,
    sessionAlerts: true,
    trainerMessages: true,
    promotions: false,
    achievements: true,
  })

  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    showProgress: true,
    allowDataCollection: true,
  })

  const [preferences, setPreferences] = useState({
    language: "en",
    timezone: "America/New_York",
    units: "imperial",
    theme: "dark",
  })

  const [showPassword, setShowPassword] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <PageIntro
        title="Settings"
        subtitle="Customize your app experience and manage your account"
      />

      {/* Notifications */}
      <motion.div variants={item}>
        <SurfaceCard>
          <div className="flex items-center gap-3 mb-6">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Notifications</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Workout Reminders</p>
                <p className="text-sm text-muted-foreground">Get reminded before scheduled workouts</p>
              </div>
              <Switch
                checked={notifications.workoutReminders}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, workoutReminders: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Session Alerts</p>
                <p className="text-sm text-muted-foreground">Notifications for upcoming PT sessions</p>
              </div>
              <Switch
                checked={notifications.sessionAlerts}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, sessionAlerts: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Trainer Messages</p>
                <p className="text-sm text-muted-foreground">Get notified when trainers message you</p>
              </div>
              <Switch
                checked={notifications.trainerMessages}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, trainerMessages: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Achievements</p>
                <p className="text-sm text-muted-foreground">Celebrate when you unlock achievements</p>
              </div>
              <Switch
                checked={notifications.achievements}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, achievements: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Promotions</p>
                <p className="text-sm text-muted-foreground">Receive offers and promotions</p>
              </div>
              <Switch
                checked={notifications.promotions}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, promotions: checked })
                }
              />
            </div>
          </div>
        </SurfaceCard>
      </motion.div>

      {/* Preferences */}
      <motion.div variants={item}>
        <SurfaceCard>
          <div className="flex items-center gap-3 mb-6">
            <Globe className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Preferences</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={preferences.language}
                onValueChange={(value) => setPreferences({ ...preferences, language: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={preferences.timezone}
                onValueChange={(value) => setPreferences({ ...preferences, timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Units</Label>
              <Select
                value={preferences.units}
                onValueChange={(value) => setPreferences({ ...preferences, units: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imperial">Imperial (lbs, ft)</SelectItem>
                  <SelectItem value="metric">Metric (kg, cm)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Theme</Label>
              <Select
                value={preferences.theme}
                onValueChange={(value) => setPreferences({ ...preferences, theme: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SurfaceCard>
      </motion.div>

      {/* Privacy */}
      <motion.div variants={item}>
        <SurfaceCard>
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Privacy</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Profile Visibility</p>
                <p className="text-sm text-muted-foreground">Allow trainers to view your profile</p>
              </div>
              <Switch
                checked={privacy.profileVisible}
                onCheckedChange={(checked) =>
                  setPrivacy({ ...privacy, profileVisible: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Show Progress</p>
                <p className="text-sm text-muted-foreground">Share your workout progress with trainers</p>
              </div>
              <Switch
                checked={privacy.showProgress}
                onCheckedChange={(checked) =>
                  setPrivacy({ ...privacy, showProgress: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Analytics Collection</p>
                <p className="text-sm text-muted-foreground">Help improve the app with usage data</p>
              </div>
              <Switch
                checked={privacy.allowDataCollection}
                onCheckedChange={(checked) =>
                  setPrivacy({ ...privacy, allowDataCollection: checked })
                }
              />
            </div>
          </div>
        </SurfaceCard>
      </motion.div>

      {/* Security */}
      <motion.div variants={item}>
        <SurfaceCard>
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Security</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <Button>
              <Save className="mr-2 h-4 w-4" />
              Update Password
            </Button>
          </div>
        </SurfaceCard>
      </motion.div>

      {/* Danger Zone */}
      <motion.div variants={item}>
        <SurfaceCard className="border-destructive/50">
          <h3 className="font-semibold text-foreground mb-4">Danger Zone</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Sign Out</p>
                <p className="text-sm text-muted-foreground">Sign out from all devices</p>
              </div>
              <Button variant="outline">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <p className="font-medium text-destructive">Delete Account</p>
                <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
              </div>
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </SurfaceCard>
      </motion.div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Account"
        description="Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed."
        confirmText="Delete Account"
        onConfirm={() => {
          // Handle delete
          setDeleteDialogOpen(false)
        }}
        variant="destructive"
      />
    </motion.div>
  )
}
