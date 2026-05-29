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
import { Filter, X, ExternalLink, Loader2, RefreshCw, List, Map as MapIcon, Gamepad2, BookOpen, ChevronRight, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface RSSItem {
  title: string
  link: string
  categories: string[]
  pubDate: string
  author: string
  games?: string[]
}

interface GameInfo {
  name: string
  type: string
  articles: { title: string; link: string }[]
}

interface ParsedRSS {
  channelTitle: string
  channelDescription: string
  items: RSSItem[]
  games: GameInfo[]
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

const GAME_COLORS: Record<string, { bg: string; text: string; border: string; hex: string }> = {
  "핀볼 게임": { bg: "bg-pink-500/20", text: "text-pink-400", border: "border-pink-500/50", hex: "#ec4899" },
  "테트리스": { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/50", hex: "#06b6d4" },
  "플래시 카드": { bg: "bg-violet-500/20", text: "text-violet-400", border: "border-violet-500/50", hex: "#8b5cf6" },
  "퀴즈": { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/50", hex: "#f97316" },
  "스네이크": { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/50", hex: "#22c55e" },
  "슈팅 게임": { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/50", hex: "#ef4444" },
  "미니 게임": { bg: "bg-teal-500/20", text: "text-teal-400", border: "border-teal-500/50", hex: "#14b8a6" },
}

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS["기타"]
}

function getGameColor(game: string) {
  return GAME_COLORS[game] || { bg: "bg-fuchsia-500/20", text: "text-fuchsia-400", border: "border-fuchsia-500/50", hex: "#d946ef" }
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

// 게임 허브 노드 컴포넌트
function GameHubNode({ data }: { data: { label: string; count: number } }) {
  return (
    <div className="rounded-2xl border-2 border-fuchsia-500/50 bg-fuchsia-500/20 px-5 py-3 shadow-lg">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="target" position={Position.Bottom} className="opacity-0" />
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="target" position={Position.Right} className="opacity-0" />
      <Handle type="source" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      <Handle type="source" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />
      <div className="flex items-center gap-2 text-center">
        <Gamepad2 className="h-5 w-5 text-fuchsia-400" />
        <div>
          <div className="font-bold text-fuchsia-400">{data.label}</div>
          <div className="text-xs text-zinc-500">{data.count}종류</div>
        </div>
      </div>
    </div>
  )
}

// 게임 노드 컴포넌트
function GameNode({ data }: { data: { name: string; type: string; articleCount: number } }) {
  const colors = getGameColor(data.name)
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
        <div className={cn("font-bold", colors.text)}>{data.name}</div>
        <div className="text-xs text-zinc-500">{data.type} / {data.articleCount}개 글</div>
      </div>
    </div>
  )
}

// 아이템 노드 컴포넌트
function ItemNode({ data }: { data: { title: string; link: string; date: string; category: string; isGame?: boolean } }) {
  const colors = data.isGame ? getGameColor(data.category) : getCategoryColor(data.category)
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
  gameHub: GameHubNode,
  game: GameNode,
  item: ItemNode,
}

export function RSSMindMap() {
  const { data, error, isLoading, mutate } = useSWR<ParsedRSS>("/api/rss", fetcher)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [selectedGames, setSelectedGames] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<"map" | "list" | "games" | "book">("map")
  const [bookChapter, setBookChapter] = useState(0)
  const [bookPage, setBookPage] = useState(0)
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

    // 게임 허브 노드 (게임이 있을 경우)
    const games = data.games || []
    const filteredGames = selectedGames.size > 0 
      ? games.filter(g => selectedGames.has(g.name))
      : games

    if (filteredGames.length > 0) {
      newNodes.push({
        id: "game-hub",
        type: "gameHub",
        position: { x: 0, y: -350 },
        data: { label: "게임 분석", count: filteredGames.length },
      })

      newEdges.push({
        id: "edge-center-games",
        source: "center",
        target: "game-hub",
        style: { stroke: "#d946ef", strokeWidth: 3 },
        animated: true,
      })

      // 게임 노드들을 게임 허브 주변에 배치
      const gameRadius = 200
      filteredGames.forEach((game, gameIndex) => {
        const angle = ((gameIndex / filteredGames.length) * Math.PI) - Math.PI / 2
        const gameX = Math.cos(angle) * gameRadius
        const gameY = -350 + Math.sin(angle) * gameRadius - 100
        const colors = getGameColor(game.name)

        newNodes.push({
          id: `game-${game.name}`,
          type: "game",
          position: { x: gameX, y: gameY },
          data: { name: game.name, type: game.type, articleCount: game.articles.length },
        })

        newEdges.push({
          id: `edge-hub-${game.name}`,
          source: "game-hub",
          target: `game-${game.name}`,
          style: { stroke: colors.hex, strokeWidth: 2 },
          animated: true,
        })

        // 게임 관련 글 노드
        const maxArticles = Math.min(game.articles.length, 4)
        game.articles.slice(0, maxArticles).forEach((article, artIndex) => {
          const artAngle = angle + ((artIndex - (maxArticles - 1) / 2) * 0.4)
          const artX = gameX + Math.cos(artAngle) * 150
          const artY = gameY + Math.sin(artAngle) * 100 - 80

          newNodes.push({
            id: `game-article-${game.name}-${artIndex}`,
            type: "item",
            position: { x: artX, y: artY },
            data: {
              title: article.title,
              link: article.link,
              date: "",
              category: game.name,
              isGame: true,
            },
          })

          newEdges.push({
            id: `edge-game-${game.name}-${artIndex}`,
            source: `game-${game.name}`,
            target: `game-article-${game.name}-${artIndex}`,
            style: { stroke: colors.hex, strokeWidth: 1, opacity: 0.5 },
          })
        })
      })
    }

    // 카테고리 노드들을 원형으로 배치
    const categoryRadius = 350
    const categoryCount = filteredCategories.length
    const startAngle = games.length > 0 ? Math.PI * 0.15 : -Math.PI / 2

    filteredCategories.forEach((category, catIndex) => {
      const angleRange = games.length > 0 ? Math.PI * 1.7 : Math.PI * 2
      const angle = startAngle + (catIndex / categoryCount) * angleRange
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
      const maxItems = Math.min(items.length, 6)
      items.slice(0, maxItems).forEach((item, itemIndex) => {
        const itemAngle = angle + ((itemIndex - (maxItems - 1) / 2) * 0.25)
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

      if (items.length > maxItems) {
        const moreAngle = angle + ((maxItems - (maxItems - 1) / 2) * 0.25)
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
  }, [data, filteredCategories, groupedByCategory, selectedGames, setNodes, setEdges])

  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }, [])

  const toggleGame = useCallback((game: string) => {
    setSelectedGames((prev) => {
      const next = new Set(prev)
      if (next.has(game)) next.delete(game)
      else next.add(game)
      return next
    })
  }, [])

  const clearFilters = useCallback(() => {
    setSelectedCategories(new Set())
    setSelectedGames(new Set())
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

  const games = data?.games || []

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{data?.channelTitle}</h1>
          <p className="text-sm text-zinc-500">
            총 {data?.items.length}개의 글 / {games.length}종류의 게임
          </p>
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
            variant={viewMode === "games" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("games")}
          >
            <Gamepad2 className="mr-1.5 h-4 w-4" />
            게임
          </Button>
          <Button
            variant={viewMode === "book" ? "default" : "outline"}
            size="sm"
            onClick={() => { setViewMode("book"); setBookChapter(0); setBookPage(0) }}
          >
            <BookOpen className="mr-1.5 h-4 w-4" />
            도서
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
            <span>필터</span>
            {(selectedCategories.size > 0 || selectedGames.size > 0) && (
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                {selectedCategories.size + selectedGames.size}개 선택
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(selectedCategories.size > 0 || selectedGames.size > 0) && (
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

        {/* 게임 필터 */}
        {games.length > 0 && (
          <div className="mb-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-fuchsia-400">
              <Gamepad2 className="h-3.5 w-3.5" />
              게임 종류
            </div>
            <div className="flex flex-wrap gap-2">
              {games.map((game) => {
                const colors = getGameColor(game.name)
                const isSelected = selectedGames.has(game.name)

                return (
                  <button
                    key={game.name}
                    onClick={() => toggleGame(game.name)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                      isSelected
                        ? cn(colors.bg, colors.text, colors.border, "ring-2 ring-white/20")
                        : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600"
                    )}
                  >
                    {game.name}
                    <span className={cn("rounded-full px-1.5 py-0.5 text-xs", isSelected ? "bg-white/10" : "bg-zinc-700")}>
                      {game.articles.length}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 카테고리 필터 */}
        <div>
          <div className="mb-2 text-xs font-medium text-zinc-500">카테고리</div>
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
      </div>

      {/* 마인드맵 뷰 */}
      {viewMode === "map" && (
        <div className="h-[700px] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.1 }}
            minZoom={0.1}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
            <Controls className="rounded-lg border border-zinc-700 bg-zinc-900" />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === "center") return "#3f3f46"
                if (node.type === "gameHub") return "#d946ef"
                if (node.type === "game") {
                  const name = node.data?.name as string
                  return getGameColor(name).hex
                }
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
      )}

      {/* 게임 뷰 */}
      {viewMode === "games" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => {
            const colors = getGameColor(game.name)
            return (
              <div key={game.name} className={cn("rounded-xl border-2 p-4", colors.bg, colors.border)}>
                <div className="mb-3 flex items-center gap-2">
                  <Gamepad2 className={cn("h-5 w-5", colors.text)} />
                  <div>
                    <h3 className={cn("font-bold", colors.text)}>{game.name}</h3>
                    <p className="text-xs text-zinc-500">{game.type} / {game.articles.length}개의 글</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {game.articles.map((article, idx) => (
                    <a
                      key={idx}
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-2 transition-all hover:bg-zinc-800/50"
                    >
                      <div className="line-clamp-2 text-sm font-medium text-zinc-200">{article.title}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                        <ExternalLink className="h-3 w-3" />
                        바로가기
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
          {games.length === 0 && (
            <div className="col-span-full py-12 text-center text-zinc-500">
              게임이 포함된 글이 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 도서 모드 */}
      {viewMode === "book" && (() => {
        const chapters = [
          { id: "toc", title: "목차", items: [] as RSSItem[], isToC: true },
          ...filteredCategories.map((cat, i) => ({
            id: cat,
            title: cat,
            chapterNum: i + 1,
            items: groupedByCategory.get(cat) || [],
            isToC: false,
          })),
        ]
        const currentChapter = chapters[bookChapter]
        const ITEMS_PER_PAGE = 5
        const currentItems = currentChapter.isToC ? [] : currentChapter.items
        const totalPages = currentChapter.isToC ? 1 : Math.ceil(currentItems.length / ITEMS_PER_PAGE)
        const pagedItems = currentItems.slice(bookPage * ITEMS_PER_PAGE, (bookPage + 1) * ITEMS_PER_PAGE)
        const colors = currentChapter.isToC ? null : getCategoryColor(currentChapter.id)

        const goPrev = () => {
          if (bookPage > 0) {
            setBookPage(bookPage - 1)
          } else if (bookChapter > 0) {
            const prevChapter = chapters[bookChapter - 1]
            const prevTotal = prevChapter.isToC ? 1 : Math.ceil((groupedByCategory.get(prevChapter.id)?.length || 0) / ITEMS_PER_PAGE)
            setBookChapter(bookChapter - 1)
            setBookPage(prevTotal - 1)
          }
        }
        const goNext = () => {
          if (bookPage < totalPages - 1) {
            setBookPage(bookPage + 1)
          } else if (bookChapter < chapters.length - 1) {
            setBookChapter(bookChapter + 1)
            setBookPage(0)
          }
        }
        const isFirst = bookChapter === 0 && bookPage === 0
        const isLast = bookChapter === chapters.length - 1 && bookPage === totalPages - 1

        return (
          <div className="flex gap-0 overflow-hidden rounded-2xl border border-zinc-700 shadow-2xl shadow-black/60" style={{ minHeight: 600 }}>
            {/* 목차 사이드바 */}
            <div className="w-52 shrink-0 border-r border-zinc-700 bg-zinc-900 flex flex-col">
              <div className="border-b border-zinc-700 px-4 py-4">
                <div className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">목차</div>
                <div className="text-sm font-bold text-zinc-200 leading-snug line-clamp-2">{data?.channelTitle}</div>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {chapters.map((ch, idx) => {
                  const active = bookChapter === idx
                  const chColors = ch.isToC ? null : getCategoryColor(ch.id)
                  return (
                    <button
                      key={ch.id}
                      onClick={() => { setBookChapter(idx); setBookPage(0) }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-xs transition-all flex items-start gap-2",
                        active
                          ? "bg-zinc-800 font-semibold text-zinc-100"
                          : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                      )}
                    >
                      {!ch.isToC && (
                        <span
                          className="mt-0.5 shrink-0 rounded px-1 py-0.5 text-[9px] font-bold"
                          style={{ background: chColors ? chColors.hex + "33" : undefined, color: chColors?.hex }}
                        >
                          {(ch as any).chapterNum}장
                        </span>
                      )}
                      <span className="leading-snug">{ch.title}</span>
                    </button>
                  )
                })}
              </div>
              <div className="border-t border-zinc-700 px-4 py-3 text-[10px] text-zinc-600">
                총 {data?.items.length}편 수록
              </div>
            </div>

            {/* 본문 페이지 */}
            <div className="flex flex-1 flex-col bg-zinc-950">
              {/* 페이지 헤더 */}
              <div className="flex items-center justify-between border-b border-zinc-800 px-8 py-4">
                <div className="text-xs text-zinc-600 uppercase tracking-widest">
                  {currentChapter.isToC ? "목차" : `제${(currentChapter as any).chapterNum}장`}
                </div>
                <div className="text-xs text-zinc-600">
                  {currentChapter.isToC ? "" : `${bookPage + 1} / ${totalPages} 페이지`}
                </div>
              </div>

              {/* 페이지 본문 */}
              <div className="flex-1 overflow-y-auto px-10 py-8">
                {currentChapter.isToC ? (
                  // 목차 페이지
                  <div>
                    <h1 className="mb-2 text-3xl font-bold text-zinc-100" style={{ fontFamily: "serif" }}>목차</h1>
                    <div className="mb-8 h-px bg-zinc-700" />
                    <div className="space-y-3">
                      {chapters.filter(ch => !ch.isToC).map((ch) => {
                        const chColors = getCategoryColor(ch.id)
                        return (
                          <button
                            key={ch.id}
                            onClick={() => { setBookChapter(chapters.indexOf(ch)); setBookPage(0) }}
                            className="flex w-full items-baseline gap-3 text-left group"
                          >
                            <span className="text-sm font-bold shrink-0" style={{ color: chColors.hex }}>
                              제{(ch as any).chapterNum}장
                            </span>
                            <span className="flex-1 border-b border-dotted border-zinc-700 pb-1 text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">
                              {ch.title}
                            </span>
                            <span className="shrink-0 text-xs text-zinc-600">{ch.items.length}편</span>
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-10 pt-6 border-t border-zinc-800">
                      <div className="text-xs text-zinc-600">
                        게임 콘텐츠 {games.length}종 · 총 {data?.items.length}편 수록
                      </div>
                    </div>
                  </div>
                ) : (
                  // 챕터 본문 페이지
                  <div>
                    <div className="mb-1 text-xs font-medium" style={{ color: colors?.hex }}>
                      제{(currentChapter as any).chapterNum}장
                    </div>
                    <h2 className="mb-6 text-2xl font-bold text-zinc-100" style={{ fontFamily: "serif" }}>
                      {currentChapter.title}
                    </h2>
                    <div className="mb-6 h-px bg-zinc-800" />
                    <div className="space-y-5">
                      {pagedItems.map((item, idx) => {
                        const globalIdx = bookPage * ITEMS_PER_PAGE + idx + 1
                        return (
                          <a
                            key={item.link}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-all hover:border-zinc-600 hover:bg-zinc-900"
                          >
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                              style={{ background: colors ? colors.hex + "22" : undefined, color: colors?.hex }}
                            >
                              {globalIdx}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold leading-snug text-zinc-200 group-hover:text-zinc-100">
                                {item.title}
                              </div>
                              <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-600">
                                <span>{formatDate(item.pubDate)}</span>
                                {item.games && item.games.length > 0 && (
                                  <span className="flex items-center gap-1 text-fuchsia-400">
                                    <Gamepad2 className="h-3 w-3" />
                                    {item.games[0]}
                                  </span>
                                )}
                                <ExternalLink className="ml-auto h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                              </div>
                            </div>
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 페이지 푸터 - 이전/다음 */}
              <div className="flex items-center justify-between border-t border-zinc-800 px-8 py-4">
                <button
                  onClick={goPrev}
                  disabled={isFirst}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-zinc-500 transition-all hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  이전 페이지
                </button>
                <div className="flex gap-1.5">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setBookPage(i)}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === bookPage ? "w-6 bg-zinc-400" : "w-1.5 bg-zinc-700 hover:bg-zinc-600"
                      )}
                    />
                  ))}
                </div>
                <button
                  onClick={goNext}
                  disabled={isLast}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-zinc-500 transition-all hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-30 disabled:pointer-events-none"
                >
                  다음 페이지
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 리스트 뷰 */}
      {viewMode === "list" && (
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
                        {item.games && item.games.length > 0 && (
                          <Badge className="bg-fuchsia-500/20 text-fuchsia-400 text-[10px]">
                            <Gamepad2 className="mr-1 h-2.5 w-2.5" />
                            {item.games[0]}
                          </Badge>
                        )}
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
