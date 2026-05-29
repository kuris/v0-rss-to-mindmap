"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
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
import { Filter, X, ExternalLink, Loader2, RefreshCw, List, Map as MapIcon, Gamepad2, BookOpen, ChevronRight, ChevronLeft, Maximize, Minimize, Sword, Shield, Heart, Trophy, Sparkles, Coins } from "lucide-react"
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
  const [viewMode, setViewMode] = useState<"map" | "list" | "games" | "book" | "dungeon">("map")
  const [bookChapter, setBookChapter] = useState(0)
  const [bookPage, setBookPage] = useState(0)
  const [bookTheme, setBookTheme] = useState<"parchment" | "modern">("parchment")

  // --- 로그라이크 던전 크롤러 상태 ---
  const [playerHp, setPlayerHp] = useState(100)
  const [playerMaxHp, setPlayerMaxHp] = useState(100)
  const [playerLevel, setPlayerLevel] = useState(1)
  const [playerXp, setPlayerXp] = useState(0)
  const [playerGold, setPlayerGold] = useState(50) // 시작시 50골드 지급
  const [playerPotions, setPlayerPotions] = useState(1) // 시작시 1포션 지급
  const [dungeonFloor, setDungeonFloor] = useState(0)
  const [dungeonRoom, setDungeonRoom] = useState(0)
  const [dungeonState, setDungeonState] = useState<"start" | "explore" | "battle" | "gameover" | "win">("start")
  const [monsterHp, setMonsterHp] = useState(0)
  const [monsterMaxHp, setMonsterMaxHp] = useState(0)
  const [currentMonsterName, setCurrentMonsterName] = useState("")
  const [currentMonsterDesc, setCurrentMonsterDesc] = useState("")
  const [currentMonsterImg, setCurrentMonsterImg] = useState("")
  const [currentQuiz, setCurrentQuiz] = useState<{ question: string; options: string[]; correctIdx: number } | null>(null)
  const [battleLogs, setBattleLogs] = useState<string[]>([])

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err)
      })
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

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

  // --- 로그라이크 던전 크롤러 로직 ---
  const dungeonFloors = useMemo(() => {
    return filteredCategories.filter(cat => cat !== "기타" && cat !== "목차");
  }, [filteredCategories]);

  const currentFloorItems = useMemo(() => {
    const floorCat = dungeonFloors[dungeonFloor];
    if (!floorCat) return [];
    return groupedByCategory.get(floorCat) || [];
  }, [dungeonFloors, dungeonFloor, groupedByCategory]);

  const generateQuiz = useCallback((item: RSSItem, categoryItems: RSSItem[]) => {
    const title = item.title;
    // 제목에서 퀴즈 단어로 삼을 후보 단어를 추출합니다.
    const words = title.split(/\s+/).map(w => w.replace(/[\[\]\(\)\{\}"'🚀🎮🔥💻💡!?,.-]/g, "").trim()).filter(w => w.length >= 2);
    
    // 가장 적절한 단어 선택 (영어 단어나 한글 명사구)
    let targetWord = words.find(w => /^[a-zA-Z]{3,12}$/.test(w)) || words.find(w => w.length >= 3 && w.length <= 6) || words[Math.floor(words.length / 2)] || "학습";
    
    // 제목에서 해당 단어를 ____로 치환합니다.
    const escapedTarget = targetWord.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedTarget, 'g');
    const question = title.replace(regex, " ____ ");
    
    // 오답 리스트를 추출합니다. 다른 글들의 제목에서 단어를 가져옵니다.
    const distractors = new Set<string>();
    categoryItems.forEach(otherItem => {
      if (otherItem.title !== title) {
        otherItem.title.split(/\s+/).forEach(w => {
          const cleanW = w.replace(/[\[\]\(\)\{\}"'🚀🎮🔥💻💡!?,.-]/g, "").trim();
          if (cleanW.length >= 2 && cleanW !== targetWord && cleanW.length <= 6) {
            distractors.add(cleanW);
          }
        });
      }
    });
    
    const defaultDistractors = ["영어", "단어", "상식", "게임", "재테크", "공부", "분석", "비밀", "교실", "대도사"];
    const distractorArray = Array.from(distractors);
    while (distractorArray.length < 3) {
      const randW = defaultDistractors[Math.floor(Math.random() * defaultDistractors.length)];
      if (!distractorArray.includes(randW) && randW !== targetWord) {
        distractorArray.push(randW);
      }
    }
    
    const selectedDistractors: string[] = [];
    while (selectedDistractors.length < 3 && distractorArray.length > 0) {
      const idx = Math.floor(Math.random() * distractorArray.length);
      selectedDistractors.push(distractorArray.splice(idx, 1)[0]);
    }
    
    const options = [targetWord, ...selectedDistractors];
    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    
    const correctIdx = options.indexOf(targetWord);
    
    return {
      question,
      options,
      correctIdx
    };
  }, []);

  const startDungeon = () => {
    setPlayerHp(100);
    setPlayerMaxHp(100);
    setPlayerLevel(1);
    setPlayerXp(0);
    setPlayerGold(50);
    setPlayerPotions(1);
    setDungeonFloor(0);
    setDungeonRoom(0);
    setDungeonState("explore");
    setBattleLogs(["⚔️ 숲속 깊은 모험의 던전 입구에 입장하셨습니다!"]);
  };

  const YERIN_MONSTER_ASSETS = [
    "https://raw.githubusercontent.com/chrkim0718-coder/zozigi-assets/main/characters/Yerin_FANTASY_HIGH_20260523121654_26.webp",
    "https://raw.githubusercontent.com/chrkim0718-coder/zozigi-assets/main/characters/Yerin_FANTASY_HIGH_20260523121815_44.webp",
    "https://raw.githubusercontent.com/chrkim0718-coder/zozigi-assets/main/characters/Yerin_FANTASY_HIGH_20260523121857_52.webp",
    "https://raw.githubusercontent.com/chrkim0718-coder/zozigi-assets/main/characters/Yerin_EXPERT_HIGH_20260523121508_0.webp",
    "https://raw.githubusercontent.com/chrkim0718-coder/zozigi-assets/main/characters/Yerin_EXPERT_HIGH_20260523121611_15.webp",
    "https://raw.githubusercontent.com/chrkim0718-coder/zozigi-assets/main/characters/Yerin_CASUAL_MID_20260523121514_1.webp",
    "https://raw.githubusercontent.com/chrkim0718-coder/zozigi-assets/main/characters/Yerin_CASUAL_MID_20260523121605_14.webp",
    "https://raw.githubusercontent.com/chrkim0718-coder/zozigi-assets/main/characters/Yerin_CASUAL_MID_20260523121701_27.webp"
  ];

  const enterBattle = () => {
    const item = currentFloorItems[dungeonRoom];
    if (!item) return;

    const maxHp = 30 + dungeonFloor * 20;
    setMonsterHp(maxHp);
    setMonsterMaxHp(maxHp);
    setCurrentMonsterName(item.title);
    setCurrentMonsterDesc(item.description || "이 방을 지키고 있는 사악한 괴물입니다.");
    
    // 에셋 목록에서 무작위 캐릭터 이미지를 몬스터 스킨으로 선택!
    const randImg = YERIN_MONSTER_ASSETS[Math.floor(Math.random() * YERIN_MONSTER_ASSETS.length)];
    setCurrentMonsterImg(randImg);
    
    const quiz = generateQuiz(item, currentFloorItems);
    setCurrentQuiz(quiz);
    setDungeonState("battle");
    
    setBattleLogs(prev => [
      ...prev,
      `😈 [몬스터 조우] "${item.title}"가(이) 출현했습니다! (HP: ${maxHp})`
    ]);
  };

  const handleAttack = (selectedIdx: number) => {
    if (!currentQuiz) return;
    
    const logs = [...battleLogs];
    if (selectedIdx === currentQuiz.correctIdx) {
      // 정답! 플레이어가 공격합니다.
      const damage = Math.floor(Math.random() * 15) + 15 + playerLevel * 5; // 15~30 + 레벨 보너스
      const newHp = Math.max(0, monsterHp - damage);
      setMonsterHp(newHp);
      
      logs.push(`🎯 정답입니다! 몬스터에게 ${damage}의 치명타를 입혔습니다!`);
      
      if (newHp === 0) {
        // 몬스터 처치!
        const xpEarned = 15 + dungeonFloor * 10;
        const goldEarned = 15 + dungeonFloor * 10;
        const nextXp = playerXp + xpEarned;
        
        logs.push(`🏆 승리! 몬스터를 물리쳤습니다! (+${xpEarned} XP / +${goldEarned} Gold)`);
        
        let nextLevel = playerLevel;
        let nextMaxHp = playerMaxHp;
        let nextHp = playerHp;
        if (nextXp >= playerLevel * 100) {
          nextLevel += 1;
          nextMaxHp += 20;
          nextHp = nextMaxHp; // 완치
          logs.push(`✨ LEVEL UP! 플레이어가 Level ${nextLevel}로 전직했습니다! (최대 HP 증가 & HP 완치!)`);
          setPlayerXp(nextXp - playerLevel * 100);
        } else {
          setPlayerXp(nextXp);
        }
        
        setPlayerLevel(nextLevel);
        setPlayerMaxHp(nextMaxHp);
        setPlayerHp(nextHp);
        setPlayerGold(prev => prev + goldEarned);
        
        // 다음 방 혹은 다음 층 체크
        const isFloorCleared = dungeonRoom >= currentFloorItems.length - 1;
        if (isFloorCleared) {
          const isAllCleared = dungeonFloor >= dungeonFloors.length - 1;
          if (isAllCleared) {
            setDungeonState("win");
            logs.push("👑 대축하! 모든 던전을 돌파하고 '블로그의 군주'로 거듭났습니다!");
          } else {
            // 다음 층으로 이동
            setDungeonFloor(prev => prev + 1);
            setDungeonRoom(0);
            setDungeonState("explore");
            logs.push(`🚀 제${dungeonFloor + 2}층 [${dungeonFloors[dungeonFloor + 1]}] 던전에 진입하셨습니다!`);
          }
        } else {
          setDungeonRoom(prev => prev + 1);
          setDungeonState("explore");
        }
      }
    } else {
      // 오답! 몬스터가 플레이어를 공격합니다.
      const monsterDamage = Math.floor(Math.random() * 8) + 8 + dungeonFloor * 4; // 8~16 + 층 보너스
      const newHp = Math.max(0, playerHp - monsterDamage);
      setPlayerHp(newHp);
      
      logs.push(`❌ 오답입니다! 정답은 [${currentQuiz.options[currentQuiz.correctIdx]}] 이었습니다.`);
      logs.push(`💥 몬스터가 분노하여 반격했습니다! 당신은 ${monsterDamage}의 피해를 입었습니다.`);
      
      if (newHp === 0) {
        setDungeonState("gameover");
        logs.push("💀 당신은 쓰러졌습니다... 던전 탐험 실패!");
      } else {
        // 퀴즈 갱신하여 계속 싸우게 함
        const item = currentFloorItems[dungeonRoom];
        if (item) {
          const nextQuiz = generateQuiz(item, currentFloorItems);
          setCurrentQuiz(nextQuiz);
        }
      }
    }
    setBattleLogs(logs);
  };

  const usePotion = () => {
    if (playerPotions <= 0) return;
    if (playerHp >= playerMaxHp) {
      setBattleLogs(prev => [...prev, "❤️ 이미 체력이 가득 차 있습니다!"]);
      return;
    }
    setPlayerPotions(prev => prev - 1);
    setPlayerHp(prev => Math.min(playerMaxHp, prev + 50));
    setBattleLogs(prev => [...prev, "🧪 포션을 마셔 체력을 50 회복했습니다!"]);
  };

  const buyPotion = () => {
    if (playerGold < 30) {
      setBattleLogs(prev => [...prev, "💰 골드가 부족합니다! (포션 가격: 30 Gold)"]);
      return;
    }
    setPlayerGold(prev => prev - 30);
    setPlayerPotions(prev => prev + 1);
    setBattleLogs(prev => [...prev, "🧪 상점에서 포션을 1개 구매했습니다. (-30 Gold)"]);
  };

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
            variant={viewMode === "dungeon" ? "default" : "outline"}
            size="sm"
            onClick={() => { setViewMode("dungeon"); startDungeon(); }}
            className={cn(
              viewMode === "dungeon" 
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-[0_0_10px_rgba(225,29,72,0.4)] animate-pulse" 
                : "border-rose-950 text-rose-400 hover:bg-rose-950/20"
            )}
          >
            <Sword className="mr-1.5 h-4 w-4" />
            던전
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
        <div 
          ref={containerRef}
          className={cn(
            "relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 transition-all",
            isFullscreen 
              ? "fixed inset-0 z-50 h-screen w-screen rounded-none border-none" 
              : "h-[calc(100vh-260px)] min-h-[600px]"
          )}
        >
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            className="absolute right-4 top-4 z-10 border-zinc-700 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            title={isFullscreen ? "전체화면 축소" : "전체화면 확대"}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
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

        const isParchment = bookTheme === "parchment"

        return (
          <div 
            className={cn(
              "relative flex gap-0 overflow-hidden rounded-2xl p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] transition-colors duration-300",
              isParchment 
                ? "bg-[#2b1708] border-[8px] border-[#3a200e] ring-2 ring-[#c5a86a]/80" 
                : "bg-[#0d0d11] border-[8px] border-zinc-800 ring-2 ring-zinc-700/30"
            )}
            style={{ minHeight: 650 }}
          >
            {/* 목차 사이드바 (왼쪽 페이지) */}
            <div 
              className={cn(
                "w-56 shrink-0 flex flex-col relative transition-all duration-300 rounded-l-lg",
                isParchment
                  ? "bg-parchment text-[#3c2a1e] font-rpg-body border-r-2 border-[#8c7456]/40 shadow-[inset_-10px_0_20px_rgba(0,0,0,0.06)]"
                  : "bg-zinc-900 text-zinc-300 font-sans border-r border-zinc-800 shadow-[inset_-10px_0_20px_rgba(0,0,0,0.15)]"
              )}
            >
              <div 
                className={cn(
                  "px-5 py-5 border-b transition-colors duration-300",
                  isParchment ? "border-[#8c7456]/30" : "border-zinc-800"
                )}
              >
                <div 
                  className={cn(
                    "text-[10px] font-bold tracking-widest mb-1.5 transition-colors duration-300",
                    isParchment ? "font-rpg-title text-[#8c7456]" : "font-sans text-zinc-500"
                  )}
                >
                  Table of Contents
                </div>
                <div 
                  className={cn(
                    "text-sm font-bold leading-snug line-clamp-2 transition-colors duration-300",
                    isParchment ? "font-rpg-title text-[#4c321a]" : "font-sans text-zinc-200"
                  )}
                >
                  {data?.channelTitle}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto py-3 px-2">
                {chapters.map((ch, idx) => {
                  const active = bookChapter === idx
                  const chColors = ch.isToC ? null : getCategoryColor(ch.id)
                  return (
                    <button
                      key={ch.id}
                      onClick={() => { setBookChapter(idx); setBookPage(0) }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-xs flex items-start gap-2 rounded-md transition-all duration-300 cursor-pointer",
                        isParchment ? "font-rpg-body" : "font-sans",
                        active
                          ? (isParchment
                              ? "bg-[#8c7456]/15 text-[#402306] font-bold border-l-4 border-[#8c7456] pl-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]"
                              : "bg-zinc-800 text-zinc-100 font-bold border-l-4 border-indigo-500 pl-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]")
                          : (isParchment
                              ? "text-[#6d5137] hover:bg-[#8c7456]/10 hover:text-[#3c2a1e]"
                              : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200")
                      )}
                    >
                      {!ch.isToC && (
                        <span
                          className={cn(
                            "mt-0.5 shrink-0 rounded border px-1 py-0.5 text-[8px] font-bold transition-all duration-300",
                            isParchment
                              ? "border-[#8c7456]/40 bg-[#eadeb8]/30 font-rpg-title"
                              : "border-zinc-700 bg-zinc-800 font-sans"
                          )}
                          style={{ color: chColors?.hex || (isParchment ? "#8c7456" : "#818cf8") }}
                        >
                          {(ch as any).chapterNum}
                        </span>
                      )}
                      <span className="leading-snug">{ch.title}</span>
                    </button>
                  )
                })}
              </div>
              <div 
                className={cn(
                  "px-5 py-3.5 text-[10px] font-medium border-t transition-colors duration-300",
                  isParchment 
                    ? "border-[#8c7456]/30 text-[#8c7456] font-rpg-body italic" 
                    : "border-zinc-800 text-zinc-500 font-sans"
                )}
              >
                총 {data?.items.length}편 수록
              </div>
            </div>

            {/* RPG 책 중간 책등(접힌 그림자) 효과선 */}
            <div 
              className={cn(
                "absolute top-0 bottom-0 left-[244px] w-6 pointer-events-none z-10 transition-all duration-300",
                isParchment 
                  ? "bg-gradient-to-r from-black/0 via-black/35 to-black/0" 
                  : "bg-gradient-to-r from-black/0 via-black/55 to-black/0"
              )}
            />

            {/* 본문 페이지 (오른쪽 페이지) */}
            <div 
              className={cn(
                "flex flex-1 flex-col transition-all duration-300 rounded-r-lg",
                isParchment
                  ? "bg-parchment text-[#2b1a0e] font-rpg-body shadow-[inset_10px_0_20px_rgba(0,0,0,0.06)]"
                  : "bg-zinc-950 text-zinc-300 font-sans shadow-[inset_10px_0_20px_rgba(0,0,0,0.2)]"
              )}
            >
              {/* 페이지 헤더 */}
              <div 
                className={cn(
                  "flex items-center justify-between border-b px-8 py-4 transition-colors duration-300",
                  isParchment ? "border-[#8c7456]/30" : "border-zinc-800"
                )}
              >
                <div 
                  className={cn(
                    "text-[10px] font-bold tracking-widest transition-colors duration-300",
                    isParchment ? "font-rpg-title text-[#8c7456]" : "font-sans text-zinc-500"
                  )}
                >
                  {currentChapter.isToC ? "Index" : `Chapter ${(currentChapter as any).chapterNum}`}
                </div>

                {/* 테마 토글 및 페이지 번호 */}
                <div className="flex items-center gap-4">
                  {/* Theme Switcher Segmented Control */}
                  <div 
                    className={cn(
                      "flex rounded-md p-0.5 text-[10px] font-semibold border transition-all duration-300",
                      isParchment 
                        ? "bg-[#eadeb8]/40 border-[#8c7456]/40" 
                        : "bg-zinc-900 border-zinc-800"
                    )}
                  >
                    <button
                      onClick={() => setBookTheme("parchment")}
                      className={cn(
                        "px-2 py-0.5 rounded transition-all duration-200 cursor-pointer",
                        bookTheme === "parchment"
                          ? (isParchment ? "bg-[#8c7456] text-[#fbf9f4] shadow-sm" : "bg-zinc-700 text-white")
                          : (isParchment ? "text-[#8c7456] hover:bg-[#8c7456]/15" : "text-zinc-400 hover:text-zinc-200")
                      )}
                    >
                      양피지 고서
                    </button>
                    <button
                      onClick={() => setBookTheme("modern")}
                      className={cn(
                        "px-2 py-0.5 rounded transition-all duration-200 cursor-pointer",
                        bookTheme === "modern"
                          ? (isParchment ? "bg-[#8c7456] text-[#fbf9f4] shadow-sm" : "bg-zinc-800 text-zinc-100 shadow-sm")
                          : (isParchment ? "text-[#8c7456] hover:bg-[#8c7456]/15" : "text-zinc-500 hover:text-zinc-300")
                      )}
                    >
                      일반 도서
                    </button>
                  </div>

                  <div 
                    className={cn(
                      "text-xs font-medium transition-colors duration-300",
                      isParchment ? "font-rpg-title text-[#8c7456] italic" : "font-sans text-zinc-500"
                    )}
                  >
                    {currentChapter.isToC ? "Start" : `${bookPage + 1} / ${totalPages} Page`}
                  </div>
                </div>
              </div>

              {/* 페이지 본문 */}
              <div className="flex-1 overflow-y-auto px-10 py-8">
                {currentChapter.isToC ? (
                  // 목차 페이지
                  <div>
                    <h1 
                      className={cn(
                        "mb-2 text-2xl font-bold tracking-wide text-center mt-2 transition-colors duration-300",
                        isParchment ? "font-rpg-title text-[#4c321a]" : "font-sans text-zinc-100"
                      )}
                    >
                      목차
                    </h1>
                    
                    {/* 장식적 디바이더 */}
                    <div className="flex items-center justify-center my-6 gap-3 select-none">
                      <div 
                        className={cn(
                          "h-[1px] flex-1 transition-all duration-300",
                          isParchment 
                            ? "bg-gradient-to-r from-transparent via-[#8c7456]/60 to-transparent" 
                            : "bg-gradient-to-r from-transparent via-zinc-800 to-transparent"
                        )}
                      />
                      <div 
                        className={cn(
                          "text-xs transition-colors duration-300",
                          isParchment ? "text-[#8c7456]" : "text-zinc-600"
                        )}
                      >
                        {isParchment ? "◆ ❖ ◆" : "❖"}
                      </div>
                      <div 
                        className={cn(
                          "h-[1px] flex-1 transition-all duration-300",
                          isParchment 
                            ? "bg-gradient-to-r from-transparent via-[#8c7456]/60 to-transparent" 
                            : "bg-gradient-to-r from-transparent via-zinc-800 to-transparent"
                        )}
                      />
                    </div>

                    <div className="space-y-4 max-w-md mx-auto">
                      {chapters.filter(ch => !ch.isToC).map((ch) => {
                        const chColors = getCategoryColor(ch.id)
                        return (
                          <button
                            key={ch.id}
                            onClick={() => { setBookChapter(chapters.indexOf(ch)); setBookPage(0) }}
                            className="flex w-full items-baseline gap-2 text-left group transition-colors py-1 cursor-pointer"
                          >
                            <span 
                              className={cn(
                                "text-sm font-bold shrink-0 transition-colors duration-300",
                                isParchment 
                                  ? "font-rpg-title text-[#8c7456] group-hover:text-[#4c321a]" 
                                  : "font-sans text-zinc-400 group-hover:text-zinc-200"
                              )}
                            >
                              제{(ch as any).chapterNum}장
                            </span>
                            <span 
                              className={cn(
                                "flex-1 border-b border-dotted pb-1 text-sm font-medium transition-colors duration-300",
                                isParchment 
                                  ? "border-[#8c7456]/60 text-[#5c3e21] group-hover:text-[#2b1a0e] font-rpg-body" 
                                  : "border-zinc-800 text-zinc-300 group-hover:text-zinc-100 font-sans"
                              )}
                            >
                              {ch.title}
                            </span>
                            <span 
                              className={cn(
                                "shrink-0 text-xs transition-colors duration-300",
                                isParchment 
                                  ? "font-rpg-body text-[#8c7456] group-hover:text-[#4c321a] italic" 
                                  : "font-sans text-zinc-500 group-hover:text-zinc-300"
                              )}
                            >
                              {ch.items.length}편
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <div 
                      className={cn(
                        "mt-12 pt-6 border-t text-center transition-colors duration-300",
                        isParchment ? "border-[#8c7456]/30" : "border-zinc-900"
                      )}
                    >
                      <div 
                        className={cn(
                          "text-xs font-medium transition-colors duration-300",
                          isParchment ? "text-[#8c7456] font-rpg-body italic" : "text-zinc-500 font-sans"
                        )}
                      >
                        게임 콘텐츠 {games.length}종 수록 · 총 {data?.items.length}편의 방대한 서사 수록
                      </div>
                    </div>
                  </div>
                ) : (
                  // 챕터 본문 페이지
                  <div>
                    <div 
                      className={cn(
                        "mb-1.5 text-xs font-bold text-center transition-all duration-300",
                        isParchment ? "font-rpg-title" : "font-sans"
                      )} 
                      style={{ color: colors?.hex || (isParchment ? "#8c7456" : "#6366f1") }}
                    >
                      제{(currentChapter as any).chapterNum}장
                    </div>
                    <h2 
                      className={cn(
                        "mb-2 text-2xl font-bold tracking-wide text-center transition-colors duration-300",
                        isParchment ? "font-rpg-title text-[#4c321a]" : "font-sans text-zinc-100"
                      )}
                    >
                      {currentChapter.title}
                    </h2>

                    {/* 장식적 디바이더 */}
                    <div className="flex items-center justify-center my-6 gap-3 select-none">
                      <div 
                        className={cn(
                          "h-[1px] flex-1 transition-all duration-300",
                          isParchment 
                            ? "bg-gradient-to-r from-transparent via-[#8c7456]/60 to-transparent" 
                            : "bg-gradient-to-r from-transparent via-zinc-800 to-transparent"
                        )}
                      />
                      <div 
                        className={cn(
                          "text-xs transition-colors duration-300",
                          isParchment ? "text-[#8c7456]" : "text-zinc-600"
                        )}
                      >
                        {isParchment ? "◆ ❖ ◆" : "❖"}
                      </div>
                      <div 
                        className={cn(
                          "h-[1px] flex-1 transition-all duration-300",
                          isParchment 
                            ? "bg-gradient-to-r from-transparent via-[#8c7456]/60 to-transparent" 
                            : "bg-gradient-to-r from-transparent via-zinc-800 to-transparent"
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      {pagedItems.map((item, idx) => {
                        const globalIdx = bookPage * ITEMS_PER_PAGE + idx + 1
                        return (
                          <a
                            key={item.link}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "group flex gap-4 rounded-xl p-4 transition-all duration-200 hover:scale-[1.01] cursor-pointer",
                              isParchment
                                ? "border border-[#8c7456]/30 bg-[#fbf9f4]/60 hover:border-[#8c7456] hover:bg-[#fbf9f4] hover:shadow-[0_4px_15px_rgba(140,116,86,0.12)]"
                                : "border border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60 hover:shadow-[0_4px_15px_rgba(0,0,0,0.3)]"
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold border transition-all duration-200",
                                isParchment
                                  ? "font-rpg-title border-[#8c7456]/40 bg-[#eadeb8]/30 text-[#8c7456] group-hover:bg-[#eadeb8]/50"
                                  : "font-sans border-zinc-800 bg-zinc-900 text-zinc-400 group-hover:bg-zinc-800/80 group-hover:text-zinc-200"
                              )}
                            >
                              {globalIdx}
                            </div>
                            <div className="flex-1">
                              <div 
                                className={cn(
                                  "text-sm font-semibold leading-snug transition-colors duration-200",
                                  isParchment 
                                    ? "text-[#4c321a] font-rpg-body group-hover:text-[#2b1a0e]" 
                                    : "text-zinc-200 font-sans group-hover:text-white"
                                )}
                              >
                                {item.title}
                              </div>
                              <div 
                                className={cn(
                                  "mt-2 flex items-center gap-3 text-[11px] transition-colors duration-200",
                                  isParchment ? "text-[#8c7456] font-rpg-body italic" : "text-zinc-500 font-sans"
                                )}
                              >
                                <span>{formatDate(item.pubDate)}</span>
                                {item.games && item.games.length > 0 && (
                                  <span className="flex items-center gap-1 text-fuchsia-600 font-medium">
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
              <div 
                className={cn(
                  "flex items-center justify-between border-t px-8 py-4 transition-colors duration-300",
                  isParchment ? "border-[#8c7456]/30" : "border-zinc-800"
                )}
              >
                <button
                  onClick={goPrev}
                  disabled={isFirst}
                  className={cn(
                    "flex items-center gap-1.5 border text-[11px] rounded-lg px-3 py-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none",
                    isParchment
                      ? "border-[#8c7456]/40 bg-[#eadeb8]/30 hover:bg-[#eadeb8]/60 text-[#5c3e21] font-rpg-title font-bold hover:shadow-[0_2px_8px_rgba(140,116,86,0.1)]"
                      : "border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-sans font-medium hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                  )}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  이전 쪽
                </button>
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setBookPage(i)}
                      className={cn(
                        "transition-all cursor-pointer",
                        isParchment
                          ? "w-2.5 h-2.5 rotate-45"
                          : "w-2 h-2 rounded-full",
                        i === bookPage
                          ? (isParchment ? "bg-[#8c7456] scale-125" : "bg-zinc-200 scale-125 shadow-sm")
                          : (isParchment ? "bg-[#8c7456]/30 hover:bg-[#8c7456]/60" : "bg-zinc-700 hover:bg-zinc-500")
                      )}
                    />
                  ))}
                </div>
                <button
                  onClick={goNext}
                  disabled={isLast}
                  className={cn(
                    "flex items-center gap-1.5 border text-[11px] rounded-lg px-3 py-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none",
                    isParchment
                      ? "border-[#8c7456]/40 bg-[#eadeb8]/30 hover:bg-[#eadeb8]/60 text-[#5c3e21] font-rpg-title font-bold hover:shadow-[0_2px_8px_rgba(140,116,86,0.1)]"
                      : "border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-sans font-medium hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                  )}
                >
                  다음 쪽
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 로그라이크 던전 크롤러 뷰 */}
      {viewMode === "dungeon" && (() => {
        const floorName = dungeonFloors[dungeonFloor] || "기타";
        const currentItem = currentFloorItems[dungeonRoom];
        
        return (
          <div className="relative rounded-2xl border border-zinc-805 bg-[#0c0c10]/95 p-6 shadow-2xl text-zinc-100 font-sans min-h-[500px] flex flex-col md:flex-row gap-6 overflow-hidden">
            {/* 배경 성문 장식 그래픽 */}
            <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle_at_50%_120%,rgba(244,63,94,0.15),transparent_60%)]" />

            {/* 좌측 패널: 플레이어 스텟 및 물약 상점 */}
            <div className="w-full md:w-72 shrink-0 border border-zinc-800/80 bg-zinc-950/80 p-5 rounded-xl flex flex-col gap-4 relative z-10 shadow-lg">
              <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600/10 text-rose-500 border border-rose-500/20">
                  <Sword className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-100 text-sm">모험가 정보</h3>
                  <p className="text-[10px] text-zinc-400">Level {playerLevel} 전사</p>
                </div>
              </div>

              {/* 플레이어 HP Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-zinc-400 flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" /> HP</span>
                  <span className="text-rose-400">{playerHp} / {playerMaxHp}</span>
                </div>
                <div className="h-2.5 w-full bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-rose-600 to-rose-500 transition-all duration-305 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                    style={{ width: `${(playerHp / playerMaxHp) * 100}%` }}
                  />
                </div>
              </div>

              {/* 플레이어 XP Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-zinc-400 flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-indigo-400" /> XP</span>
                  <span className="text-indigo-400">{playerXp} / {playerLevel * 100}</span>
                </div>
                <div className="h-2.5 w-full bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-600 to-indigo-500 transition-all duration-305"
                    style={{ width: `${(playerXp / (playerLevel * 100)) * 100}%` }}
                  />
                </div>
              </div>

              {/* 보유 골드 & 포션 */}
              <div className="grid grid-cols-2 gap-3 py-2 border-y border-zinc-900 my-2">
                <div className="flex flex-col items-center p-2 rounded-lg bg-zinc-900/50 border border-zinc-900">
                  <Coins className="h-4 w-4 text-amber-400 mb-1" />
                  <span className="text-[10px] text-zinc-500 font-semibold">GOLD</span>
                  <span className="text-sm font-bold text-amber-400">{playerGold} G</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-zinc-900/50 border border-zinc-900">
                  <Heart className="h-4 w-4 text-emerald-400 mb-1 fill-emerald-400/20" />
                  <span className="text-[10px] text-zinc-500 font-semibold">🧪 POTIONS</span>
                  <span className="text-sm font-bold text-emerald-400">{playerPotions}개</span>
                </div>
              </div>

              {/* 상점 / 물약 복용 행동단 */}
              <div className="space-y-2 mt-auto pt-4">
                <Button 
                  onClick={usePotion}
                  disabled={playerPotions <= 0 || dungeonState === "start" || playerHp >= playerMaxHp}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/30 text-xs font-semibold py-4 h-9 cursor-pointer"
                >
                  🧪 포션 마시기 (+50 HP)
                </Button>
                <Button 
                  onClick={buyPotion}
                  disabled={playerGold < 30 || dungeonState === "start" || dungeonState === "gameover" || dungeonState === "win"}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-400 text-xs font-semibold py-4 h-9 cursor-pointer"
                >
                  💰 포션 구매하기 (30 G)
                </Button>
              </div>
            </div>

            {/* 우측 패널: 메인 스테이지 및 배틀 단독 스크린 */}
            <div className="flex-1 border border-zinc-800/80 bg-zinc-950/50 rounded-xl p-6 flex flex-col relative z-10">
              
              {/* 상단 층수 정보 */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-900 mb-4 text-xs font-semibold">
                <span className="text-rose-400 tracking-wider flex items-center gap-1.5"><Sword className="h-3.5 w-3.5" /> 제 {dungeonFloor + 1} 층 던전</span>
                <span className="text-zinc-500 italic">구역: {floorName} ({dungeonRoom + 1} / {currentFloorItems.length} Rooms)</span>
              </div>

              {/* 게임 상태 분기 */}
              {dungeonState === "start" && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="h-16 w-16 bg-rose-600/10 text-rose-500 border border-rose-500/20 rounded-full flex items-center justify-center animate-bounce mb-4">
                    <Sword className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-100 mb-2">RSS 로그라이크 던전 크롤러</h2>
                  <p className="text-zinc-400 text-xs max-w-sm leading-relaxed mb-6">
                    블로그 카테고리가 층수가 되고, 글 제목들이 강력한 지식 몬스터가 되어 앞을 가로막습니다. 
                    퀴즈를 풀고 영토를 확장하며, 레벨업을 하여 대도사 서예린의 최종 던전 왕관을 점령해 보세요!
                  </p>
                  <Button 
                    onClick={startDungeon}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-8 py-5 h-11 text-sm shadow-[0_0_15px_rgba(244,63,94,0.4)] cursor-pointer"
                  >
                    ⚔️ 모험 시작하기 ⚔️
                  </Button>
                </div>
              )}

              {dungeonState === "explore" && currentItem && (
                <div className="flex-1 flex flex-col justify-between">
                  <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 text-center max-w-md mx-auto my-auto space-y-4">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-850 border border-zinc-700 text-rose-400">
                      <Shield className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xs text-rose-400 font-bold mb-1 tracking-wider">NEXT ROOM</h3>
                      <p className="text-sm font-bold text-zinc-100 leading-snug line-clamp-2 px-2">{currentItem.title}</p>
                    </div>
                    <p className="text-[11px] text-zinc-500 italic line-clamp-2 px-4 leading-relaxed">
                      {currentItem.games && currentItem.games.length > 0 
                        ? "⚠️ 위험 경고: 이 몬스터는 특수 게임 능력치를 장착하고 있습니다." 
                        : "이 방을 통과하기 위해 영어/상식 수호자 몬스터를 물리치십시오."}
                    </p>
                    <Button 
                      onClick={enterBattle}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-10 text-xs cursor-pointer shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                    >
                      🚪 방에 진입하기 (전투 개시)
                    </Button>
                  </div>
                </div>
              )}

              {dungeonState === "battle" && currentQuiz && (
                <div className="flex-1 flex flex-col gap-5 bg-zinc-950/65 border border-emerald-950/60 p-5 rounded-xl shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
                  {/* CRT Scanline mesh overlay for the entire MGS console */}
                  <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[size:100%_4px] opacity-20 z-20" />
                  
                  {/* MGS Codec Grid */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-emerald-900/20 pb-5 z-10 relative">
                    
                    {/* Left: Player Video Feed */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <div className="relative w-32 h-32 border-2 border-emerald-500/40 bg-zinc-950/80 rounded-lg overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                        {/* Scanline overlay */}
                        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px] opacity-40 z-10" />
                        <div className="absolute top-1 left-1 text-[7px] font-mono text-emerald-500/60">PL_WARRIOR</div>
                        <div className="absolute bottom-1 right-1 text-[7px] font-mono text-emerald-500/60">TRANS_ON</div>
                        
                        {/* Player icon/silhouette hued to monochrome green */}
                        <div 
                          className="w-full h-full flex items-center justify-center bg-zinc-900 transition-all duration-300"
                          style={{
                            filter: "grayscale(1) sepia(1) hue-rotate(90deg) saturate(3) brightness(0.8) contrast(1.2)"
                          }}
                        >
                          <Sword className="w-12 h-12 text-emerald-500 animate-pulse" />
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-emerald-500 font-bold tracking-widest">PLAYER</span>
                    </div>

                    {/* Middle: Frequency & Sound Visualizer */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 py-2">
                      <div className="text-center font-mono text-2xl md:text-3xl font-extrabold tracking-widest text-emerald-400 select-none drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
                        144.00 <span className="text-[10px] text-emerald-500/70 font-semibold">MHz</span>
                      </div>
                      
                      {/* Live MGS audio lane spikes */}
                      <div className="flex items-center gap-1 h-8">
                        {Array.from({ length: 14 }).map((_, i) => {
                          const heightVal = Math.floor(Math.random() * 24) + 6;
                          return (
                            <div 
                              key={i} 
                              className="w-1 bg-emerald-500/80 rounded-full transition-all duration-150 animate-pulse"
                              style={{ 
                                height: `${heightVal}px`,
                              }}
                            />
                          )
                        })}
                      </div>
                      
                      <div className="text-[8px] font-mono text-emerald-500/50 uppercase tracking-widest animate-pulse">
                        Codec Link Established
                      </div>
                    </div>

                    {/* Right: Teacher Yerin (Codec Contact) */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <div className="relative w-32 h-32 border-2 border-emerald-500/40 bg-zinc-950/80 rounded-lg overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)] group">
                        {/* Scanline overlay */}
                        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px] opacity-40 z-10" />
                        <div className="absolute top-1 left-1 text-[7px] font-mono text-emerald-500/60">CONTACT_FEED</div>
                        <div className="absolute bottom-1 right-1 text-[7px] font-mono text-emerald-500/60">{monsterHp > 0 ? "LINK_ACTIVE" : "LINK_FAIL"}</div>
                        
                        {/* Yerin portrait hued to MGS Codec green CRT skin! */}
                        <img 
                          src={currentMonsterImg} 
                          alt="Teacher Yerin Codec Portrait" 
                          className={cn(
                            "w-full h-full object-contain transition-all duration-500",
                            monsterHp > 0
                              ? "group-hover:filter-none" // Hover reveals full color!
                              : "opacity-30 grayscale rotate-12 scale-90"
                          )}
                          style={monsterHp > 0 ? {
                            filter: "grayscale(1) sepia(1) hue-rotate(90deg) saturate(3) brightness(0.9) contrast(1.2)"
                          } : undefined}
                        />
                        {monsterHp === 0 && (
                          <div className="absolute inset-0 bg-red-950/40 flex items-center justify-center font-mono font-bold text-red-500 text-[8px] tracking-wider z-20">
                            CONNECTION LOST
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-emerald-500 font-bold tracking-widest max-w-[130px] truncate text-center">
                        YERIN_BOSS
                      </span>
                    </div>

                  </div>

                  {/* 몬스터 체력 현황판 (Codec HUD style) */}
                  <div className="p-3 rounded-lg border border-emerald-900/20 bg-emerald-950/5 flex flex-col gap-1.5 z-10 relative">
                    <div className="flex justify-between text-[10px] font-mono font-bold text-emerald-400">
                      <span>📟 TARGET CONTEXT INTEGRITY</span>
                      <span>{monsterHp} / {monsterMaxHp} HP</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-950 border border-emerald-950/40 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                        style={{ width: `${(monsterHp / monsterMaxHp) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* 퀴즈 문제 스크린 (MGS Transmission Dialog) */}
                  <div className="p-5 rounded-lg border border-emerald-900/20 bg-zinc-950/90 flex-1 flex flex-col justify-center gap-4 z-10 relative">
                    <div className="text-center font-mono font-bold text-emerald-500 text-[9px] uppercase tracking-widest flex items-center justify-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Transmission Cipher Detected
                    </div>
                    <div className="text-center font-bold text-sm md:text-base text-emerald-100 leading-relaxed px-4 font-mono">
                      "{currentQuiz.question}"
                    </div>

                    {/* 4지선다 옵션 버튼 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      {currentQuiz.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAttack(idx)}
                          className="p-3 rounded-lg border border-emerald-950/30 bg-zinc-900/30 hover:bg-emerald-950/20 hover:border-emerald-500/50 text-emerald-200 text-xs font-semibold text-center transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99] font-mono"
                        >
                          <span className="text-[10px] text-emerald-500 font-bold border border-emerald-900/40 px-1.5 py-0.5 rounded bg-zinc-950 mr-2">{idx + 1}</span>
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {dungeonState === "gameover" && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="h-16 w-16 bg-zinc-900 border border-zinc-850 rounded-full flex items-center justify-center mb-4 text-zinc-500 text-2xl">
                    💀
                  </div>
                  <h2 className="text-xl font-bold text-red-500 mb-2">당신은 쓰러졌습니다!</h2>
                  <p className="text-zinc-400 text-xs max-w-sm mb-6 leading-relaxed">
                    마지막 구역인 [제 {dungeonFloor + 1}층: {floorName}] 방을 돌파하는 도중 체력이 소진되어 쓰러지셨습니다. 
                    골드로 포션을 적절히 확보하여 재도전하세요!
                  </p>
                  <Button 
                    onClick={startDungeon}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-8 py-5 h-11 text-sm shadow-[0_0_15px_rgba(244,63,94,0.4)] cursor-pointer"
                  >
                    ⚔️ 처음부터 재도전
                  </Button>
                </div>
              )}

              {dungeonState === "win" && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="h-16 w-16 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full flex items-center justify-center animate-bounce mb-4">
                    <Trophy className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-bold text-amber-400 mb-2">🎉 축하합니다! 던전 완전 정복! 🎉</h2>
                  <p className="text-zinc-400 text-xs max-w-sm mb-6 leading-relaxed">
                    모든 카테고리 층수를 정복하고 블로그의 최종 수호자 서예린 선생님을 격파하여 '은밀한 학습의 정복자' 왕관을 획득하셨습니다!
                  </p>
                  <Button 
                    onClick={startDungeon}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 py-5 h-11 text-sm shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
                  >
                    ⚔️ 영광스러운 모험 재시작
                  </Button>
                </div>
              )}

              {/* 하단 배틀 로그 터미널 */}
              {dungeonState !== "start" && (
                <div className="mt-4 pt-3 border-t border-zinc-900 flex flex-col gap-2">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-1.5"><List className="h-3 w-3" /> 모험 기록 (BATTLE LOGS)</div>
                  <div className="h-28 overflow-y-auto bg-zinc-950 border border-zinc-900 rounded-lg p-3 text-[11px] font-mono space-y-1 text-zinc-400 flex flex-col-reverse">
                    {battleLogs.slice().reverse().map((log, i) => (
                      <div key={i} className="leading-snug">
                        {log.startsWith("🎯") && <span className="text-emerald-400 font-semibold">{log}</span>}
                        {log.startsWith("❌") && <span className="text-rose-400 font-semibold">{log}</span>}
                        {log.startsWith("💥") && <span className="text-rose-500 font-semibold">{log}</span>}
                        {log.startsWith("🏆") && <span className="text-amber-400 font-bold">{log}</span>}
                        {log.startsWith("✨") && <span className="text-indigo-400 font-bold">{log}</span>}
                        {log.startsWith("😈") && <span className="text-orange-400">{log}</span>}
                        {!log.startsWith("🎯") && !log.startsWith("❌") && !log.startsWith("💥") && !log.startsWith("🏆") && !log.startsWith("✨") && !log.startsWith("😈") && <span>{log}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        );
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
