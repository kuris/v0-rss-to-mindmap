import { RSSMindMap } from "@/components/rss-mindmap"

export default function Page() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 lg:px-8 py-6">
      <div className="mx-auto w-full max-w-[1920px]">
        <RSSMindMap />
      </div>
    </main>
  )
}

