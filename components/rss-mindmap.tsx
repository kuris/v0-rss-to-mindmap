"use client"

import { useState, useMemo, useCallback } from "react"
import useSWR from "swr"
import { cn } from "@/lib/utils"
import { Filter, X, ExternalLink, ChevronDown, ChevronRight, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface RSSItem {
  title: string
  link: string
  categories: string[]
  pubDate: string
  author: string
}

interface ParsedRSS {
  channelTitle: string
  channelDescription: string
  items: RSSItem[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "재테크 및 부동산": { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/50" },
  "꿀팁 및 학습자료": { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/50" },
  "오늘의 이슈 및 일상": { bg: "bg-sky-500/20", text: "text-sky-400", border: "border-sky-500/50" },
  "영화 및 드라마": { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/50" },
  "오늘의 영어 ZOZIGI": { bg: "bg-indigo-500/20", text: "text-indigo-400", border: "border-indigo-500/50" },
  "건강과 운동": { bg: "bg-lime-500/20", text: "text-lime-400", border: "border-lime-500/50" },
  기타: { bg: "bg-zinc-500/20", text: "text-zinc-400", border: "border-zinc-500/50" },
}

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS["기타"]
}

function formatDate(dateString: string) {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    })
  } catch {
    return ""
  }
}

interface MindMapNodeProps {
  item: RSSItem
  index: number
  isExpanded: boolean
  onToggle: () => void
}

function MindMapNode({ item, index, isExpanded, onToggle }: MindMapNodeProps) {
  const primaryCategory = item.categories[0] || "기타"
  const colors = getCategoryColor(primaryCategory)

  return (
    <div
      className={cn(
        "relative pl-6 transition-all duration-300",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-px",
        colors.bg.replace("/20", "/40")
      )}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* 연결선 */}
      <div
        className={cn(
          "absolute left-0 top-5 h-px w-4",
          colors.bg.replace("/20", "/60")
        )}
        style={{ backgroundColor: `var(--${primaryCategory.replace(/\s/g, "-")}-color, currentColor)` }}
      />

      <div
        className={cn(
          "group cursor-pointer rounded-xl border p-4 transition-all duration-200",
          "hover:shadow-lg hover:shadow-black/20",
          colors.bg,
          colors.border,
          isExpanded && "ring-2 ring-white/20"
        )}
        onClick={onToggle}
      >
        <div className="flex items-start gap-3">
          <button className="mt-0.5 shrink-0 text-zinc-500 transition-transform duration-200 group-hover:text-zinc-300">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          <div className="min-w-0 flex-1">
            <h3 className={cn("line-clamp-2 font-medium leading-tight", colors.text)}>
              {item.title}
            </h3>

            {isExpanded && (
              <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-wrap gap-1.5">
                  {item.categories.map((cat, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className={cn(
                        "text-xs",
                        getCategoryColor(cat).bg,
                        getCategoryColor(cat).text,
                        getCategoryColor(cat).border
                      )}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span>{formatDate(item.pubDate)}</span>
                  {item.author && <span>by {item.author}</span>}
                </div>

                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
                    colors.text,
                    "hover:underline"
                  )}
                >
                  원문 보기 <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface CategoryBranchProps {
  category: string
  items: RSSItem[]
  isExpanded: boolean
  onToggle: () => void
  expandedItems: Set<string>
  onItemToggle: (id: string) => void
}

function CategoryBranch({
  category,
  items,
  isExpanded,
  onToggle,
  expandedItems,
  onItemToggle,
}: CategoryBranchProps) {
  const colors = getCategoryColor(category)

  return (
    <div className="relative">
      {/* 카테고리 헤더 */}
      <button
        onClick={onToggle}
        className={cn(
          "group flex w-full items-center gap-3 rounded-2xl border-2 p-4 transition-all duration-200",
          "hover:shadow-xl hover:shadow-black/20",
          colors.bg,
          colors.border,
          isExpanded && "ring-2 ring-white/20"
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold",
            colors.bg.replace("/20", "/40"),
            colors.text
          )}
        >
          {items.length}
        </div>

        <div className="min-w-0 flex-1 text-left">
          <h2 className={cn("text-lg font-bold", colors.text)}>{category}</h2>
          <p className="text-sm text-zinc-500">{items.length}개의 글</p>
        </div>

        <div className="text-zinc-500 transition-transform duration-200 group-hover:text-zinc-300">
          {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </div>
      </button>

      {/* 하위 아이템들 */}
      {isExpanded && (
        <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
          {items.map((item, index) => (
            <MindMapNode
              key={item.link}
              item={item}
              index={index}
              isExpanded={expandedItems.has(item.link)}
              onToggle={() => onItemToggle(item.link)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function RSSMindMap() {
  const { data, error, isLoading, mutate } = useSWR<ParsedRSS>("/api/rss", fetcher)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // 카테고리별로 그룹화
  const groupedByCategory = useMemo(() => {
    if (!data?.items) return new Map<string, RSSItem[]>()

    const groups = new Map<string, RSSItem[]>()
    data.items.forEach((item) => {
      const primaryCat = item.categories[0] || "기타"
      if (!groups.has(primaryCat)) {
        groups.set(primaryCat, [])
      }
      groups.get(primaryCat)!.push(item)
    })

    return groups
  }, [data])

  // 전체 카테고리 목록
  const allCategories = useMemo(() => {
    return Array.from(groupedByCategory.keys()).sort((a, b) => {
      const aCount = groupedByCategory.get(a)?.length || 0
      const bCount = groupedByCategory.get(b)?.length || 0
      return bCount - aCount
    })
  }, [groupedByCategory])

  // 필터링된 카테고리
  const filteredCategories = useMemo(() => {
    if (selectedCategories.size === 0) return allCategories
    return allCategories.filter((cat) => selectedCategories.has(cat))
  }, [allCategories, selectedCategories])

  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  const toggleCategoryExpand = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  const toggleItemExpand = useCallback((id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const clearFilters = useCallback(() => {
    setSelectedCategories(new Set())
  }, [])

  const expandAll = useCallback(() => {
    setExpandedCategories(new Set(filteredCategories))
  }, [filteredCategories])

  const collapseAll = useCallback(() => {
    setExpandedCategories(new Set())
    setExpandedItems(new Set())
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          <p className="text-zinc-500">RSS 피드를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-400">RSS 피드를 불러오는데 실패했습니다.</p>
          <Button onClick={() => mutate()} variant="outline">
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold text-zinc-100">{data?.channelTitle}</h1>
        <p className="text-sm text-zinc-500">총 {data?.items.length}개의 글</p>
      </div>

      {/* 필터 컨트롤 */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
            <Filter className="h-4 w-4" />
            <span>카테고리 필터</span>
            {selectedCategories.size > 0 && (
              <Badge variant="secondary" className="bg-zinc-800">
                {selectedCategories.size}개 선택
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedCategories.size > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-zinc-500">
                <X className="mr-1 h-3 w-3" />
                초기화
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => mutate()} className="h-8 text-xs text-zinc-500">
              <RefreshCw className="mr-1 h-3 w-3" />
              새로고침
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {allCategories.map((category) => {
            const colors = getCategoryColor(category)
            const isSelected = selectedCategories.has(category)
            const count = groupedByCategory.get(category)?.length || 0

            return (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                  isSelected
                    ? cn(colors.bg, colors.text, colors.border, "ring-2 ring-white/20")
                    : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600"
                )}
              >
                {category}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs",
                    isSelected ? "bg-white/10" : "bg-zinc-700"
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 펼치기/접기 컨트롤 */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={expandAll} className="text-xs">
          모두 펼치기
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll} className="text-xs">
          모두 접기
        </Button>
      </div>

      {/* 마인드맵 */}
      <div className="relative">
        {/* 중앙 노드 */}
        <div className="mb-8 flex justify-center">
          <div className="rounded-full border-2 border-zinc-600 bg-zinc-800 px-6 py-3 text-lg font-bold text-zinc-200 shadow-xl shadow-black/20">
            📚 RSS 마인드맵
          </div>
        </div>

        {/* 카테고리 브랜치들 */}
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {filteredCategories.map((category) => (
            <CategoryBranch
              key={category}
              category={category}
              items={groupedByCategory.get(category) || []}
              isExpanded={expandedCategories.has(category)}
              onToggle={() => toggleCategoryExpand(category)}
              expandedItems={expandedItems}
              onItemToggle={toggleItemExpand}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
