import { create } from 'zustand'
import { MediaItem, VideoState } from '../types/video.types'
import { TimelineState, Track, Clip } from '../types/timeline.types'

interface AppState {
  // Media
  media: {
    items: MediaItem[]
    selectedId: string | null
  }
  addMediaItem: (item: MediaItem) => void
  selectMedia: (id: string) => void
  removeMediaItem: (id: string) => void
  clearMedia: () => void

  // Video playback
  video: VideoState
  setCurrentTime: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void

  // Timeline
  timeline: TimelineState
  addClipToTimeline: (mediaId: string) => void
  removeClip: (clipId: string) => void
  updateClip: (clipId: string, updates: Partial<Clip>) => void
  selectClip: (clipId: string | null) => void
  setTimelineCurrentTime: (time: number) => void
  setTimelineZoom: (zoom: number) => void
  splitClip: (clipId: string, splitTime: number) => void
}

export const useStore = create<AppState>((set) => ({
  // Media state
  media: {
    items: [],
    selectedId: null,
  },
  addMediaItem: (item) =>
    set((state) => ({
      media: {
        ...state.media,
        items: [...state.media.items, item],
        selectedId: item.id,
      },
    })),
  selectMedia: (id) =>
    set((state) => ({
      media: { ...state.media, selectedId: id },
    })),
  removeMediaItem: (id) =>
    set((state) => ({
      media: {
        items: state.media.items.filter((item) => item.id !== id),
        selectedId: state.media.selectedId === id ? null : state.media.selectedId,
      },
    })),
  clearMedia: () =>
    set(() => ({
      media: {
        items: [],
        selectedId: null,
      },
    })),

  // Video state
  video: {
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    volume: 1,
  },
  setCurrentTime: (time) =>
    set((state) => ({
      video: { ...state.video, currentTime: time },
    })),
  setIsPlaying: (playing) =>
    set((state) => ({
      video: { ...state.video, isPlaying: playing },
    })),
  setDuration: (duration) =>
    set((state) => ({
      video: { ...state.video, duration },
    })),
  setVolume: (volume) =>
    set((state) => ({
      video: { ...state.video, volume },
    })),

  // Timeline state
  timeline: {
    tracks: [
      {
        id: 'track-1',
        name: 'Video Track 1',
        clips: [],
        locked: false,
        muted: false,
      },
    ],
    currentTime: 0,
    duration: 0,
    zoom: 50, // 50 pixels per second
    selectedClipId: null,
  },

  addClipToTimeline: (mediaId) =>
    set((state) => {
      const media = state.media.items.find((item) => item.id === mediaId)
      if (!media) return state

      const newClip: Clip = {
        id: `clip-${Date.now()}`,
        mediaId,
        trackId: 'track-1',
        startTime: state.timeline.duration, // Add to end of timeline
        duration: media.duration,
        trimStart: 0,
        trimEnd: 0,
        name: media.name,
      }

      const updatedTracks = state.timeline.tracks.map((track) =>
        track.id === 'track-1'
          ? { ...track, clips: [...track.clips, newClip] }
          : track
      )

      return {
        timeline: {
          ...state.timeline,
          tracks: updatedTracks,
          duration: Math.max(
            state.timeline.duration,
            newClip.startTime + newClip.duration
          ),
        },
      }
    }),

  removeClip: (clipId) =>
    set((state) => {
      const updatedTracks = state.timeline.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((clip) => clip.id !== clipId),
      }))

      // Recalculate timeline duration
      let maxDuration = 0
      updatedTracks.forEach((track) => {
        track.clips.forEach((clip) => {
          const endTime = clip.startTime + clip.duration
          if (endTime > maxDuration) maxDuration = endTime
        })
      })

      return {
        timeline: {
          ...state.timeline,
          tracks: updatedTracks,
          duration: maxDuration,
          selectedClipId:
            state.timeline.selectedClipId === clipId
              ? null
              : state.timeline.selectedClipId,
        },
      }
    }),

  updateClip: (clipId, updates) =>
    set((state) => {
      const updatedTracks = state.timeline.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId ? { ...clip, ...updates } : clip
        ),
      }))

      // Recalculate timeline duration
      let maxDuration = 0
      updatedTracks.forEach((track) => {
        track.clips.forEach((clip) => {
          const endTime = clip.startTime + clip.duration
          if (endTime > maxDuration) maxDuration = endTime
        })
      })

      return {
        timeline: {
          ...state.timeline,
          tracks: updatedTracks,
          duration: maxDuration,
        },
      }
    }),

  selectClip: (clipId) =>
    set((state) => ({
      timeline: { ...state.timeline, selectedClipId: clipId },
    })),

  setTimelineCurrentTime: (time) =>
    set((state) => ({
      timeline: { ...state.timeline, currentTime: time },
    })),

  setTimelineZoom: (zoom) =>
    set((state) => ({
      timeline: { ...state.timeline, zoom: Math.max(20, Math.min(200, zoom)) },
    })),

  splitClip: (clipId, splitTime) =>
    set((state) => {
      const track = state.timeline.tracks.find((t) =>
        t.clips.some((c) => c.id === clipId)
      )
      if (!track) return state

      const clip = track.clips.find((c) => c.id === clipId)
      if (!clip) return state

      // Calculate split position relative to clip
      const relativeTime = splitTime - clip.startTime
      if (relativeTime <= 0 || relativeTime >= clip.duration) return state

      // Create two new clips
      const clip1: Clip = {
        ...clip,
        id: `clip-${Date.now()}-1`,
        duration: relativeTime,
        trimEnd: clip.trimEnd + (clip.duration - relativeTime),
      }

      const clip2: Clip = {
        ...clip,
        id: `clip-${Date.now()}-2`,
        startTime: clip.startTime + relativeTime,
        duration: clip.duration - relativeTime,
        trimStart: clip.trimStart + relativeTime,
      }

      const updatedTracks = state.timeline.tracks.map((t) =>
        t.id === track.id
          ? {
              ...t,
              clips: t.clips
                .filter((c) => c.id !== clipId)
                .concat([clip1, clip2])
                .sort((a, b) => a.startTime - b.startTime),
            }
          : t
      )

      return {
        timeline: {
          ...state.timeline,
          tracks: updatedTracks,
        },
      }
    }),
}))
