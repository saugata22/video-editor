export interface Clip {
  id: string
  mediaId: string
  trackId: string
  startTime: number // Position on timeline (seconds)
  duration: number // Clip duration (seconds)
  trimStart: number // Trim from start of source video (seconds)
  trimEnd: number // Trim from end of source video (seconds)
  name: string
}

export interface Track {
  id: string
  name: string
  clips: Clip[]
  locked: boolean
  muted: boolean
}

export interface TimelineState {
  tracks: Track[]
  currentTime: number // Playhead position (seconds)
  duration: number // Total timeline duration (seconds)
  zoom: number // Pixels per second
  selectedClipId: string | null
}
