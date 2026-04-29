'use client';

import { useState } from 'react';
import {
  PageIntro,
  SurfaceCard,
  SearchToolbar,
  PaginationControls,
  MemberCard,
  StatusPill,
} from '@/components/powerhouse';
import { Button } from '@/components/ui/button';
import { Users, Download, Filter } from 'lucide-react';

const MEMBERS = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    phone: '+91 98765 43210',
    branch: 'Mumbai - Main',
    joinDate: 'Jan 15, 2024',
    membership: 'Gold Plus',
    status: 'active',
    lastCheckIn: '2 hours ago',
    avatar: 'RK',
  },
  {
    id: '2',
    name: 'Priya Singh',
    email: 'priya@example.com',
    phone: '+91 98765 43211',
    branch: 'Mumbai - Main',
    joinDate: 'Feb 20, 2024',
    membership: 'Platinum',
    status: 'active',
    lastCheckIn: '1 day ago',
    avatar: 'PS',
  },
  {
    id: '3',
    name: 'Amit Patel',
    email: 'amit@example.com',
    phone: '+91 98765 43212',
    branch: 'Pune',
    joinDate: 'Mar 10, 2024',
    membership: 'Silver',
    status: 'active',
    lastCheckIn: '3 days ago',
    avatar: 'AP',
  },
  {
    id: '4',
    name: 'Sarah Khan',
    email: 'sarah@example.com',
    phone: '+91 98765 43213',
    branch: 'Mumbai - Andheri',
    joinDate: 'Dec 5, 2023',
    membership: 'Gold Plus',
    status: 'inactive',
    lastCheckIn: '45 days ago',
    avatar: 'SK',
  },
  {
    id: '5',
    name: 'Vikram Desai',
    email: 'vikram@example.com',
    phone: '+91 98765 43214',
    branch: 'Mumbai - Main',
    joinDate: 'Jan 22, 2024',
    membership: 'Platinum',
    status: 'active',
    lastCheckIn: '4 hours ago',
    avatar: 'VD',
  },
  {
    id: '6',
    name: 'Neha Gupta',
    email: 'neha@example.com',
    phone: '+91 98765 43215',
    branch: 'Pune',
    joinDate: 'Feb 14, 2024',
    membership: 'Silver',
    status: 'active',
    lastCheckIn: '6 hours ago',
    avatar: 'NG',
  },
];

export default function OwnerMembersPage() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const filteredMembers = MEMBERS.filter(
    (member) =>
      member.name.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase()) ||
      member.phone.includes(search)
  );

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedMembers = filteredMembers.slice(
    startIdx,
    startIdx + itemsPerPage
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl">
        <PageIntro
          title="Members"
          description="Manage and monitor all gym members"
        />

        {/* Toolbar */}
        <SurfaceCard className="mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <SearchToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search by name, email, or phone..."
            />
            <div className="flex gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                className="flex-1 md:flex-none border-border"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button
                variant="outline"
                className="flex-1 md:flex-none border-border"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </SurfaceCard>

        {/* Members Grid */}
        <div className="space-y-4">
          {paginatedMembers.length > 0 ? (
            <>
              {paginatedMembers.map((member) => (
                <SurfaceCard key={member.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-background font-semibold text-sm flex-shrink-0">
                        {member.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">
                            {member.name}
                          </h3>
                          <StatusPill status={member.status} size="sm" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {member.email}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                          <div>
                            <p className="text-xs opacity-75">Phone</p>
                            <p>{member.phone}</p>
                          </div>
                          <div>
                            <p className="text-xs opacity-75">Branch</p>
                            <p>{member.branch}</p>
                          </div>
                          <div>
                            <p className="text-xs opacity-75">Member Since</p>
                            <p>{member.joinDate}</p>
                          </div>
                          <div>
                            <p className="text-xs opacity-75">Last Check-in</p>
                            <p>{member.lastCheckIn}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-accent mb-3">
                        {member.membership}
                      </p>
                      <Button size="sm" variant="outline" className="border-border">
                        View Profile
                      </Button>
                    </div>
                  </div>
                </SurfaceCard>
              ))}
              {filteredMembers.length > itemsPerPage && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          ) : (
            <SurfaceCard>
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No members found</p>
              </div>
            </SurfaceCard>
          )}
        </div>
      </div>
    </div>
  );
}
