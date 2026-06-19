import { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    const { puzzleId, prompt } = JSON.parse(event.body || '{}')

    // 💡 2026년 최신 공식 이미지 모델 'gpt-image-2' 적용!
    const imageResponse = await openai.images.generate({
      model: "gpt-image-2",
      prompt: prompt,
      n: 1,
      size: "1024x1024"
    });
    const imageUrl = imageResponse.data[0].url;

    // 2. 그려진 그림 주소를 공용 저장소 해당 문제에 업데이트하기
    const store = getStore({
      name: 'shared-puzzles-v2',
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_API_TOKEN
    })
    
    const rawList = await store.get('list')
    const currentList = rawList ? JSON.parse(rawList) : []

    const puzzleIndex = currentList.findIndex((p: any) => p.id === puzzleId)
    if (puzzleIndex !== -1) {
      currentList[puzzleIndex].imageUrl = imageUrl;
      await store.set('list', JSON.stringify(currentList))
    }

    return { statusCode: 200, body: JSON.stringify({ imageUrl }) }
  } catch (error) {
    console.error("이미지 생성 에러:", error)
    return { statusCode: 500, body: JSON.stringify({ error: '이미지 생성 실패' }) }
  }
}