import { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const store = getStore({
      name: 'shared-puzzles-v2',
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_API_TOKEN
    })
    
    const rawList = await store.get('list')
    const aiPuzzles = rawList ? JSON.parse(rawList) : []

    // 💡 [과거 데이터 자동 수리 로직] 버리지 않고 고쳐서 씁니다.
    const repairedPuzzles = aiPuzzles.map((puzzle: any) => {
      if (puzzle.type === 'choice') {
        if (!puzzle.options || !Array.isArray(puzzle.options)) {
          puzzle.options = ["보기1", "보기2", "보기3", "보기4"]
        }
        // 정답이 보기에 없으면, 보기 맨 마지막 칸을 진짜 정답으로 덮어씌워 수리!
        if (!puzzle.options.includes(puzzle.answer)) {
          puzzle.options[puzzle.options.length - 1] = puzzle.answer
        }
      }
      return puzzle
    })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(repairedPuzzles),
    }
  } catch (error) {
    console.error("AI 문제 불러오기 실패:", error)
    return { statusCode: 500, body: JSON.stringify({ error: '불러오기 실패' }) }
  }
}