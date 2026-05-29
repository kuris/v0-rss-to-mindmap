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

  // 게임 패턴 정의 - g 플래그를 제거하여 루프 내 lastIndex 누적 매칭 오류 원천 차단!
  const gamePatterns = [
    { pattern: /핀볼|pinball/i, name: "핀볼 게임", type: "아케이드" },
    { pattern: /테트리스|tetris/i, name: "테트리스", type: "퍼즐" },
    { pattern: /플래시\s*카드|flash\s*card|flashcard/i, name: "플래시 카드", type: "학습" },
    { pattern: /퀴즈|quiz|판독기/i, name: "퀴즈", type: "학습" },
    { pattern: /스네이크|snake/i, name: "스네이크", type: "아케이드" },
    { pattern: /슈팅|shooting/i, name: "슈팅 게임", type: "액션" },
    { pattern: /미니\s*게임|mini\s*game|광클|클릭\s*게임|토익\s*게임/i, name: "미니 게임", type: "기타" },
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

    // 게임 탐지 - 사이드바/푸터가 노이즈로 섞이는 것을 방지하기 위해 TITLE에 대해서만 탐지 수행!
    const detectedGames: string[] = []
    const fullText = title

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

function classifyCategory(title: string): string[] {
  const titleLower = title.toLowerCase();
  if (/영어|영작|회화|단어|표현|문법|zozigi|조지기|english|독해|어휘|발음|문장|번역|회화/i.test(titleLower)) {
    return ["오늘의 영어 ZOZIGI"];
  }
  if (/영화|드라마|넷플릭스|배우|감독|시즌|리뷰|무비|스포|작품|출연|스토리/i.test(titleLower)) {
    return ["영화 및 드라마"];
  }
  if (/부동산|재테크|돈|투자|경매|청약|주식|은행|통장|자산|금리|금융|소득|사기|세금|납부|연금|지원금|보험|매매|전세|월세|코인|계좌/i.test(titleLower)) {
    return ["재테크 및 부동산"];
  }
  if (/건강|운동|다이어트|헬스|식단|비타민|근육|치료|병원|증상|의학|영양|약물|의사|질환|질병/i.test(titleLower)) {
    return ["건강과 운동"];
  }
  if (/꿀팁|학습|공부|자료|방법|정리|가이드|매뉴얼|다운로드|사이트|추천|설치|해결|사용법|이스터에그|구글어스|퀴즈|테트리스|핀볼|스네이크|플래시카드/i.test(titleLower)) {
    return ["꿀팁 및 학습자료"];
  }
  if (/이슈|일상|소식|뉴스|생각|일기|오늘|사건|사고/i.test(titleLower)) {
    return ["오늘의 이슈 및 일상"];
  }
  return ["기타"];
}

async function fetchAndParseHTMLPage(page: number): Promise<{ id: string; title: string; link: string; pubDate: string }[]> {
  try {
    const res = await fetch(`https://chatgpts.kr/?page=${page}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const html = await res.text();
    
    const posts: { id: string; title: string; link: string; pubDate: string }[] = [];
    const postRegex = /<a href="\/(\d+)"[^>]*>[\s\S]*?<span class="title">([\s\S]*?)<\/span>[\s\S]*?<span class="date">([\s\S]*?)<\/span>/g;
    
    let match;
    while ((match = postRegex.exec(html)) !== null) {
      const id = match[1];
      const title = decodeHtmlEntities(match[2].trim());
      const pubDate = match[3].trim();
      posts.push({
        id,
        title,
        link: `https://chatgpts.kr/${id}`,
        pubDate,
      });
    }
    return posts;
  } catch (error) {
    console.error(`Error scraping page ${page}:`, error);
    return [];
  }
}

export async function GET() {
  try {
    // 1. Fetch and parse main RSS (up to 50 items)
    const rssResponse = await fetch("https://chatgpts.kr/rss", {
      next: { revalidate: 300 },
    })

    if (!rssResponse.ok) {
      throw new Error("Failed to fetch RSS feed")
    }

    const xml = await rssResponse.text()
    const parsed = parseXML(xml)

    // 2. Fetch pages 1 to 20 in parallel to grab all historic posts
    const pages = Array.from({ length: 20 }, (_, i) => i + 1)
    const htmlResults = await Promise.all(pages.map(fetchAndParseHTMLPage))
    const scrapedPosts = htmlResults.flat()

    // 3. De-duplicate and merge scraped posts with RSS items
    const existingLinks = new Set(parsed.items.map(item => item.link.toLowerCase()))
    const gamesMap = new Map<string, GameInfo>()
    
    // Initialize gamesMap with existing games from RSS to preserve their details
    parsed.games.forEach(g => {
      gamesMap.set(g.name, { ...g, articles: [...g.articles] })
    })

    // Game patterns for scraped posts - g 플래그를 제거하여 루프 내 lastIndex 누적 매칭 오류 원천 차단!
    const gamePatterns = [
      { pattern: /핀볼|pinball/i, name: "핀볼 게임", type: "아케이드" },
      { pattern: /테트리스|tetris/i, name: "테트리스", type: "퍼즐" },
      { pattern: /플래시\s*카드|flash\s*card|flashcard/i, name: "플래시 카드", type: "학습" },
      { pattern: /퀴즈|quiz|판독기/i, name: "퀴즈", type: "학습" },
      { pattern: /스네이크|snake/i, name: "스네이크", type: "아케이드" },
      { pattern: /슈팅|shooting/i, name: "슈팅 게임", type: "액션" },
      { pattern: /미니\s*게임|mini\s*game|광클|클릭\s*게임|토익\s*게임/i, name: "미니 게임", type: "기타" },
    ]

    const uniqueScraped = new Map<string, typeof scrapedPosts[0]>()
    scrapedPosts.forEach(post => {
      if (!uniqueScraped.has(post.id)) {
        uniqueScraped.set(post.id, post)
      }
    })

    for (const post of uniqueScraped.values()) {
      if (!existingLinks.has(post.link.toLowerCase())) {
        // Detect games on older post titles
        const detectedGames: string[] = []
        for (const { pattern, name, type } of gamePatterns) {
          if (pattern.test(post.title)) {
            detectedGames.push(name)
            if (!gamesMap.has(name)) {
              gamesMap.set(name, { name, type, articles: [] })
            }
            // Add if not already present in that game's articles
            if (!gamesMap.get(name)!.articles.some(art => art.link.toLowerCase() === post.link.toLowerCase())) {
              gamesMap.get(name)!.articles.push({ title: post.title, link: post.link })
            }
          }
        }

        // Add to main items list
        parsed.items.push({
          title: post.title,
          link: post.link,
          categories: classifyCategory(post.title),
          pubDate: post.pubDate,
          author: "서예린선생님",
          games: detectedGames.length > 0 ? detectedGames : undefined,
        })
      }
    }

    // Update parsed games list
    parsed.games = Array.from(gamesMap.values())

    return NextResponse.json(parsed)
  } catch (error) {
    console.error("RSS fetch and scrap error:", error)
    return NextResponse.json({ error: "Failed to fetch RSS data" }, { status: 500 })
  }
}

