'use client';

import { AuthenticatedShell } from '@/components/shell';
import type { NavItem } from '@/components/shell';
import {
  BarChart3,
  Users,
  DollarSign,
  CheckSquare,
  Bell,
  Settings,
} from 'lucide-react';

const OWNER_NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/owner',
    icon: BarChart3,
  },
  {
    label: 'Members',
    href: '/owner/members',
    icon: Users,
  },
  {
    label: 'Trainers',
    href: '/owner/trainers',
    icon: Users,
  },
  {
    label: 'Payments',
    href: '/owner/payments',
    icon: DollarSign,
  },
  {
    label: 'Attendance',
    href: '/owner/attendance',
    icon: CheckSquare,
  },
  {
    label: 'Requests',
    href: '/owner/requests',
    icon: Bell,
  },
];

const OWNER_FOOTER_ITEMS: NavItem[] = [
  {
    label: 'Settings',
    href: '/owner/settings',
    icon: Settings,
  },
];

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthenticatedShell
      role="owner"
      navItems={OWNER_NAV_ITEMS}
      footerItems={OWNER_FOOTER_ITEMS}
    >
      {children}
    </AuthenticatedShell>
  );
}
