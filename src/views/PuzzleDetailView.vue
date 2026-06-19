<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { puzzles as staticPuzzles } from '../data/puzzles'
import { useProgressStore } from '../stores/progress'

const route = useRoute()
const store = useProgressStore()

const puzzleId = Number(route.params.id)
const puzzle = ref(staticPuzzles.find(p => p.id === puzzleId))
const isFetching = ref(!puzzle.value && puzzleId >= 11)

onMounted(async () => {
  if (isFetching.value) {
    try {
      const response = await fetch('/.netlify/functions/get-ai-puzzles')
      if (response.ok) {
        const aiPuzzles = await response.json()
        puzzle.value = aiPuzzles.find(p => p.id === puzzleId)
      }
    } finally {
      isFetching.value = false
    }
  }
})

const userAnswer = ref('')
const feedbackMessage = ref('')

const submitAnswer = () => {
  if (!userAnswer.value) return
  const isCorrect = store.checkAnswer(puzzleId, userAnswer.value, puzzle.value.answer)
  feedbackMessage.value = isCorrect ? '정답입니다! 🎉' : '틀렸습니다. 다시 생각해보세요. 🤔'
}

const forceCorrect = () => {
  store.solvedPuzzles.push(puzzleId)
  feedbackMessage.value = 'AI 오류로 인해 통과 처리되었습니다. 🚀'
}

const isGeneratingImage = ref(false)
let pollInterval = null

const generateImage = async () => {
  if (!puzzle.value.image_prompt) return alert('이미지 프롬프트가 없습니다.')
  
  isGeneratingImage.value = true

  try {
    // 1. 백그라운드 함수에 "그림 그려줘!" 던지기 (1초 만에 통과됨, 504 에러 원천 차단)
    await fetch('/.netlify/functions/generate-image-background', {
      method: 'POST',
      body: JSON.stringify({ 
        puzzleId: puzzle.value.id, 
        prompt: puzzle.value.image_prompt 
      })
    })

    // 2. 3초마다 공용 저장소를 찔러서 그림이 완성됐는지 확인
    pollInterval = setInterval(async () => {
      const response = await fetch('/.netlify/functions/get-ai-puzzles')
      if (response.ok) {
        const aiPuzzles = await response.json()
        const updatedPuzzle = aiPuzzles.find(p => p.id === puzzleId)

        // 저장소에 드디어 그림 주소가 등록되었다면!
        if (updatedPuzzle && updatedPuzzle.imageUrl) {
          puzzle.value.imageUrl = updatedPuzzle.imageUrl
          clearInterval(pollInterval) // 반복 확인 종료
          isGeneratingImage.value = false
        }
      }
    }, 3000)

    // 3. 만약 서버가 혼잡해 40초가 넘어가면 무한 대기 방지
    setTimeout(() => {
      if (isGeneratingImage.value) {
        clearInterval(pollInterval)
        isGeneratingImage.value = false
        alert('그림을 그리는 데 시간이 조금 더 걸리고 있습니다. 나중에 다시 들어와 보세요!')
      }
    }, 40000)

  } catch (error) {
    alert('요청 실패')
    isGeneratingImage.value = false
  }
}
</script>

<template>
  <div v-if="isFetching" class="loading">수수께끼를 불러오는 중...</div>
  
  <div v-else-if="puzzle" class="puzzle-container">
    <div class="puzzle-card">
      <div class="card-header">
        <span class="puzzle-no">No. {{ String(puzzle.id).padStart(3, '0') }}</span>
        <h2 class="puzzle-title">{{ puzzle.title }}</h2>
      </div>

      <div v-if="puzzle.imageUrl" class="puzzle-image">
        <img :src="puzzle.imageUrl" alt="수수께끼 삽화" />
      </div>

      <div v-if="puzzle.imageUrl" class="puzzle-image">
        <img :src="puzzle.imageUrl" alt="수수께끼 삽화" />
      </div>

      <div v-else-if="puzzle.id >= 11 && !puzzle.imageUrl" class="puzzle-image-placeholder">
        <button @click="generateImage" :disabled="isGeneratingImage" class="generate-img-btn">
          {{ isGeneratingImage ? '🎨 DALL-E 3가 삽화를 그리는 중... (약 15초)' : '🖼️ AI 삽화 생성하기 (50원 소모)' }}
        </button>
      </div>

      <div class="puzzle-body">
        <p class="description">{{ puzzle.description }}</p>
      </div>

      <div class="input-section">
        <div v-if="puzzle.type === 'choice'" class="choice-grid">
          <button 
            v-for="opt in puzzle.options" 
            :key="opt"
            @click="userAnswer = opt; submitAnswer()"
            :class="{ active: userAnswer === opt }"
          >
            {{ opt }}
          </button>
        </div>

        <div v-else class="text-input-wrap">
          <input 
            type="text" 
            v-model="userAnswer" 
            placeholder="답을 입력하세요..."
            @keyup.enter="submitAnswer"
          />
          <button @click="submitAnswer">결정</button>
        </div>
      </div>

      <div class="feedback-msg" :class="{ 'is-correct': feedbackMessage.includes('정답') }">
        {{ feedbackMessage }}
      </div>

      <div class="actions">
        <button class="hint-btn">힌트 보기</button>
        <button v-if="puzzle.id >= 11" @click="forceCorrect" class="skip-btn">AI 패스</button>
        <router-link to="/" class="back-link">목록으로</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.puzzle-container {
  display: flex;
  justify-content: center;
  padding: 20px 10px;
}
.puzzle-card {
  background-color: #fdf5e6; /* 양피지 색상 */
  border: 4px solid #5d4037;
  border-radius: 15px;
  width: 100%;
  max-width: 500px;
  padding: 25px;
  box-shadow: 10px 10px 0px rgba(0,0,0,0.1);
}
.puzzle-no {
  font-family: 'serif';
  font-weight: bold;
  color: #8d6e63;
}
.puzzle-title {
  font-size: 22px;
  margin: 10px 0;
  border-bottom: 2px solid #5d4037;
  padding-bottom: 10px;
}
.puzzle-image {
  margin: 15px 0;
  border: 2px solid #5d4037;
  background: white;
  padding: 5px;
}
.puzzle-image img {
  width: 100%;
  height: auto;
  display: block;
}
.description {
  line-height: 1.6;
  font-size: 17px;
  margin-bottom: 25px;
}
.text-input-wrap {
  display: flex;
  gap: 10px;
}
.text-input-wrap input {
  flex: 1;
  padding: 12px;
  border: 2px solid #5d4037;
  border-radius: 8px;
  font-size: 16px;
}
.text-input-wrap button {
  background: #5d4037;
  color: white;
  border: none;
  padding: 0 20px;
  border-radius: 8px;
  cursor: pointer;
}
.puzzle-image-placeholder {
  text-align: center; margin: 15px 0; padding: 20px;
  border: 2px dashed #8d6e63; background-color: rgba(255,255,255,0.5);
}
.generate-img-btn {
  background-color: #8d6e63; color: white; border: none;
  padding: 10px 20px; font-size: 14px; border-radius: 6px; cursor: pointer;
}
.generate-img-btn:disabled { background-color: #ccc; cursor: wait; }
.feedback-msg {
  margin-top: 15px;
  height: 24px;
  font-weight: bold;
  color: #d32f2f;
}
.feedback-msg.is-correct { color: #388e3c; }
.actions {
  margin-top: 30px;
  display: flex;
  gap: 10px;
  justify-content: center;
}
.skip-btn { font-size: 12px; background: none; border: none; color: #999; cursor: pointer; text-decoration: underline; }
</style>