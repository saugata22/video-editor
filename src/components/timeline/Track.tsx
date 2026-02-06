import React from 'react'
import { Track as TrackType } from '../../types/timeline.types'
import Clip from './Clip'

interface TrackProps {
  track: TrackType
}

const Track: React.FC<TrackProps> = ({ track }) => {
  return (
    <div className="track">
      <div className="track-header">
        <span className="track-name">{track.name}</span>
      </div>
      <div className="track-content">
        {track.clips.length === 0 ? (
          <div className="track-empty">Drop clips here</div>
        ) : (
          track.clips.map((clip) => <Clip key={clip.id} clip={clip} />)
        )}
      </div>
    </div>
  )
}

export default Track
