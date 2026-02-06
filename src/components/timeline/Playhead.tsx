import React, { useCallback } from 'react'
import { useStore } from '../../state/store'

interface PlayheadProps {
  currentTime: number
  zoom: number
  duration: number
}

const Playhead: React.FC<PlayheadProps> = ({ currentTime, zoom, duration }) => {
  const { setTimelineCurrentTime, setCurrentTime } = useStore()

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const timelineElement = document.querySelector('.timeline-content')
      if (!timelineElement) return

      const rect = timelineElement.getBoundingClientRect()
      const x = moveEvent.clientX - rect.left + timelineElement.scrollLeft
      const time = Math.max(0, Math.min(duration, x / zoom))

      setTimelineCurrentTime(time)
      setCurrentTime(time)
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      className="playhead"
      style={{ left: `${currentTime * zoom}px` }}
      onMouseDown={handleMouseDown}
    >
      <div className="playhead-handle" />
      <div className="playhead-line" />
    </div>
  )
}

export default Playhead
