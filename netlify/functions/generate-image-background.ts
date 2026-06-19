import { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const handler: Handler = async (event) => {
  try {
    const { puzzleId, prompt } = JSON.parse(event.body || '{}')

    // 1. AI 그림 그리기 (시간제한 10초 무시하고 여유롭게 진행!)
    const imageResponse = await openai.images.generate({
      model: "gpt-image-2",
      prompt: prompt,
      n: 1,
      size: "1024x1024"
    });
    const imageUrl = imageResponse.data[0].url;

    // 2. 그려진 그림 주소를 공용 저장소에 업데이트
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

    return { statusCode: 200, body: "Success" }
  } catch (error) {
    console.error("백그라운드 이미지 생성 에러:", error)
    return { statusCode: 500, body: "Error" }
  }
}