"use client"

import { cn } from "@/lib/utils"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FilterOption {
  value: string
  label: string
}

interface SearchToolbarProps {
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  filters?: {
    value: string
    onChange: (value: string) => void
    options: FilterOption[]
    placeholder?: string
  }[]
  className?: string
}

export function SearchToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  value,
  onChange,
  placeholder,
  filters,
  className,
}: SearchToolbarProps) {
  const finalValue = searchValue ?? value ?? ""
  const handleChange = onSearchChange ?? onChange ?? (() => {})
  const finalPlaceholder = placeholder ?? searchPlaceholder

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row gap-3 mb-4",
        className
      )}
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={finalPlaceholder}
          value={finalValue}
          onChange={(e) => handleChange(e.target.value)}
          className="pl-9 pr-9 bg-secondary border-border"
        />
        {finalValue && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={() => handleChange("")}
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>
      {filters?.map((filter, index) => (
        <Select
          key={index}
          value={filter.value}
          onValueChange={filter.onChange}
        >
          <SelectTrigger className="w-full sm:w-[160px] bg-secondary border-border">
            <SelectValue placeholder={filter.placeholder || "Filter"} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  )
}
