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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aiPuzzles),
    }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: '불러오기 실패' }) }
  }
}