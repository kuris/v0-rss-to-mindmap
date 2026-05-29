import { NextResponse } from "next/server"

interface RSSItem {
  title: string
  link: string
  categories: string[]
  pubDate: string
  author: string
  description?: string
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

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&middot;/g, "·")
    .replace(/&hellip;/g, "…")
}

function parseXML(xml: string): ParsedRSS {
  const channelTitleMatch = xml.match(/<channel>[\s\S]*?<title>([^<]+)<\/title>/)
  const channelDescMatch = xml.match(/<channel>[\s\S]*?<description>([^<]+)<\/description>/)

  const channelTitle = channelTitleMatch ? decodeHtmlEntities(channelTitleMatch[1]) : ""
  const channelDescription = channelDescMatch ? decodeHtmlEntities(channelDescMatch[1]) : ""

  const items: RSSItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  // 게임 패턴 정의
  const gamePatterns = [
    { pattern: /핀볼|pinball/gi, name: "핀볼 게임", type: "아케이드" },
    { pattern: /테트리스|tetris/gi, name: "테트리스", type: "퍼즐" },
    { pattern: /플래시\s*카드|flash\s*card|flashcard/gi, name: "플래시 카드", type: "학습" },
    { pattern: /퀴즈|quiz/gi, name: "퀴즈", type: "학습" },
    { pattern: /스네이크|snake/gi, name: "스네이크", type: "아케이드" },
    { pattern: /슈팅|shooting|타겟/gi, name: "슈팅 게임", type: "액션" },
    { pattern: /미니\s*게임|mini\s*game/gi, name: "미니 게임", type: "기타" },
  ]

  const gamesMap = new Map<string, GameInfo>()

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemContent = match[1]

    const titleMatch = itemContent.match(/<title>([^<]+)<\/title>/)
    const linkMatch = itemContent.match(/<link>([^<]+)<\/link>/)
    const pubDateMatch = itemContent.match(/<pubDate>([^<]+)<\/pubDate>/)
    const authorMatch = itemContent.match(/<author>([^<]+)<\/author>/)
    const descMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/)

    const categories: string[] = []
    const categoryRegex = /<category>([^<]+)<\/category>/g
    let catMatch
    while ((catMatch = categoryRegex.exec(itemContent)) !== null) {
      const cat = decodeHtmlEntities(catMatch[1])
      if (!cat.startsWith("#") && cat.length < 30) {
        categories.push(cat)
      }
    }

    const title = titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : ""
    const link = linkMatch ? linkMatch[1] : ""
    const description = descMatch ? decodeHtmlEntities(descMatch[1]) : ""

    // 게임 탐지
    const detectedGames: string[] = []
    const fullText = title + " " + description

    for (const { pattern, name, type } of gamePatterns) {
      if (pattern.test(fullText)) {
        detectedGames.push(name)
        if (!gamesMap.has(name)) {
          gamesMap.set(name, { name, type, articles: [] })
        }
        gamesMap.get(name)!.articles.push({ title, link })
      }
    }

    if (titleMatch) {
      items.push({
        title,
        link,
        categories: categories.length > 0 ? categories : ["기타"],
        pubDate: pubDateMatch ? pubDateMatch[1] : "",
        author: authorMatch ? decodeHtmlEntities(authorMatch[1]) : "",
        games: detectedGames.length > 0 ? detectedGames : undefined,
      })
    }
  }

  return {
    channelTitle,
    channelDescription,
    items,
    games: Array.from(gamesMap.values()),
  }
}

export async function GET() {
  try {
    const response = await fetch("https://chatgpts.kr/rss", {
      next: { revalidate: 300 }, // 5분 캐시
    })

    if (!response.ok) {
      throw new Error("Failed to fetch RSS feed")
    }

    const xml = await response.text()
    const parsed = parseXML(xml)

    return NextResponse.json(parsed)
  } catch (error) {
    console.error("RSS fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch RSS" }, { status: 500 })
  }
}
