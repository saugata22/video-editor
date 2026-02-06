import React, { useState, useCallback } from 'react'
import { useStore } from '../../state/store'
import { Clip as ClipType } from '../../types/timeline.types'

interface ClipProps {
  clip: ClipType
}

const Clip: React.FC<ClipProps> = ({ clip }) => {
  const { timeline, updateClip, selectClip, removeClip, splitClip, media } =
    useStore()
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState<'start' | 'end' | null>(null)

  const isSelected = timeline.selectedClipId === clip.id
  const mediaItem = media.items.find((item) => item.id === clip.mediaId)

  const handleClipClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    selectClip(clip.id)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeClip(clip.id)
  }

  const handleSplit = (e: React.MouseEvent) => {
    e.stopPropagation()
    const splitTime = clip.startTime + clip.duration / 2
    splitClip(clip.id, splitTime)
  }

  // Drag to move clip
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isResizing) return
      e.stopPropagation()

      setIsDragging(true)
      const startX = e.clientX
      const startTime = clip.startTime

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX
        const deltaTime = deltaX / timeline.zoom
        const newStartTime = Math.max(0, startTime + deltaTime)

        updateClip(clip.id, { startTime: newStartTime })
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [clip.id, clip.startTime, timeline.zoom, updateClip, isResizing]
  )

  // Resize handles
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, side: 'start' | 'end') => {
      e.stopPropagation()
      setIsResizing(side)

      const startX = e.clientX
      const startTime = clip.startTime
      const startDuration = clip.duration

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX
        const deltaTime = deltaX / timeline.zoom

        if (side === 'start') {
          const newStartTime = Math.max(0, startTime + deltaTime)
          const newDuration = startDuration - (newStartTime - startTime)
          if (newDuration > 0.1) {
            updateClip(clip.id, {
              startTime: newStartTime,
              duration: newDuration,
              trimStart: clip.trimStart + (newStartTime - startTime),
            })
          }
        } else {
          const newDuration = Math.max(0.1, startDuration + deltaTime)
          updateClip(clip.id, {
            duration: newDuration,
            trimEnd: Math.max(0, clip.trimEnd - deltaTime),
          })
        }
      }

      const handleMouseUp = () => {
        setIsResizing(null)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [clip, timeline.zoom, updateClip]
  )

  return (
    <div
      className={`clip ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${clip.startTime * timeline.zoom}px`,
        width: `${clip.duration * timeline.zoom}px`,
      }}
      onClick={handleClipClick}
      onMouseDown={handleMouseDown}
    >
      <div
        className="clip-resize-handle left"
        onMouseDown={(e) => handleResizeStart(e, 'start')}
      />

      <div className="clip-content">
        {mediaItem && (
          <img src={mediaItem.thumbnail} alt={clip.name} className="clip-thumbnail" />
        )}
        <span className="clip-name">{clip.name}</span>
      </div>

      {isSelected && (
        <div className="clip-actions">
          <button onClick={handleSplit} title="Split">
            ✂
          </button>
          <button onClick={handleDelete} title="Delete">
            🗑
          </button>
        </div>
      )}

      <div
        className="clip-resize-handle right"
        onMouseDown={(e) => handleResizeStart(e, 'end')}
      />
    </div>
  )
}

export default Clip
