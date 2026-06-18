import { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs' // 내장 스토리지 로드
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    // 1. OpenAI 수수께끼 생성
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `너는 레이튼 교수 시리즈 스타일의 기발하고 함정이 있는 수수께끼를 만드는 AI이다. 
          반드시 한국어로 작성하고, 아래 지정된 JSON 포맷으로만 답변해라. 다른 설명은 절대 추가하지 마라.

          [중요 규칙]
          1. type이 "choice"(객관식)일 경우, "answer"의 값은 반드시 "options" 배열에 있는 문자열 중 하나와 토씨 하나 틀리지 않고 100% 일치해야 한다.
          2. 정답에 "정답은 ~입니다" 같은 불필요한 설명을 절대 붙이지 마라.
          
          JSON 포맷 예시:
          {
            "title": "문제 제목",
            "description": "수수께끼 본문 내용 (명확한 논리나 함정이 포함되어야 함)",
            "type": "text", // 주관식은 text, 객관식은 choice
            "options": ["보기1", "보기2", "보기3", "보기4"], // type이 choice일 때만 포함, text일 때는 빈 배열
            "hints": ["첫 번째 힌트", "두 번째 힌트"],
            "answer": "정답 텍스트 (type이 text면 핵심 단어나 숫자, choice면 보기 중 하나와 일치해야 함)",
            "rewardPoints": 20
          }` // 생략 (기존 프롬프트 유지)
        },
        { role: 'user', content: '새로운 수수께끼를 하나 생성해줘.' }
      ],
      response_format: { type: 'json_object' }
    })

    // --- [아래 코드로 교체] ---
    const rawContent = response.choices[0].message.content || '{}'
    // AI가 쓸데없이 ```json 이나 ``` 을 붙여서 보낼 경우를 대비해 텍스트를 청소
    const cleanContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim()
    const puzzleData = JSON.parse(cleanContent)

    // 💡 [새로 추가할 검문소 코드] AI 헛소리 방지: 객관식인데 정답이 보기에 없는 경우 강제 복구
    if (puzzleData.type === 'choice') {
      // options 배열이 아예 없으면 만들어줌
      if (!puzzleData.options || !Array.isArray(puzzleData.options)) {
        puzzleData.options = ["보기1", "보기2", "보기3", "보기4"]
      }
      
      // 정답이 보기에 포함되어 있지 않은 대참사 발생 시
      if (!puzzleData.options.includes(puzzleData.answer)) {
        // 보기 중 임의의 위치(마지막 위치)에 진짜 정답을 강제로 덮어씌웁니다.
        // 이렇게 하면 무조건 누를 수 있는 정답이 생깁니다.
        const randomIndex = Math.floor(Math.random() * puzzleData.options.length);
        puzzleData.options[randomIndex] = puzzleData.answer;
      }
    }
    
    // 2. Netlify Blobs에 저장 (모든 유저 공유용)
    const store = getStore({
  name: 'shared-puzzles',
  siteID: process.env.NETLIFY_SITE_ID,
  token: process.env.NETLIFY_API_TOKEN
})
    
    // 기존에 저장된 리스트 가져오기 (없으면 빈 배열)
    const rawList = await store.get('list')
    const currentList = rawList ? JSON.parse(rawList) : []
    
    // 새 문제에 고유 ID 부여 후 배열에 추가
    const nextId = currentList.length > 0 ? Math.max(...currentList.map((p: any) => p.id)) + 101 : 101 // AI 문제는 101번부터 시작하도록 세팅
    puzzleData.id = nextId
    currentList.push(puzzleData)
    
    // 다시 저장소에 업데이트
    await store.set('list', JSON.stringify(currentList))

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(puzzleData),
    }
  } catch (error) {
    console.error("AI 생성 중 서버 에러 발생:", error) // 에러 로그 기록
    return { statusCode: 500, body: JSON.stringify({ error: '실패' }) }
  }
}