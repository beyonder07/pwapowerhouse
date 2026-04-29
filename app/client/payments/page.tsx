"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { PageIntro, SurfaceCard, StatusPill, PaymentCard } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CreditCard,
  Download,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
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

// Mock data
const currentPlan = {
  name: "Premium Membership",
  price: 99,
  billingCycle: "monthly",
  nextBilling: "April 15, 2026",
  features: [
    "Unlimited gym access",
    "2 PT sessions/month",
    "Group classes included",
    "Sauna & steam access",
  ],
}

const paymentMethods = [
  {
    id: "1",
    type: "visa" as const,
    last4: "4242",
    expiryMonth: "12",
    expiryYear: "27",
    isDefault: true,
  },
  {
    id: "2",
    type: "mastercard" as const,
    last4: "8888",
    expiryMonth: "06",
    expiryYear: "26",
    isDefault: false,
  },
]

const invoices = [
  {
    id: "INV-001",
    date: "March 15, 2026",
    amount: 99,
    status: "paid" as const,
    description: "Premium Membership - March 2026",
  },
  {
    id: "INV-002",
    date: "February 15, 2026",
    amount: 99,
    status: "paid" as const,
    description: "Premium Membership - February 2026",
  },
  {
    id: "INV-003",
    date: "January 15, 2026",
    amount: 149,
    status: "paid" as const,
    description: "Premium Membership + PT Session",
  },
  {
    id: "INV-004",
    date: "December 15, 2025",
    amount: 99,
    status: "paid" as const,
    description: "Premium Membership - December 2025",
  },
]

export default function ClientPaymentsPage() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <PageIntro
        title="Payments"
        subtitle="Manage your membership, payment methods, and billing history"
      />

      <motion.div variants={item}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="methods">Payment Methods</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Current Plan */}
            <SurfaceCard>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      {currentPlan.name}
                    </h3>
                    <StatusPill status="success">Active</StatusPill>
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    ${currentPlan.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{currentPlan.billingCycle}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Next billing: {currentPlan.nextBilling}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">Change Plan</Button>
                  <Button variant="outline">Cancel</Button>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="font-medium text-foreground mb-3">{"What's included"}</h4>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {currentPlan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </SurfaceCard>

            {/* Quick Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              <SurfaceCard>
                <p className="text-sm text-muted-foreground mb-1">This Month</p>
                <p className="text-2xl font-bold text-foreground">$99.00</p>
              </SurfaceCard>
              <SurfaceCard>
                <p className="text-sm text-muted-foreground mb-1">YTD Spent</p>
                <p className="text-2xl font-bold text-foreground">$346.00</p>
              </SurfaceCard>
              <SurfaceCard>
                <p className="text-sm text-muted-foreground mb-1">Member Since</p>
                <p className="text-2xl font-bold text-foreground">Nov 2025</p>
              </SurfaceCard>
            </div>
          </TabsContent>

          <TabsContent value="methods" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Saved Cards</h3>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Card
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {paymentMethods.map((method) => (
                <motion.div key={method.id} variants={item}>
                  <PaymentCard
                    type={method.type}
                    last4={method.last4}
                    expiryMonth={method.expiryMonth}
                    expiryYear={method.expiryYear}
                    isDefault={method.isDefault}
                    onSetDefault={() => {}}
                    onRemove={() => {}}
                  />
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Billing History</h3>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>

            <SurfaceCard className="p-0 overflow-hidden">
              <div className="divide-y divide-border">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{invoice.description}</p>
                        <p className="text-sm text-muted-foreground">{invoice.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium text-foreground">${invoice.amount}.00</p>
                        <StatusPill
                          status={
                            invoice.status === "paid"
                              ? "success"
                              : invoice.status === "pending"
                              ? "warning"
                              : "error"
                          }
                        >
                          {invoice.status}
                        </StatusPill>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
