import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

export const useProgressStore = defineStore('progress', () => {
  // 로컬 스토리지에 자동 저장되는 상태값
  const solvedPuzzles = useLocalStorage('solvedPuzzles', [])
  const usedHints = useLocalStorage('usedHints', {}) // { puzzleId: [0, 1] } 형태

  // 정답 판정 함수 (타입 선언 제거됨)
  function checkAnswer(puzzleId, userAnswer, correctAnswer) {
    const normalize = (str) => String(str).trim().toLowerCase()

    let user = normalize(userAnswer)
    let correct = normalize(correctAnswer)

    // 1. 단순 텍스트나 완벽히 일치하는 경우 바로 정답 처리
    if (user === correct) {
      if (!solvedPuzzles.value.includes(puzzleId)) {
        solvedPuzzles.value.push(puzzleId)
      }
      return true
    }

    // 2. 멀티 숫자 매칭 로직 (예: "5, 6", "5 6", "5 또는 6")
    const userNumbers = user.match(/\d+/g)       // 예: "5 또는 6일" -> ["5", "6"]
    const correctNumbers = correct.match(/\d+/g) // 예: "5, 6" -> ["5", "6"]

    if (userNumbers && correctNumbers) {
      // 유저가 숫자를 반대로 적었을 수도 있으므로 정렬(sort) 후 합쳐서 비교합니다.
      const userStr = userNumbers.sort((a, b) => Number(a) - Number(b)).join(',')
      const correctStr = correctNumbers.sort((a, b) => Number(a) - Number(b)).join(',')

      if (userStr === correctStr) {
        if (!solvedPuzzles.value.includes(puzzleId)) {
          solvedPuzzles.value.push(puzzleId)
        }
        return true
      }
    }

    return false
  }

  // 힌트 사용 기록 함수
  function unlockHint(puzzleId, hintIndex) {
    if (!usedHints.value[puzzleId]) {
      usedHints.value[puzzleId] = []
    }
    usedHints.value[puzzleId].push(hintIndex)
  }

  return { solvedPuzzles, usedHints, checkAnswer, unlockHint }
})