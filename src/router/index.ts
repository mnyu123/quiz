import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import PuzzleListView from '../views/PuzzleListView.vue'
import PuzzleDetailView from '../views/PuzzleDetailView.vue'
import MapView from '../views/MapView.vue' // 💡 방금 만든 맵 추가

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'list',
    component: PuzzleListView
  },
  {
    path: '/map', // 💡 /map 주소로 가면 3D 월드가 열립니다.
    name: 'map',
    component: MapView
  },
  {
    path: '/puzzle/:id',
    name: 'puzzle',
    component: PuzzleDetailView,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router