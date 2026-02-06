import React, { useEffect, useRef } from 'react'
import { useStore } from '../../state/store'

const VideoPreview: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { media, video, setCurrentTime, setIsPlaying, setDuration, setTimelineCurrentTime } = useStore()

  const selectedMedia = media.items.find((item) => item.id === media.selectedId)

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement || !selectedMedia) return

    videoElement.src = selectedMedia.url

    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime)
      setTimelineCurrentTime(videoElement.currentTime)
    }

    const handlePlay = () => {
      setIsPlaying(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata)
    videoElement.addEventListener('timeupdate', handleTimeUpdate)
    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata)
      videoElement.removeEventListener('timeupdate', handleTimeUpdate)
      videoElement.removeEventListener('play', handlePlay)
      videoElement.removeEventListener('pause', handlePause)
    }
  }, [selectedMedia, setCurrentTime, setIsPlaying, setDuration, setTimelineCurrentTime])

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    if (video.isPlaying) {
      videoElement.play()
    } else {
      videoElement.pause()
    }
  }, [video.isPlaying])

  const togglePlay = () => {
    const videoElement = videoRef.current
    if (!videoElement) return

    if (video.isPlaying) {
      videoElement.pause()
    } else {
      videoElement.play()
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!selectedMedia) {
    return (
      <div className="video-preview empty">
        <div className="empty-state">
          <p>No video selected</p>
          <p className="hint">Upload a video from the left panel to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="video-preview">
      <div className="video-container">
        <video ref={videoRef} className="video-element" />
      </div>

      <div className="playback-controls">
        <button onClick={togglePlay} className="play-btn">
          {video.isPlaying ? '⏸' : '▶'}
        </button>

        <div className="time-display">
          <span>{formatTime(video.currentTime)}</span>
          <span> / </span>
          <span>{formatTime(video.duration)}</span>
        </div>

        <input
          type="range"
          min="0"
          max={video.duration || 0}
          value={video.currentTime}
          onChange={(e) => {
            const videoElement = videoRef.current
            if (videoElement) {
              videoElement.currentTime = parseFloat(e.target.value)
            }
          }}
          className="seek-bar"
        />
      </div>
    </div>
  )
}

export default VideoPreview
