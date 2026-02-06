import React from 'react'
import { useStore } from '../../state/store'

interface TopBarProps {
  onExportRequest: () => void
}

const TopBar: React.FC<TopBarProps> = ({ onExportRequest }) => {
  const { clearMedia } = useStore()

  const handleNew = () => {
    if (confirm('Start a new project? This will clear all media and effects.')) {
      clearMedia()
      window.location.reload()
    }
  }

  const handleOpen = () => {
    alert('Open Project: Coming soon!')
  }

  const handleSave = () => {
    alert('Save Project: Coming soon!')
  }

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <div className="app-logo">
          <div className="app-logo-icon">▶</div>
          <span className="app-logo-text">Video Editor</span>
        </div>
      </div>
      <div className="top-bar-actions">
        <button className="btn-ghost" onClick={handleNew}>New</button>
        <button className="btn-ghost" onClick={handleOpen}>Open</button>
        <button className="btn-ghost" onClick={handleSave}>Save</button>
        <button className="btn-primary" onClick={onExportRequest}>
          Export
        </button>
      </div>
    </div>
  )
}

export default TopBar
