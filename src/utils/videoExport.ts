export interface ExportProgress {
  stage: 'preparing' | 'recording' | 'processing' | 'complete'
  progress: number
  message: string
}

export interface ExportOptions {
  quality: 'high' | 'medium' | 'low'
  fps: number
  format: 'webm' | 'mp4'
  includeAudio?: boolean
}

export async function exportVideo(
  videoElement: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  duration: number,
  options: ExportOptions,
  onProgress: (progress: ExportProgress) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      console.log('=== VIDEO EXPORT DIAGNOSTICS ===')
      console.log('1. Video Element State:')
      console.log('  - readyState:', videoElement.readyState, ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'][videoElement.readyState])
      console.log('  - networkState:', videoElement.networkState)
      console.log('  - paused:', videoElement.paused)
      console.log('  - muted:', videoElement.muted)
      console.log('  - volume:', videoElement.volume)
      console.log('  - currentSrc:', videoElement.currentSrc)
      console.log('  - crossOrigin:', videoElement.crossOrigin)
      console.log('  - duration:', videoElement.duration)

      // Calculate bitrate based on quality
      const bitrates = {
        high: 8000000,   // 8 Mbps for better quality
        medium: 4000000, // 4 Mbps
        low: 2000000,    // 2 Mbps
      }

      // Get original video dimensions
      const originalWidth = videoElement.videoWidth
      const originalHeight = videoElement.videoHeight

      console.log(`\n2. Export Settings:`)
      console.log(`  - Dimensions: ${originalWidth}x${originalHeight}`)
      console.log(`  - FPS: ${options.fps}`)
      console.log(`  - Quality: ${options.quality} (${bitrates[options.quality] / 1000000} Mbps)`)
      console.log(`  - Include Audio: ${options.includeAudio}`)
      console.log(`  - Duration: ${duration}s`)

      // Get canvas stream - this will capture at the canvas's current size
      const canvasStream = canvas.captureStream(options.fps)

      // Create combined stream for video + audio
      const combinedStream = new MediaStream()

      // Add video track from canvas
      const videoTrack = canvasStream.getVideoTracks()[0]
      if (videoTrack) {
        console.log('✓ Video track added from canvas')
        console.log(`  Video track settings:`, videoTrack.getSettings())
        combinedStream.addTrack(videoTrack)
      } else {
        throw new Error('Failed to get video track from canvas')
      }

      // Add audio track from original video (if requested)
      let audioAdded = false
      const includeAudio = options.includeAudio !== false // Default to true

      if (includeAudio) {
        console.log('\n3. Audio Capture Attempt:')
        console.log('  - includeAudio option:', includeAudio)

        // CRITICAL: Ensure video is unmuted and has volume
        const wasMuted = videoElement.muted
        const originalVolume = videoElement.volume
        videoElement.muted = false
        videoElement.volume = 1.0
        console.log(`  - Unmuted video (was ${wasMuted ? 'muted' : 'unmuted'})`)
        console.log(`  - Set volume to 1.0 (was ${originalVolume})`)

        // Check for captureStream support
        const hasCaptureStream = typeof (videoElement as any).captureStream === 'function'
        const hasMozCaptureStream = typeof (videoElement as any).mozCaptureStream === 'function'
        console.log('  - Browser support:')
        console.log('    • captureStream():', hasCaptureStream)
        console.log('    • mozCaptureStream():', hasMozCaptureStream)

        try {
          let videoStream: MediaStream | null = null

          // Method 1: Try captureStream() - Chrome, Edge
          if (hasCaptureStream) {
            console.log('  - Calling captureStream()...')
            videoStream = (videoElement as any).captureStream()
            console.log('    • Stream obtained:', !!videoStream)

            if (videoStream) {
              const videoTracks = videoStream.getVideoTracks()
              const audioTracks = videoStream.getAudioTracks()

              console.log('    • Video tracks:', videoTracks.length)
              console.log('    • Audio tracks:', audioTracks.length)

              if (audioTracks.length > 0) {
                const audioTrack = audioTracks[0]
                console.log('    • Audio track found!')
                console.log('      - ID:', audioTrack.id)
                console.log('      - Label:', audioTrack.label)
                console.log('      - Kind:', audioTrack.kind)
                console.log('      - Enabled:', audioTrack.enabled)
                console.log('      - Muted:', audioTrack.muted)
                console.log('      - ReadyState:', audioTrack.readyState)
                console.log('      - Settings:', JSON.stringify(audioTrack.getSettings()))

                // Enable the track just in case
                audioTrack.enabled = true

                combinedStream.addTrack(audioTrack)
                audioAdded = true
                console.log('    ✓ Audio track successfully added to combined stream')
              } else {
                console.warn('    ✗ No audio tracks in captureStream()')
                console.warn('      This usually means:')
                console.warn('      1. The video file has no audio track')
                console.warn('      2. CORS is blocking audio access')
                console.warn('      3. The video hasn\'t loaded audio yet')
              }
            }
          }
          // Method 2: Try mozCaptureStream() - Firefox
          else if (hasMozCaptureStream) {
            console.log('  - Calling mozCaptureStream() (Firefox)...')
            videoStream = (videoElement as any).mozCaptureStream()
            const audioTracks = videoStream?.getAudioTracks() || []
            console.log('    • Audio tracks found:', audioTracks.length)

            if (audioTracks.length > 0) {
              const audioTrack = audioTracks[0]
              console.log('    • Audio track details:', audioTrack.getSettings())
              audioTrack.enabled = true
              combinedStream.addTrack(audioTrack)
              audioAdded = true
              console.log('    ✓ Audio track added successfully (Firefox)')
            }
          } else {
            console.error('  ✗ Browser does not support captureStream() or mozCaptureStream()')
          }
        } catch (e) {
          console.error('  ✗ Exception during audio capture:')
          console.error('    Error:', e)
          console.error('    Name:', (e as Error).name)
          console.error('    Message:', (e as Error).message)
          console.error('    Stack:', (e as Error).stack)
        }

        if (!audioAdded) {
          console.error('\n⚠ WARNING: Audio capture FAILED')
          console.error('Diagnosis:')
          console.error('  1. Check if video file has audio: Open video in browser inspector')
          console.error('  2. Check CORS: Video must be from same origin or have CORS headers')
          console.error('  3. Check video state: Video should be loaded (readyState >= 2)')
          console.error('  4. Try different video file to rule out file-specific issues')

          const continueWithoutAudio = confirm(
            '⚠ Audio Capture Failed\n\n' +
            'The exported video will be SILENT.\n\n' +
            'Possible causes:\n' +
            '• Video file has no audio track\n' +
            '• CORS security restrictions\n' +
            '• Browser limitations\n\n' +
            'Continue export without audio?'
          )

          if (!continueWithoutAudio) {
            throw new Error('Export cancelled by user')
          }
        } else {
          console.log('  ✓ Audio capture successful!\n')
        }
      } else {
        console.log('\n3. Audio Capture: Skipped (disabled by user)\n')
      }

      // Set up mime type with audio codec if audio is present
      console.log('\n4. MediaRecorder Setup:')
      const mimeType = audioAdded ? 'video/webm;codecs=vp9,opus' : 'video/webm;codecs=vp9'
      console.log('  - Desired mimeType:', mimeType)
      console.log('  - mimeType supported:', MediaRecorder.isTypeSupported(mimeType))

      // Check all available codecs
      const codecsToTest = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
      ]
      console.log('  - Codec support:')
      codecsToTest.forEach(codec => {
        console.log(`    • ${codec}: ${MediaRecorder.isTypeSupported(codec)}`)
      })

      const finalMimeType = MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm'
      console.log('  - Final mimeType:', finalMimeType)

      // Verify stream tracks
      const streamTracks = combinedStream.getTracks()
      console.log('  - Combined stream tracks:', streamTracks.length)
      streamTracks.forEach((track, i) => {
        console.log(`    Track ${i}:`, {
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted
        })
      })

      // Create MediaRecorder
      const recorderOptions: MediaRecorderOptions = {
        mimeType: finalMimeType,
        videoBitsPerSecond: bitrates[options.quality],
      }

      if (audioAdded) {
        recorderOptions.audioBitsPerSecond = 128000
      }

      console.log('  - Recorder options:', recorderOptions)

      const mediaRecorder = new MediaRecorder(combinedStream, recorderOptions)
      console.log('  - MediaRecorder created')
      console.log('    • state:', mediaRecorder.state)
      console.log('    • mimeType:', mediaRecorder.mimeType)
      console.log('    • videoBitsPerSecond:', (mediaRecorder as any).videoBitsPerSecond)
      console.log('    • audioBitsPerSecond:', (mediaRecorder as any).audioBitsPerSecond)

      const chunks: Blob[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
          console.log(`Recorded chunk: ${(event.data.size / 1024).toFixed(2)} KB`)
        }
      }

      mediaRecorder.onstop = () => {
        console.log('Recording stopped, processing...')
        onProgress({ stage: 'processing', progress: 90, message: 'Finalizing video...' })

        const blob = new Blob(chunks, { type: 'video/webm' })
        console.log(`✓ Export complete! Final size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`)

        onProgress({ stage: 'complete', progress: 100, message: 'Export complete!' })
        resolve(blob)
      }

      mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder error:', error)
        reject(error)
      }

      // Start export process
      onProgress({ stage: 'preparing', progress: 0, message: 'Preparing export...' })

      // Reset video to start
      videoElement.currentTime = 0

      // Wait for video to be ready, then play
      videoElement.oncanplay = () => {
        videoElement.play().then(() => {
          console.log('Video playing, starting recording...')

          // Start recording after a short delay
          setTimeout(() => {
            mediaRecorder.start(100) // Capture in 100ms chunks
            console.log('Recording started')
            onProgress({ stage: 'recording', progress: 10, message: 'Recording...' })

            // Track progress
            const progressInterval = setInterval(() => {
              if (videoElement.currentTime < duration) {
                const progress = 10 + (videoElement.currentTime / duration) * 70
                onProgress({
                  stage: 'recording',
                  progress,
                  message: `Recording: ${videoElement.currentTime.toFixed(1)}s / ${duration.toFixed(1)}s`,
                })
              }
            }, 100)

            // Stop recording when video ends
            videoElement.onended = () => {
              console.log('Video ended, stopping recording')
              clearInterval(progressInterval)
              if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop()
              }
              videoElement.pause()
              videoElement.currentTime = 0
            }

            // Fallback timeout
            setTimeout(() => {
              if (mediaRecorder.state === 'recording') {
                console.log('Fallback timeout reached, stopping recording')
                clearInterval(progressInterval)
                mediaRecorder.stop()
                videoElement.pause()
                videoElement.currentTime = 0
              }
            }, (duration + 2) * 1000)
          }, 500)
        }).catch((err) => {
          console.error('Failed to play video:', err)
          reject(new Error('Failed to start video playback for export'))
        })
      }

      // Trigger canplay event
      videoElement.load()

    } catch (error) {
      console.error('Export error:', error)
      reject(error)
    }
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  console.log(`Downloaded: ${filename}`)
}
