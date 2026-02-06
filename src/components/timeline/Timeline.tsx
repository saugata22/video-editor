import React, { useRef } from 'react'
import { useStore } from '../../state/store'
import TimelineRuler from './TimelineRuler'
import Track from './Track'
import Playhead from './Playhead'
import '../../styles/timeline.css'

const Timeline: React.FC = () => {
  const { timeline, setTimelineZoom, addClipToTimeline, media } = useStore()
  const timelineRef = useRef<HTMLDivElement>(null)

  const handleAddToTimeline = () => {
    if (media.selectedId) {
      addClipToTimeline(media.selectedId)
    }
  }

  const handleZoomIn = () => {
    setTimelineZoom(timeline.zoom * 1.2)
  }

  const handleZoomOut = () => {
    setTimelineZoom(timeline.zoom / 1.2)
  }

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h2 className="panel-title">Timeline</h2>
        <div className="timeline-controls">
          <button onClick={handleAddToTimeline} disabled={!media.selectedId}>
            Add to Timeline
          </button>
          <div className="zoom-controls">
            <button onClick={handleZoomOut}>-</button>
            <span className="zoom-level">{Math.round(timeline.zoom)}px/s</span>
            <button onClick={handleZoomIn}>+</button>
          </div>
        </div>
      </div>

      <div className="timeline-content" ref={timelineRef}>
        <TimelineRuler zoom={timeline.zoom} duration={timeline.duration} />

        <div className="tracks-container">
          {timeline.tracks.map((track) => (
            <Track key={track.id} track={track} />
          ))}
        </div>

        <Playhead
          currentTime={timeline.currentTime}
          zoom={timeline.zoom}
          duration={timeline.duration}
        />
      </div>
    </div>
  )
}

export default Timeline
