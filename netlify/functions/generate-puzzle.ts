import { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `너는 레이튼 교수 시리즈 스타일의 수수께끼 작가이다. 한국어로 작성하고 JSON으로만 답해라.
          [중요 규칙]
          1. type이 "choice"일 경우, "answer"는 "options" 중 하나와 정확히 일치해야 함.
          
          JSON 포맷 예시:
          {
            "title": "제목", "description": "본문", "type": "choice", 
            "options": ["1", "2", "3", "4"], "hints": ["힌트1"], "answer": "1",
            "image_prompt": "Layton-style hand-drawn sketch, vintage puzzle book illustration, sepia tone, simple line art, white background"
          }
          *반드시 image_prompt에 수수께끼 상황을 묘사하는 DALL-E 3용 영어 프롬프트를 포함해라.`
        },
        { role: 'user', content: '기발한 수수께끼 하나 만들어줘.' }
      ],
      response_format: { type: 'json_object' }
    })

    const rawContent = completion.choices[0].message.content || '{}'
    const puzzleData = JSON.parse(rawContent.replace(/```json/g, '').replace(/```/g, '').trim())

    const store = getStore({
      name: 'shared-puzzles-v2',
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_API_TOKEN
    })

    const rawList = await store.get('list')
    const currentList = rawList ? JSON.parse(rawList) : []

    const nextId = currentList.length > 0 ? Math.max(...currentList.map((p: any) => p.id)) + 1 : 11;
    puzzleData.id = nextId;
    
    currentList.push(puzzleData);
    await store.set('list', JSON.stringify(currentList))

    return { statusCode: 200, body: JSON.stringify(puzzleData) }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: '생성 실패' }) }
  }
}