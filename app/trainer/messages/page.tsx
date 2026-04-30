"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { PageIntro, SurfaceCard, SearchToolbar, EmptyState } from "@/components/powerhouse"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MessageSquare,
  Send,
  Search,
  MoreVertical,
  Phone,
  Video,
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
const conversations = [
  {
    id: "1",
    name: "Alex Johnson",
    avatar: null,
    lastMessage: "Thanks for the workout plan! I'll start tomorrow.",
    timestamp: "2 min ago",
    unread: 2,
    online: true,
  },
  {
    id: "2",
    name: "Maria Garcia",
    avatar: null,
    lastMessage: "Can we reschedule tomorrow's session to 10 AM?",
    timestamp: "1 hour ago",
    unread: 1,
    online: true,
  },
  {
    id: "3",
    name: "James Wilson",
    avatar: null,
    lastMessage: "Great session today! Feeling stronger already.",
    timestamp: "3 hours ago",
    unread: 0,
    online: false,
  },
  {
    id: "4",
    name: "Sarah Chen",
    avatar: null,
    lastMessage: "I've been following the nutrition plan you sent.",
    timestamp: "Yesterday",
    unread: 0,
    online: false,
  },
  {
    id: "5",
    name: "David Kim",
    avatar: null,
    lastMessage: "Looking forward to our first session!",
    timestamp: "2 days ago",
    unread: 0,
    online: true,
  },
]

const messages = [
  {
    id: "m1",
    senderId: "1",
    content: "Hey Mike! I just finished the upper body workout you assigned.",
    timestamp: "10:30 AM",
    isMe: false,
  },
  {
    id: "m2",
    senderId: "me",
    content: "Great job, Alex! How did you feel during the bench press sets?",
    timestamp: "10:32 AM",
    isMe: true,
  },
  {
    id: "m3",
    senderId: "1",
    content: "They were challenging but I managed to complete all 4 sets. The last one was tough!",
    timestamp: "10:35 AM",
    isMe: false,
  },
  {
    id: "m4",
    senderId: "me",
    content: "That's exactly what we want - pushing to that last rep. Next week we can try increasing the weight by 5lbs.",
    timestamp: "10:38 AM",
    isMe: true,
  },
  {
    id: "m5",
    senderId: "1",
    content: "Sounds good! Also, I wanted to ask about the nutrition plan we discussed.",
    timestamp: "10:40 AM",
    isMe: false,
  },
  {
    id: "m6",
    senderId: "me",
    content: "Sure, what would you like to know?",
    timestamp: "10:41 AM",
    isMe: true,
  },
  {
    id: "m7",
    senderId: "1",
    content: "Thanks for the workout plan! I'll start tomorrow.",
    timestamp: "10:45 AM",
    isMe: false,
  },
]

export default function TrainerMessagesPage() {
  const [search, setSearch] = useState("")
  const [selectedConversation, setSelectedConversation] = useState(conversations[0])
  const [newMessage, setNewMessage] = useState("")

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSendMessage = () => {
    if (!newMessage.trim()) return
    // Handle sending message
    setNewMessage("")
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="h-[calc(100dvh-12rem)]"
    >
      <PageIntro
        title="Messages"
        subtitle="Chat with your clients"
      />

      <motion.div variants={item} className="mt-6 h-full">
        <SurfaceCard className="h-full p-0 overflow-hidden">
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-80 border-r border-border flex flex-col">
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search conversations..."
                    className="pl-9"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="divide-y divide-border">
                  {filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                        selectedConversation.id === conversation.id ? "bg-muted/50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={conversation.avatar || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {conversation.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          {conversation.online && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-foreground truncate">
                              {conversation.name}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {conversation.timestamp}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {conversation.lastMessage}
                          </p>
                        </div>
                        {conversation.unread > 0 && (
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                            {conversation.unread}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedConversation.avatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedConversation.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    {selectedConversation.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{selectedConversation.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedConversation.online ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          message.isMe
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}
                        >
                          {message.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-border">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendMessage()
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </SurfaceCard>
      </motion.div>
    </motion.div>
  )
}
