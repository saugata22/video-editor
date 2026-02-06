import React, { useState } from 'react'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  onExport: (settings: ExportSettings) => void
  videoDuration: number
}

export interface ExportSettings {
  format: 'webm' | 'mp4'
  quality: 'high' | 'medium' | 'low'
  fps: number
  includeAudio: boolean
}

const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, onExport, videoDuration }) => {
  const [format, setFormat] = useState<'webm' | 'mp4'>('webm')
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high')
  const [fps, setFps] = useState(30)
  const [includeAudio, setIncludeAudio] = useState(true)

  if (!isOpen) return null

  const handleExport = () => {
    onExport({ format, quality, fps, includeAudio })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export Video</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="export-settings">
            <div className="setting-group">
              <label>Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value as 'webm' | 'mp4')}>
                <option value="webm">WebM (faster)</option>
                <option value="mp4">MP4 (better compatibility)</option>
              </select>
              {format === 'mp4' && (
                <p style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 4 }}>
                  MP4 export uses FFmpeg.wasm for conversion (may take longer)
                </p>
              )}
            </div>

            <div className="setting-group">
              <label>Quality</label>
              <select value={quality} onChange={(e) => setQuality(e.target.value as 'high' | 'medium' | 'low')}>
                <option value="high">High (8 Mbps)</option>
                <option value="medium">Medium (4 Mbps)</option>
                <option value="low">Low (2 Mbps)</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Frame Rate</label>
              <select value={fps} onChange={(e) => setFps(Number(e.target.value))}>
                <option value={24}>24 fps</option>
                <option value={30}>30 fps</option>
                <option value={60}>60 fps</option>
              </select>
            </div>

            <div className="setting-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeAudio}
                  onChange={(e) => setIncludeAudio(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span style={{ textTransform: 'none', fontSize: '13px', fontWeight: 500 }}>Include Audio</span>
              </label>
              {!includeAudio && (
                <p style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 4 }}>
                  Exported video will be silent
                </p>
              )}
            </div>

            <div className="export-info">
              <p>
                <span>Duration</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {videoDuration.toFixed(1)}s
                </span>
              </p>
              <p>
                <span>Frame Rate</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {fps} fps
                </span>
              </p>
              <p>
                <span>Bitrate</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {quality === 'high' ? '8' : quality === 'medium' ? '4' : '2'} Mbps
                </span>
              </p>
              <p>
                <span>Estimated Size</span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                  ~{((videoDuration * (quality === 'high' ? 8 : quality === 'medium' ? 4 : 2)) / 8).toFixed(1)} MB
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleExport}>Export</button>
        </div>
      </div>
    </div>
  )
}

export default ExportDialog
