<script setup>
import { ref, onMounted } from 'vue'
import { puzzles as staticPuzzles } from '../data/puzzles'
import { useProgressStore } from '../stores/progress'
import { useRouter } from 'vue-router'

const store = useProgressStore()
const router = useRouter()

const allPuzzles = ref([...staticPuzzles])
const isLoading = ref(false)

const loadSharedPuzzles = async () => {
  try {
    const response = await fetch('/.netlify/functions/get-ai-puzzles')
    if (response.ok) {
      const aiPuzzles = await response.json()
      allPuzzles.value = [...staticPuzzles, ...aiPuzzles]
    }
  } catch (error) {
    console.error('AI 문제 저장소를 불러오지 못했습니다.', error)
  }
}

onMounted(() => {
  loadSharedPuzzles()
})

const generateAIPuzzle = async () => {
  isLoading.value = true
  try {
    const response = await fetch('/.netlify/functions/generate-puzzle', { method: 'POST' })
    if (!response.ok) throw new Error('서버 응답 오류')
    
    await loadSharedPuzzles()
    alert('AI가 전 세계 공용 저장소에 새로운 수수께끼를 등록했습니다!')
  } catch (error) {
    alert('문제를 생성하지 못했습니다.')
  } finally {
    isLoading.value = false
  }
}

const goToPuzzle = (id) => {
  router.push(`/puzzle/${id}`)
}
</script>

<template>
  <div class="puzzle-list">
    <h1>수수께끼 목록</h1>

    <div class="ai-section">
      <p>모든 유저가 함께 채워나가는 AI 수수께끼 저장소입니다.</p>
      <button class="ai-btn" @click="generateAIPuzzle" :disabled="isLoading">
        {{ isLoading ? 'AI가 집단 지성 발휘 중... ⏳' : '⚡ AI 실시간 공용 수수께끼 생성' }}
      </button>
    </div>

    <hr />

    <div 
      v-for="puzzle in allPuzzles" 
      :key="puzzle.id" 
      class="puzzle-item"
      @click="goToPuzzle(puzzle.id)"
    >
      <span>
        <span v-if="puzzle.id >= 11" class="ai-badge">AI</span>
        {{ puzzle.id }}번: {{ puzzle.title }}
      </span>
      <span v-if="store.solvedPuzzles.includes(puzzle.id)"> ⭕ 해결됨</span>
    </div>
  </div>
</template>

<style scoped>
.puzzle-item { border: 1px solid #ccc; padding: 15px; margin-bottom: 10px; cursor: pointer; border-radius: 8px; display: flex; justify-content: space-between; }
.puzzle-item:hover { background-color: #f5f5f5; }
.ai-section { background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
.ai-btn { background-color: #42b883; color: white; border: none; padding: 12px 20px; font-size: 16px; font-weight: bold; border-radius: 8px; cursor: pointer; transition: background-color 0.3s; }
.ai-btn:hover:not(:disabled) { background-color: #33a06f; }
.ai-btn:disabled { background-color: #ccc; cursor: not-allowed; }
.ai-badge { background-color: #42b883; color: white; font-size: 11px; padding: 2px 6px; border-radius: 4px; margin-right: 5px; vertical-align: middle; }
</style>