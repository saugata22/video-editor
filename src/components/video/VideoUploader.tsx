import React, { useCallback, useState } from 'react'
import { useStore } from '../../state/store'
import { MediaItem } from '../../types/video.types'

const VideoUploader: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false)
  const { addMediaItem, media } = useStore()

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('video/')) {
        alert('Please upload a video file')
        return
      }

      // Create object URL for the video
      const url = URL.createObjectURL(file)

      // Create a video element to extract metadata
      const video = document.createElement('video')
      video.preload = 'metadata'

      video.onloadedmetadata = () => {
        // Create a canvas to capture thumbnail
        const canvas = document.createElement('canvas')
        canvas.width = 160
        canvas.height = 90
        const ctx = canvas.getContext('2d')

        // Wait for video to seek to 1 second for thumbnail
        video.currentTime = 1
        video.onseeked = () => {
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const thumbnail = canvas.toDataURL()

            const mediaItem: MediaItem = {
              id: `${Date.now()}-${file.name}`,
              name: file.name,
              file,
              duration: video.duration,
              width: video.videoWidth,
              height: video.videoHeight,
              fps: 30, // Default FPS (hard to detect accurately)
              thumbnail,
              url,
            }

            addMediaItem(mediaItem)
          }
        }
      }

      video.src = url
    },
    [addMediaItem]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        handleFile(files[0])
      }
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFile(files[0])
      }
    },
    [handleFile]
  )

  return (
    <div className="video-uploader">
      <div
        className={`dropzone ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <p className="dropzone-text">Drag & drop video here</p>
        <p className="dropzone-subtext">or</p>
        <label htmlFor="file-input" className="file-input-label">
          Browse Files
        </label>
        <input
          id="file-input"
          type="file"
          accept="video/*"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
      </div>

      {media.items.length > 0 && (
        <div className="media-list">
          {media.items.map((item) => (
            <div
              key={item.id}
              className={`media-item ${media.selectedId === item.id ? 'selected' : ''}`}
              onClick={() => useStore.getState().selectMedia(item.id)}
            >
              <img src={item.thumbnail} alt={item.name} className="media-thumbnail" />
              <div className="media-info">
                <p className="media-name">{item.name}</p>
                <p className="media-duration">{Math.round(item.duration)}s</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default VideoUploader
