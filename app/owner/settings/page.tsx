'use client';

import { useState } from 'react';
import { PageIntro, SurfaceCard } from '@/components/powerhouse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  AlertCircle,
  Bell,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  Save,
  Shield,
  Building2,
  Smartphone,
  Trash2,
} from 'lucide-react';

export default function OwnerSettingsPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notifications, setNotifications] = useState({
    newRequests: true,
    payments: true,
    lowAttendance: true,
    alerts: true,
  });

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    setIsSaving(false);
  };

  const handleLogout = () => {
    console.log('Logging out...');
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl">
        <PageIntro
          title="Settings"
          description="Manage your gym, account, and app settings"
        />

        <div className="space-y-6">
          {/* Gym Settings */}
          <SurfaceCard>
            <div className="space-y-6">
              <div className="border-b border-border pb-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-accent" />
                  Gym Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">
                      Gym Name
                    </label>
                    <Input
                      placeholder="Enter gym name"
                      className="bg-background border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">
                      Owner Name
                    </label>
                    <Input
                      placeholder="Enter owner name"
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground block mb-2">
                        Email
                      </label>
                      <Input
                        type="email"
                        placeholder="owner@example.com"
                        className="bg-background border-border"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground block mb-2">
                        Phone Number
                      </label>
                      <Input
                        placeholder="Enter phone number"
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">
                      Address
                    </label>
                    <Input
                      placeholder="Enter gym address"
                      className="bg-background border-border"
                    />
                  </div>
                </div>
              </div>

              {/* Account Settings */}
              <div className="border-b border-border pb-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-accent" />
                  Account Information
                </h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <p className="text-sm text-muted-foreground mb-1">
                      Account Status
                    </p>
                    <p className="text-lg font-semibold text-accent">Active</p>
                  </div>
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <p className="text-sm text-muted-foreground mb-1">
                      Subscription Plan
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-semibold text-foreground">
                        Premium
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border"
                      >
                        Upgrade
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="border-b border-border pb-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-accent" />
                  Password
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter current password"
                        className="bg-background border-border pr-10"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">
                      New Password
                    </label>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      className="bg-background border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">
                      Confirm Password
                    </label>
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      className="bg-background border-border"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-border text-foreground hover:bg-muted"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Update Password
                  </Button>
                </div>
              </div>

              {/* Notifications */}
              <div className="border-b border-border pb-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-accent" />
                  Notifications
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        New Requests
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Notify when members or trainers apply
                      </p>
                    </div>
                    <Switch
                      checked={notifications.newRequests}
                      onCheckedChange={(checked) =>
                        setNotifications({
                          ...notifications,
                          newRequests: checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Payment Updates
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Notify on important payment events
                      </p>
                    </div>
                    <Switch
                      checked={notifications.payments}
                      onCheckedChange={(checked) =>
                        setNotifications({
                          ...notifications,
                          payments: checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Low Attendance Alerts
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Alert when attendance drops
                      </p>
                    </div>
                    <Switch
                      checked={notifications.lowAttendance}
                      onCheckedChange={(checked) =>
                        setNotifications({
                          ...notifications,
                          lowAttendance: checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        System Alerts
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Notify on system maintenance
                      </p>
                    </div>
                    <Switch
                      checked={notifications.alerts}
                      onCheckedChange={(checked) =>
                        setNotifications({
                          ...notifications,
                          alerts: checked,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* App Settings */}
              <div className="border-b border-border pb-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-accent" />
                  App Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Dark Mode
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Use dark theme for the app
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Offline Mode
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Allow app to work offline
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div>
                <h3 className="text-lg font-semibold text-destructive mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Danger Zone
                </h3>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full border-destructive text-destructive hover:bg-destructive/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout from All Devices
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-destructive text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          </SurfaceCard>

          {/* Save Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-accent hover:bg-accent/90 text-background"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
