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
import {
  DollarSign,
  Download,
  Filter,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const paymentData = [
  { date: 'Mon', amount: 12500 },
  { date: 'Tue', amount: 15200 },
  { date: 'Wed', amount: 11800 },
  { date: 'Thu', amount: 18600 },
  { date: 'Fri', amount: 21400 },
  { date: 'Sat', amount: 19500 },
  { date: 'Sun', amount: 14200 },
];

const TRANSACTIONS = [
  {
    id: '1',
    member: 'Rajesh Kumar',
    type: 'Membership',
    amount: 2500,
    date: 'Today 10:30 AM',
    status: 'completed',
    method: 'Credit Card',
  },
  {
    id: '2',
    member: 'Priya Singh',
    type: 'Personal Training',
    amount: 5000,
    date: 'Today 9:15 AM',
    status: 'completed',
    method: 'Net Banking',
  },
  {
    id: '3',
    member: 'Amit Patel',
    type: 'Membership',
    amount: 2500,
    date: 'Yesterday 4:20 PM',
    status: 'pending',
    method: 'UPI',
  },
  {
    id: '4',
    member: 'Sarah Khan',
    type: 'Group Classes',
    amount: 1500,
    date: 'Yesterday 2:45 PM',
    status: 'completed',
    method: 'Credit Card',
  },
  {
    id: '5',
    member: 'Vikram Desai',
    type: 'Membership Renewal',
    amount: 2500,
    date: '3 days ago',
    status: 'completed',
    method: 'Net Banking',
  },
  {
    id: '6',
    member: 'Neha Gupta',
    type: 'Personal Training',
    amount: 3500,
    date: '4 days ago',
    status: 'failed',
    method: 'Credit Card',
  },
];

export default function OwnerPaymentsPage() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const filteredTransactions = TRANSACTIONS.filter(
    (tx) =>
      tx.member.toLowerCase().includes(search.toLowerCase()) ||
      tx.type.toLowerCase().includes(search.toLowerCase()) ||
      tx.method.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(
    startIdx,
    startIdx + itemsPerPage
  );

  const totalRevenue = TRANSACTIONS.filter(
    (tx) => tx.status === 'completed'
  ).reduce((sum, tx) => sum + tx.amount, 0);

  const pendingAmount = TRANSACTIONS.filter(
    (tx) => tx.status === 'pending'
  ).reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl">
        <PageIntro
          title="Payments"
          description="Track revenue and manage all transactions"
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SurfaceCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total Revenue</p>
                <p className="text-3xl font-bold text-accent">₹{totalRevenue}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-accent opacity-50" />
            </div>
          </SurfaceCard>
          <SurfaceCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Pending Payments
                </p>
                <p className="text-3xl font-bold text-orange-500">₹{pendingAmount}</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
          </SurfaceCard>
          <SurfaceCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Transactions
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {TRANSACTIONS.length}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-accent opacity-50" />
            </div>
          </SurfaceCard>
        </div>

        {/* Chart */}
        <SurfaceCard className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Weekly Revenue Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={paymentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                }}
              />
              <Bar dataKey="amount" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SurfaceCard>

        {/* Transactions Table */}
        <SurfaceCard className="mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
            <SearchToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search by member, type, or method..."
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

          {/* Table */}
          <div className="space-y-2">
            {paginatedTransactions.map((tx) => (
              <div
                key={tx.id}
                className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 rounded-lg bg-background border border-border items-center text-sm"
              >
                <div className="col-span-2 md:col-span-1">
                  <p className="font-medium text-foreground text-xs md:text-sm">
                    {tx.member}
                  </p>
                </div>
                <div className="hidden md:block">
                  <p className="text-muted-foreground text-xs">{tx.type}</p>
                </div>
                <div className="hidden md:block">
                  <p className="text-muted-foreground text-xs">{tx.method}</p>
                </div>
                <div>
                  <p className="font-semibold text-accent">₹{tx.amount}</p>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-2">
                  <p className="text-muted-foreground text-xs">{tx.date}</p>
                  <StatusPill status={tx.status} size="sm" />
                </div>
              </div>
            ))}
          </div>

          {filteredTransactions.length > itemsPerPage && (
            <div className="mt-6">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}
