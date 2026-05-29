import { NextResponse } from "next/server"

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

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemContent = match[1]

    const titleMatch = itemContent.match(/<title>([^<]+)<\/title>/)
    const linkMatch = itemContent.match(/<link>([^<]+)<\/link>/)
    const pubDateMatch = itemContent.match(/<pubDate>([^<]+)<\/pubDate>/)
    const authorMatch = itemContent.match(/<author>([^<]+)<\/author>/)

    const categories: string[] = []
    const categoryRegex = /<category>([^<]+)<\/category>/g
    let catMatch
    while ((catMatch = categoryRegex.exec(itemContent)) !== null) {
      const cat = decodeHtmlEntities(catMatch[1])
      // 해시태그나 긴 키워드 목록은 제외
      if (!cat.startsWith("#") && cat.length < 30) {
        categories.push(cat)
      }
    }

    if (titleMatch) {
      items.push({
        title: decodeHtmlEntities(titleMatch[1]).trim(),
        link: linkMatch ? linkMatch[1] : "",
        categories: categories.length > 0 ? categories : ["기타"],
        pubDate: pubDateMatch ? pubDateMatch[1] : "",
        author: authorMatch ? decodeHtmlEntities(authorMatch[1]) : "",
      })
    }
  }

  return { channelTitle, channelDescription, items }
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
