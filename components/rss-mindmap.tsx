"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import useSWR from "swr"
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  BackgroundVariant,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { cn } from "@/lib/utils"
import { Filter, X, ExternalLink, Loader2, RefreshCw, List, Map as MapIcon } from "lucide-react"
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

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; hex: string }> = {
  "재테크 및 부동산": { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/50", hex: "#10b981" },
  "꿀팁 및 학습자료": { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/50", hex: "#f59e0b" },
  "오늘의 이슈 및 일상": { bg: "bg-sky-500/20", text: "text-sky-400", border: "border-sky-500/50", hex: "#0ea5e9" },
  "영화 및 드라마": { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/50", hex: "#f43f5e" },
  "오늘의 영어 ZOZIGI": { bg: "bg-indigo-500/20", text: "text-indigo-400", border: "border-indigo-500/50", hex: "#6366f1" },
  "건강과 운동": { bg: "bg-lime-500/20", text: "text-lime-400", border: "border-lime-500/50", hex: "#84cc16" },
  기타: { bg: "bg-zinc-500/20", text: "text-zinc-400", border: "border-zinc-500/50", hex: "#71717a" },
}

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS["기타"]
}

function formatDate(dateString: string) {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
  } catch {
    return ""
  }
}

// 중앙 노드 컴포넌트
function CenterNode({ data }: { data: { label: string; count: number } }) {
  return (
    <div className="rounded-2xl border-2 border-zinc-500 bg-zinc-900 px-6 py-4 shadow-2xl shadow-black/50">
      <Handle type="source" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      <Handle type="source" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />
      <div className="text-center">
        <div className="text-lg font-bold text-zinc-100">{data.label}</div>
        <div className="text-sm text-zinc-500">{data.count}개의 글</div>
      </div>
    </div>
  )
}

// 카테고리 노드 컴포넌트
function CategoryNode({ data }: { data: { label: string; count: number; color: string } }) {
  const colors = getCategoryColor(data.label)
  return (
    <div
      className={cn(
        "rounded-xl border-2 px-4 py-3 shadow-lg transition-transform hover:scale-105",
        colors.bg,
        colors.border
      )}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="target" position={Position.Bottom} className="opacity-0" />
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="target" position={Position.Right} className="opacity-0" />
      <Handle type="source" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      <Handle type="source" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />
      <div className="text-center">
        <div className={cn("font-bold", colors.text)}>{data.label}</div>
        <div className="text-xs text-zinc-500">{data.count}개</div>
      </div>
    </div>
  )
}

// 아이템 노드 컴포넌트
function ItemNode({ data }: { data: { title: string; link: string; date: string; category: string } }) {
  const colors = getCategoryColor(data.category)
  return (
    <div
      className={cn(
        "max-w-[200px] rounded-lg border px-3 py-2 shadow-md transition-all hover:shadow-xl cursor-pointer",
        colors.bg,
        colors.border
      )}
      onClick={() => window.open(data.link, "_blank")}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="target" position={Position.Bottom} className="opacity-0" />
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="target" position={Position.Right} className="opacity-0" />
      <div className={cn("line-clamp-2 text-xs font-medium", colors.text)}>{data.title}</div>
      <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500">
        <span>{data.date}</span>
        <ExternalLink className="h-2.5 w-2.5" />
      </div>
    </div>
  )
}

const nodeTypes = {
  center: CenterNode,
  category: CategoryNode,
  item: ItemNode,
}

export function RSSMindMap() {
  const { data, error, isLoading, mutate } = useSWR<ParsedRSS>("/api/rss", fetcher)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<"map" | "list">("map")
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // 카테고리별로 그룹화
  const groupedByCategory = useMemo(() => {
    if (!data?.items) return new Map<string, RSSItem[]>()
    const groups = new Map<string, RSSItem[]>()
    data.items.forEach((item) => {
      const primaryCat = item.categories[0] || "기타"
      if (!groups.has(primaryCat)) groups.set(primaryCat, [])
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

  // 노드와 엣지 생성
  useEffect(() => {
    if (!data?.items || filteredCategories.length === 0) return

    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // 중앙 노드
    const totalItems = filteredCategories.reduce(
      (sum, cat) => sum + (groupedByCategory.get(cat)?.length || 0),
      0
    )
    newNodes.push({
      id: "center",
      type: "center",
      position: { x: 0, y: 0 },
      data: { label: data.channelTitle || "RSS 피드", count: totalItems },
    })

    // 카테고리 노드들을 원형으로 배치
    const categoryRadius = 300
    const categoryCount = filteredCategories.length
    filteredCategories.forEach((category, catIndex) => {
      const angle = (catIndex / categoryCount) * 2 * Math.PI - Math.PI / 2
      const catX = Math.cos(angle) * categoryRadius
      const catY = Math.sin(angle) * categoryRadius
      const items = groupedByCategory.get(category) || []
      const colors = getCategoryColor(category)

      newNodes.push({
        id: `cat-${category}`,
        type: "category",
        position: { x: catX, y: catY },
        data: { label: category, count: items.length, color: colors.hex },
      })

      newEdges.push({
        id: `edge-center-${category}`,
        source: "center",
        target: `cat-${category}`,
        style: { stroke: colors.hex, strokeWidth: 2 },
        animated: true,
      })

      // 아이템 노드들을 카테고리 주변에 배치
      const itemRadius = 150
      const maxItems = Math.min(items.length, 8) // 최대 8개만 표시
      items.slice(0, maxItems).forEach((item, itemIndex) => {
        const itemAngle = angle + ((itemIndex - (maxItems - 1) / 2) * 0.3)
        const itemX = catX + Math.cos(itemAngle) * itemRadius
        const itemY = catY + Math.sin(itemAngle) * itemRadius

        newNodes.push({
          id: `item-${item.link}`,
          type: "item",
          position: { x: itemX, y: itemY },
          data: {
            title: item.title,
            link: item.link,
            date: formatDate(item.pubDate),
            category: category,
          },
        })

        newEdges.push({
          id: `edge-${category}-${item.link}`,
          source: `cat-${category}`,
          target: `item-${item.link}`,
          style: { stroke: colors.hex, strokeWidth: 1, opacity: 0.5 },
        })
      })

      // 더 많은 아이템이 있으면 표시
      if (items.length > maxItems) {
        const moreAngle = angle + ((maxItems - (maxItems - 1) / 2) * 0.3)
        newNodes.push({
          id: `more-${category}`,
          type: "item",
          position: {
            x: catX + Math.cos(moreAngle) * itemRadius,
            y: catY + Math.sin(moreAngle) * itemRadius,
          },
          data: {
            title: `+${items.length - maxItems}개 더보기`,
            link: "#",
            date: "",
            category: category,
          },
        })
      }
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }, [data, filteredCategories, groupedByCategory, setNodes, setEdges])

  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }, [])

  const clearFilters = useCallback(() => {
    setSelectedCategories(new Set())
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          <p className="text-zinc-500">RSS 피드를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
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
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{data?.channelTitle}</h1>
          <p className="text-sm text-zinc-500">총 {data?.items.length}개의 글</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "map" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("map")}
          >
            <MapIcon className="mr-1.5 h-4 w-4" />
            맵
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="mr-1.5 h-4 w-4" />
            목록
          </Button>
        </div>
      </div>

      {/* 필터 컨트롤 */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
            <Filter className="h-4 w-4" />
            <span>카테고리 필터</span>
            {selectedCategories.size > 0 && (
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
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
                <span className={cn("rounded-full px-1.5 py-0.5 text-xs", isSelected ? "bg-white/10" : "bg-zinc-700")}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 마인드맵 뷰 */}
      {viewMode === "map" ? (
        <div className="h-[600px] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
            <Controls className="rounded-lg border border-zinc-700 bg-zinc-900" />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === "center") return "#3f3f46"
                if (node.type === "category") {
                  const label = node.data?.label as string
                  return getCategoryColor(label).hex
                }
                return "#52525b"
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-900"
            />
          </ReactFlow>
        </div>
      ) : (
        /* 리스트 뷰 */
        <div className="space-y-4">
          {filteredCategories.map((category) => {
            const items = groupedByCategory.get(category) || []
            const colors = getCategoryColor(category)

            return (
              <div key={category} className={cn("rounded-xl border p-4", colors.bg, colors.border)}>
                <h3 className={cn("mb-3 text-lg font-bold", colors.text)}>
                  {category} <span className="text-sm font-normal text-zinc-500">({items.length})</span>
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <a
                      key={item.link}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "block rounded-lg border p-3 transition-all hover:shadow-lg",
                        "border-zinc-700/50 bg-zinc-900/50 hover:bg-zinc-800/50"
                      )}
                    >
                      <div className="line-clamp-2 text-sm font-medium text-zinc-200">{item.title}</div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                        <span>{formatDate(item.pubDate)}</span>
                        <ExternalLink className="h-3 w-3" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
