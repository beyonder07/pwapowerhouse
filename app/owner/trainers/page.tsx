'use client';

import { useState } from 'react';
import {
  PageIntro,
  SurfaceCard,
  SearchToolbar,
  PaginationControls,
  StatusPill,
} from '@/components/powerhouse';
import { Button } from '@/components/ui/button';
import { Users, Download, Filter, Star } from 'lucide-react';

const TRAINERS = [
  {
    id: '1',
    name: 'Alex Kumar',
    email: 'alex@example.com',
    phone: '+91 98765 43220',
    branch: 'Mumbai - Main',
    specialization: 'Strength Training',
    clients: 15,
    rating: 4.8,
    status: 'active',
    joiningDate: 'Jan 10, 2024',
    avatar: 'AK',
  },
  {
    id: '2',
    name: 'Sophia Patel',
    email: 'sophia@example.com',
    phone: '+91 98765 43221',
    branch: 'Mumbai - Main',
    specialization: 'Yoga & Flexibility',
    clients: 12,
    rating: 4.9,
    status: 'active',
    joiningDate: 'Feb 5, 2024',
    avatar: 'SP',
  },
  {
    id: '3',
    name: 'Marco Singh',
    email: 'marco@example.com',
    phone: '+91 98765 43222',
    branch: 'Pune',
    specialization: 'Cardio Training',
    clients: 18,
    rating: 4.7,
    status: 'active',
    joiningDate: 'Dec 20, 2023',
    avatar: 'MS',
  },
  {
    id: '4',
    name: 'Lisa Sharma',
    email: 'lisa@example.com',
    phone: '+91 98765 43223',
    branch: 'Mumbai - Andheri',
    specialization: 'CrossFit',
    clients: 8,
    rating: 4.6,
    status: 'inactive',
    joiningDate: 'Oct 15, 2023',
    avatar: 'LS',
  },
  {
    id: '5',
    name: 'David Khan',
    email: 'david@example.com',
    phone: '+91 98765 43224',
    branch: 'Mumbai - Main',
    specialization: 'Powerlifting',
    clients: 20,
    rating: 4.9,
    status: 'active',
    joiningDate: 'Nov 1, 2023',
    avatar: 'DK',
  },
  {
    id: '6',
    name: 'Riya Desai',
    email: 'riya@example.com',
    phone: '+91 98765 43225',
    branch: 'Pune',
    specialization: 'HIIT & Conditioning',
    clients: 14,
    rating: 4.8,
    status: 'active',
    joiningDate: 'Jan 25, 2024',
    avatar: 'RD',
  },
];

export default function OwnerTrainersPage() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const filteredTrainers = TRAINERS.filter(
    (trainer) =>
      trainer.name.toLowerCase().includes(search.toLowerCase()) ||
      trainer.email.toLowerCase().includes(search.toLowerCase()) ||
      trainer.specialization.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTrainers.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedTrainers = filteredTrainers.slice(
    startIdx,
    startIdx + itemsPerPage
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl">
        <PageIntro
          title="Trainers"
          description="Manage and monitor all gym trainers"
        />

        {/* Toolbar */}
        <SurfaceCard className="mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <SearchToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search by name, email, or specialization..."
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

        {/* Trainers Grid */}
        <div className="space-y-4">
          {paginatedTrainers.length > 0 ? (
            <>
              {paginatedTrainers.map((trainer) => (
                <SurfaceCard key={trainer.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-background font-semibold text-sm flex-shrink-0">
                        {trainer.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">
                            {trainer.name}
                          </h3>
                          <StatusPill status={trainer.status} size="sm" />
                        </div>
                        <p className="text-sm text-accent mb-2">
                          {trainer.specialization}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                          <div>
                            <p className="text-xs opacity-75">Email</p>
                            <p className="truncate">{trainer.email}</p>
                          </div>
                          <div>
                            <p className="text-xs opacity-75">Branch</p>
                            <p>{trainer.branch}</p>
                          </div>
                          <div>
                            <p className="text-xs opacity-75">Active Clients</p>
                            <p className="font-semibold text-foreground">
                              {trainer.clients}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs opacity-75">Joined</p>
                            <p>{trainer.joiningDate}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 mb-3">
                        <Star className="w-4 h-4 fill-accent text-accent" />
                        <span className="font-semibold text-foreground">
                          {trainer.rating}
                        </span>
                      </div>
                      <Button size="sm" variant="outline" className="border-border">
                        Manage
                      </Button>
                    </div>
                  </div>
                </SurfaceCard>
              ))}
              {filteredTrainers.length > itemsPerPage && (
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
                <p className="text-muted-foreground">No trainers found</p>
              </div>
            </SurfaceCard>
          )}
        </div>
      </div>
    </div>
  );
}
