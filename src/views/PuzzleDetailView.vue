<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { puzzles } from '../data/puzzles'
import { useProgressStore } from '../stores/progress'

const route = useRoute()
const store = useProgressStore()

const puzzleId = Number(route.params.id)
const puzzle = ref(puzzles.find(p => p.id === puzzleId))

onMounted(async () => {
  if (!puzzle.value && puzzleId >= 11) {
    try {
      const response = await fetch('/.netlify/functions/get-ai-puzzles')
      if (response.ok) {
        const aiPuzzles = await response.json()
        puzzle.value = aiPuzzles.find(p => p.id === puzzleId)
      }
    } catch (error) {
      console.error('AI 문제를 불러오지 못했습니다.', error)
    }
  }
})

const userAnswer = ref('')
const feedbackMessage = ref('')

const revealedHints = computed(() => store.usedHints[puzzleId] || [])
const showHint = (index) => {
  store.unlockHint(puzzleId, index)
}

const submitAnswer = () => {
  if (!userAnswer.value) {
    feedbackMessage.value = '정답을 선택하거나 입력해주세요.'
    return
  }
  const isCorrect = store.checkAnswer(puzzleId, userAnswer.value, puzzle.value.answer)
  feedbackMessage.value = isCorrect ? '정답입니다! 🎉' : '틀렸습니다. 다시 생각해보세요. 🤔'
}

const forceCorrect = () => {
  if (!store.solvedPuzzles.includes(puzzleId)) {
    store.solvedPuzzles.push(puzzleId)
  }
  feedbackMessage.value = '강제로 통과했습니다! (AI의 억지 문제 스킵 🚀)'
}
</script>

<template>
  <div v-if="puzzle" class="puzzle-detail">
    <h2>{{ puzzle.id }}번: {{ puzzle.title }}</h2>
    <p class="description">{{ puzzle.description }}</p>

    <div class="hints">
      <div v-for="(hint, index) in puzzle.hints" :key="index">
        <button v-if="!revealedHints.includes(index)" @click="showHint(index)">
          힌트 {{ index + 1 }} 보기
        </button>
        <p v-else class="revealed-hint">💡 힌트 {{ index + 1 }}: {{ hint }}</p>
      </div>
    </div>

    <hr />

    <div v-if="puzzle.type === 'choice'" class="input-area choice-area">
      <div v-for="(option, index) in puzzle.options" :key="index">
        <label>
          <input type="radio" :value="option" v-model="userAnswer" />
          {{ option }}
        </label>
      </div>
    </div>

    <div v-if="puzzle.type === 'text'" class="input-area text-area">
      <input 
        type="text" 
        v-model="userAnswer" 
        placeholder="정답을 입력하세요 (예: 5, 6)" 
        @keyup.enter="submitAnswer"
      />
      <p class="input-guide">
        * 정답이 여러 개인 경우 쉼표(,)나 띄어쓰기로 구분하여 입력해 주세요. (예: 5, 6 또는 5 6)
      </p>
    </div>
    
    <div class="action-buttons">
      <button class="submit-btn" @click="submitAnswer">정답 제출</button>
      <button 
        v-if="puzzle.id >= 11" 
        class="skip-btn" 
        @click="forceCorrect"
      >
        🤖 AI 오류 강제 패스
      </button>
    </div>
      
    <p class="feedback">{{ feedbackMessage }}</p>

    <router-link :to="route.query.from === 'map' ? '/map' : '/'" class="back-link">목록으로 돌아가기</router-link>
  </div>
  
  <div v-else>
    <p>존재하지 않는 수수께끼입니다.</p>
    <router-link :to="route.query.from === 'map' ? '/map' : '/'" class="back-link">목록으로 돌아가기</router-link>
  </div>
</template>

<style scoped>
.text-area input { width: 100%; padding: 12px; font-size: 16px; border: 2px solid #ccc; border-radius: 6px; box-sizing: border-box; }
.text-area input:focus { border-color: #42b883; outline: none; }
.input-guide { font-size: 13px; color: #666; margin-top: 8px; text-align: left; }
.action-buttons { display: flex; gap: 10px; margin-top: 15px; margin-bottom: 15px; }
.skip-btn { background-color: #ff6b6b; color: white; border: none; padding: 12px 20px; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer; }
.skip-btn:hover { background-color: #e55050; }
.back-link { display: inline-block; margin-top: 10px; color: #42b883; font-weight: bold; text-decoration: none; }
.back-link:hover { text-decoration: underline; }
</style>