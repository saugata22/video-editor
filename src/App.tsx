import React, { useState, useRef } from 'react'
import TopBar from './components/layout/TopBar'
import LeftPanel from './components/layout/LeftPanel'
import RightPanel from './components/layout/RightPanel'
import ExportDialog, { ExportSettings } from './components/export/ExportDialog'
import { useStore } from './state/store'
import WebGLVideoPreview from './components/video/WebGLVideoPreview'
import { availableEffects } from './effects/effectRegistry'
import { exportVideo, downloadBlob, ExportProgress } from './utils/videoExport'
import { convertWebMToMP4 } from './utils/ffmpegConverter'
import './styles/layout.css'
import './styles/effects.css'
import './styles/export.css'

export type AspectRatio = 'original' | '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '21:9'

const aspectRatioValues: Record<AspectRatio, number | null> = {
  'original': null, // Will use video's native aspect ratio
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '1:1': 1,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  '21:9': 21 / 9,
}

const App: React.FC = () => {
  const { media, video, setCurrentTime, setIsPlaying, setDuration } = useStore()
  const [appliedEffects, setAppliedEffects] = useState<Array<{
    id: string
    effectId: string
    name: string
    parameters: Record<string, any>
  }>>([])
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('original')
  const videoPreviewRef = useRef<{ getVideoElement: () => HTMLVideoElement | null; getCanvas: () => HTMLCanvasElement | null }>(null)

  const selectedMedia = media.items.find((item) => item.id === media.selectedId)

  const handleApplyEffect = (effectId: string) => {
    const effectDef = availableEffects.find((e) => e.id === effectId)
    if (!effectDef) return

    const newEffect = {
      id: `effect-${Date.now()}`,
      effectId,
      name: effectDef.name,
      parameters: effectDef.parameters.reduce((acc, param) => {
        acc[param.name] = param.defaultValue
        acc['enabled'] = true
        return acc
      }, {} as Record<string, any>),
    }

    setAppliedEffects([...appliedEffects, newEffect])
  }

  const handleRemoveEffect = (id: string) => {
    setAppliedEffects(appliedEffects.filter((e) => e.id !== id))
  }

  const handleUpdateParameter = (effectInstanceId: string, paramName: string, value: number) => {
    setAppliedEffects(appliedEffects.map((e) =>
      e.id === effectInstanceId
        ? { ...e, parameters: { ...e.parameters, [paramName]: value } }
        : e
    ))
  }

  const handleToggleEffect = (effectInstanceId: string) => {
    setAppliedEffects(appliedEffects.map((e) =>
      e.id === effectInstanceId
        ? { ...e, parameters: { ...e.parameters, enabled: !e.parameters['enabled'] } }
        : e
    ))
  }

  const togglePlay = () => {
    setIsPlaying(!video.isPlaying)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleExportRequest = () => {
    if (!selectedMedia) {
      alert('Please select a video first')
      return
    }
    setIsExportDialogOpen(true)
  }

  const handleExport = async (settings: ExportSettings) => {
    setIsExportDialogOpen(false)

    const videoElement = videoPreviewRef.current?.getVideoElement()
    const canvas = videoPreviewRef.current?.getCanvas()

    if (!videoElement || !canvas) {
      alert('Unable to access video or canvas for export')
      return
    }

    try {
      setExportProgress({ stage: 'preparing', progress: 0, message: 'Starting export...' })

      // First, record to WebM (fastest, native browser support)
      const webmBlob = await exportVideo(
        videoElement,
        canvas,
        video.duration,
        {
          quality: settings.quality,
          fps: settings.fps,
          format: 'webm', // Always record as WebM first
          includeAudio: settings.includeAudio,
        },
        setExportProgress
      )

      let finalBlob = webmBlob
      let extension = 'webm'

      // Convert to MP4 if requested
      if (settings.format === 'mp4') {
        setExportProgress({ stage: 'processing', progress: 85, message: 'Loading FFmpeg.wasm...' })

        try {
          console.log('Starting MP4 conversion...')
          finalBlob = await convertWebMToMP4(webmBlob, (progress) => {
            // Map FFmpeg progress (0-100) to our progress range (85-95)
            const mappedProgress = 85 + (progress * 0.10)
            setExportProgress({
              stage: 'processing',
              progress: mappedProgress,
              message: `Converting to MP4: ${progress.toFixed(0)}%`
            })
          })
          extension = 'mp4'
          console.log('✓ MP4 conversion successful')
        } catch (error) {
          console.error('MP4 conversion failed:', error)
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'

          const useWebM = confirm(
            `MP4 conversion failed: ${errorMsg}\n\n` +
            'Would you like to download as WebM instead?\n\n' +
            '(WebM is faster and works in most modern browsers)'
          )

          if (useWebM) {
            finalBlob = webmBlob
            extension = 'webm'
            console.log('Falling back to WebM export')
          } else {
            throw new Error('Export cancelled by user')
          }
        }
      }

      const filename = `video-${Date.now()}.${extension}`
      downloadBlob(finalBlob, filename)

      setExportProgress({ stage: 'complete', progress: 100, message: 'Export complete!' })
      setTimeout(() => setExportProgress(null), 2000)
    } catch (error) {
      console.error('Export failed:', error)
      alert(`Export failed: ${error}`)
      setExportProgress(null)
    }
  }

  return (
    <div className="app">
      <TopBar onExportRequest={handleExportRequest} />
      <div className="main-layout" style={{ flex: 1 }}>
        <LeftPanel />

        {/* Center Panel - Video Preview */}
        <div className="center-panel">
          {!selectedMedia ? (
            <div className="video-preview empty">
              <div className="empty-state">
                <p>No video selected</p>
                <p className="hint">Upload a video from the left panel to get started</p>
              </div>
            </div>
          ) : (
            <div className="video-preview">
              {/* Aspect Ratio Controls */}
              <div className="aspect-ratio-controls">
                <label>Aspect Ratio:</label>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}>
                  <option value="original">Original</option>
                  <option value="16:9">16:9 (Landscape)</option>
                  <option value="9:16">9:16 (Portrait)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="4:3">4:3 (Classic)</option>
                  <option value="3:4">3:4 (Portrait Classic)</option>
                  <option value="21:9">21:9 (Ultrawide)</option>
                </select>
              </div>

              <div className="video-container">
                <WebGLVideoPreview
                  ref={videoPreviewRef}
                  videoSrc={selectedMedia.url}
                  appliedEffects={appliedEffects}
                  onTimeUpdate={setCurrentTime}
                  onDurationChange={setDuration}
                  isPlaying={video.isPlaying}
                  currentTime={video.currentTime}
                  aspectRatio={aspectRatio}
                  aspectRatioValue={aspectRatioValues[aspectRatio]}
                />
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
                  onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                  className="seek-bar"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Effects */}
        <RightPanel
          onApplyEffect={handleApplyEffect}
          appliedEffects={appliedEffects}
          onRemoveEffect={handleRemoveEffect}
          onUpdateParameter={handleUpdateParameter}
          onToggleEffect={handleToggleEffect}
        />
      </div>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        onExport={handleExport}
        videoDuration={video.duration}
      />

      {/* Export Progress */}
      {exportProgress && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 400 }}>
            <div className="export-progress">
              <h3>{exportProgress.message}</h3>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${exportProgress.progress}%` }} />
              </div>
              <div className="progress-text">{exportProgress.progress.toFixed(0)}%</div>

              {exportProgress.stage !== 'complete' && (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel the export?\n\nYour video and effects will be preserved.')) {
                      setExportProgress(null)
                      // Stop video playback if it's playing
                      const videoElement = videoPreviewRef.current?.getVideoElement()
                      if (videoElement) {
                        videoElement.pause()
                        videoElement.currentTime = 0
                      }
                      setIsPlaying(false)
                    }
                  }}
                  style={{ marginTop: '16px', width: '100%' }}
                >
                  Cancel Export
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
