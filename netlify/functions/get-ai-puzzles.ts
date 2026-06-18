import { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const store = getStore({
      name: 'shared-puzzles',
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_API_TOKEN
    })
    
    const rawList = await store.get('list')
    const aiPuzzles = rawList ? JSON.parse(rawList) : []

    // 💡 [새로 추가된 필터링 로직] 과거에 생성된 불량 데이터 걸러내기
    const validPuzzles = aiPuzzles.filter((puzzle: any) => {
      if (puzzle.type === 'choice') {
        // 보기가 아예 없거나 배열이 아니면 탈락
        if (!puzzle.options || !Array.isArray(puzzle.options)) return false
        
        // 정답이 보기에 포함되어 있지 않으면(과거의 불량품) 탈락
        if (!puzzle.options.includes(puzzle.answer)) return false
      }
      return true // 텍스트(주관식) 문제나, 정상적인 객관식 문제는 통과!
    })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPuzzles), // 걸러진 깨끗한 문제들만 보냄
    }
  } catch (error) {
    console.error("AI 문제 불러오기 실패:", error)
    return { statusCode: 500, body: JSON.stringify({ error: '불러오기 실패' }) }
  }
}