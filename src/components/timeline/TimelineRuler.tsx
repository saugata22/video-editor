import React from 'react'

interface TimelineRulerProps {
  zoom: number
  duration: number
}

const TimelineRuler: React.FC<TimelineRulerProps> = ({ zoom, duration }) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate tick marks every second
  const ticks: number[] = []
  for (let i = 0; i <= Math.ceil(duration); i++) {
    ticks.push(i)
  }

  return (
    <div className="timeline-ruler">
      <div className="ruler-ticks" style={{ width: `${duration * zoom}px` }}>
        {ticks.map((time) => (
          <div
            key={time}
            className="ruler-tick"
            style={{ left: `${time * zoom}px` }}
          >
            {time % 5 === 0 && (
              <span className="ruler-label">{formatTime(time)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default TimelineRuler
