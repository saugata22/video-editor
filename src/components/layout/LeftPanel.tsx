import React from 'react'
import VideoUploader from '../video/VideoUploader'

const LeftPanel: React.FC = () => {
  return (
    <div className="left-panel">
      <h2 className="panel-title">Media</h2>
      <VideoUploader />
    </div>
  )
}

export default LeftPanel
