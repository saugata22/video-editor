export interface MediaItem {
  id: string
  name: string
  file: File
  duration: number
  width: number
  height: number
  fps: number
  thumbnail: string
  url: string
}

export interface VideoState {
  currentTime: number
  duration: number
  isPlaying: boolean
  volume: number
}
