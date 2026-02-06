import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { availableEffects } from '../../effects/effectRegistry'

interface WebGLVideoPreviewProps {
  videoSrc: string
  appliedEffects: Array<{ id: string; effectId: string; parameters: Record<string, any> }>
  onTimeUpdate?: (time: number) => void
  onDurationChange?: (duration: number) => void
  isPlaying: boolean
  currentTime: number
  aspectRatio: string
  aspectRatioValue: number | null
}

export interface WebGLVideoPreviewHandle {
  getVideoElement: () => HTMLVideoElement | null
  getCanvas: () => HTMLCanvasElement | null
}

const WebGLVideoPreview = forwardRef<WebGLVideoPreviewHandle, WebGLVideoPreviewProps>(
  (
    {
      videoSrc,
      appliedEffects,
      onTimeUpdate,
      onDurationChange,
      isPlaying,
      currentTime,
      aspectRatio,
      aspectRatioValue,
    },
    ref
  ) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const renderTargetARef = useRef<THREE.WebGLRenderTarget | null>(null)
  const renderTargetBRef = useRef<THREE.WebGLRenderTarget | null>(null)
  const appliedEffectsRef = useRef(appliedEffects)
  const [fps, setFps] = useState(60)
  const [videoDimensions, setVideoDimensions] = useState({ width: 1920, height: 1080 })

  // Calculate canvas dimensions based on aspect ratio
  const calculateCanvasDimensions = (videoWidth: number, videoHeight: number, targetAspectRatio: number | null) => {
    if (!targetAspectRatio) {
      // Use original video dimensions
      return { width: videoWidth, height: videoHeight }
    }

    const videoAspect = videoWidth / videoHeight

    if (Math.abs(videoAspect - targetAspectRatio) < 0.01) {
      // Already at target aspect ratio
      return { width: videoWidth, height: videoHeight }
    }

    // Calculate dimensions that crop to target aspect ratio
    if (videoAspect > targetAspectRatio) {
      // Video is wider than target - crop width
      const newWidth = videoHeight * targetAspectRatio
      return { width: Math.round(newWidth), height: videoHeight }
    } else {
      // Video is taller than target - crop height
      const newHeight = videoWidth / targetAspectRatio
      return { width: videoWidth, height: Math.round(newHeight) }
    }
  }

  // Expose video element and canvas for export
  useImperativeHandle(ref, () => ({
    getVideoElement: () => videoRef.current,
    getCanvas: () => rendererRef.current?.domElement || null,
  }))

  // Update ref when appliedEffects changes
  useEffect(() => {
    appliedEffectsRef.current = appliedEffects
  }, [appliedEffects])

  useEffect(() => {
    if (!containerRef.current) return

    // Create video element
    const video = document.createElement('video')
    video.src = videoSrc
    video.crossOrigin = 'anonymous'
    video.loop = false
    video.muted = false
    videoRef.current = video

    video.addEventListener('loadedmetadata', () => {
      if (onDurationChange) onDurationChange(video.duration)

      // Store video dimensions
      const videoWidth = video.videoWidth
      const videoHeight = video.videoHeight
      setVideoDimensions({ width: videoWidth, height: videoHeight })

      console.log(`Video loaded: ${videoWidth}x${videoHeight}`)

      // Calculate canvas dimensions based on aspect ratio
      const canvasDims = calculateCanvasDimensions(videoWidth, videoHeight, aspectRatioValue)
      console.log(`Canvas dimensions: ${canvasDims.width}x${canvasDims.height}`)

      // Resize renderer and render targets to match video resolution
      renderer.setSize(canvasDims.width, canvasDims.height)
      renderTargetA.setSize(canvasDims.width, canvasDims.height)
      renderTargetB.setSize(canvasDims.width, canvasDims.height)

      // Update material resolution uniform
      if (materialRef.current) {
        materialRef.current.uniforms.uResolution.value.set(canvasDims.width, canvasDims.height)
      }
    })

    video.addEventListener('timeupdate', () => {
      if (onTimeUpdate) onTimeUpdate(video.currentTime)
    })

    // Set up Three.js scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: false })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Create video texture
    const videoTexture = new THREE.VideoTexture(video)
    videoTexture.minFilter = THREE.LinearFilter
    videoTexture.magFilter = THREE.LinearFilter

    // Create ping-pong render targets for multi-pass rendering
    const renderTargetA = new THREE.WebGLRenderTarget(1920, 1080, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })
    const renderTargetB = new THREE.WebGLRenderTarget(1920, 1080, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })
    renderTargetARef.current = renderTargetA
    renderTargetBRef.current = renderTargetB

    // Create plane geometry
    const geometry = new THREE.PlaneGeometry(2, 2)

    // Create material with passthrough shader (will be updated with effects)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: videoTexture },
        uResolution: { value: new THREE.Vector2(video.videoWidth || 1920, video.videoHeight || 1080) },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform sampler2D uTexture;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(uTexture, vUv);
        }
      `,
    })
    materialRef.current = material

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    // Animation loop with multi-pass rendering
    let lastTime = performance.now()
    let frameCount = 0
    let fpsTime = 0

    const animate = () => {
      requestAnimationFrame(animate)

      const now = performance.now()
      const delta = now - lastTime
      lastTime = now

      // FPS calculation
      frameCount++
      fpsTime += delta
      if (fpsTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / fpsTime))
        frameCount = 0
        fpsTime = 0
      }

      // Update time uniform for time-based effects
      const currentTimeSeconds = now / 1000

      // Get all enabled effects (use ref to avoid stale closure)
      const enabledEffects = appliedEffectsRef.current.filter((e) => e.parameters['enabled'] !== false)

      // If no effects, render video directly to screen
      if (enabledEffects.length === 0) {
        material.uniforms.uTexture.value = videoTexture
        material.uniforms.uTime.value = currentTimeSeconds
        material.fragmentShader = `
          precision highp float;
          uniform sampler2D uTexture;
          varying vec2 vUv;
          void main() {
            gl_FragColor = texture2D(uTexture, vUv);
          }
        `
        material.needsUpdate = true
        renderer.render(scene, camera)
        return
      }

      // Multi-pass rendering: chain effects together
      let inputTexture = videoTexture
      let currentTarget = renderTargetA
      let nextTarget = renderTargetB

      enabledEffects.forEach((appliedEffect, index) => {
        const effectDef = availableEffects.find((e) => e.id === appliedEffect.effectId)
        if (!effectDef || !effectDef.fragmentShader) return

        // Set input texture
        material.uniforms.uTexture.value = inputTexture

        // Update effect-specific uniforms
        effectDef.parameters.forEach((param) => {
          const value = appliedEffect.parameters[param.name] ?? param.defaultValue
          if (!material.uniforms[param.name]) {
            material.uniforms[param.name] = { value }
          } else {
            material.uniforms[param.name].value = value
          }
        })

        // Set common uniforms
        material.uniforms.uResolution.value.set(video.videoWidth || 1920, video.videoHeight || 1080)
        material.uniforms.uTime.value = currentTimeSeconds

        // Apply shader
        material.fragmentShader = effectDef.fragmentShader
        material.needsUpdate = true

        // Render to target (or screen for last effect)
        if (index < enabledEffects.length - 1) {
          // Render to off-screen buffer
          renderer.setRenderTarget(currentTarget)
          renderer.render(scene, camera)

          // Next effect uses this render target as input
          inputTexture = currentTarget.texture

          // Swap targets for ping-pong
          const temp = currentTarget
          currentTarget = nextTarget
          nextTarget = temp
        } else {
          // Last effect: render to screen
          renderer.setRenderTarget(null)
          renderer.render(scene, camera)
        }
      })
    }
    animate()

    // Handle window resize
    const handleResize = () => {
      if (containerRef.current && renderer) {
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (renderTargetA) renderTargetA.dispose()
      if (renderTargetB) renderTargetB.dispose()
      if (renderer) {
        renderer.dispose()
        containerRef.current?.removeChild(renderer.domElement)
      }
      if (video) {
        video.pause()
        video.src = ''
      }
    }
  }, [videoSrc])

  // Handle aspect ratio changes
  useEffect(() => {
    if (!videoRef.current || !rendererRef.current || !renderTargetARef.current || !renderTargetBRef.current) return

    const video = videoRef.current
    if (video.videoWidth === 0 || video.videoHeight === 0) return

    // Calculate new canvas dimensions
    const canvasDims = calculateCanvasDimensions(video.videoWidth, video.videoHeight, aspectRatioValue)
    console.log(`Aspect ratio changed: ${aspectRatio} -> ${canvasDims.width}x${canvasDims.height}`)

    // Resize renderer and render targets
    rendererRef.current.setSize(canvasDims.width, canvasDims.height)
    renderTargetARef.current.setSize(canvasDims.width, canvasDims.height)
    renderTargetBRef.current.setSize(canvasDims.width, canvasDims.height)

    // Update material resolution uniform
    if (materialRef.current) {
      materialRef.current.uniforms.uResolution.value.set(canvasDims.width, canvasDims.height)
    }
  }, [aspectRatio, aspectRatioValue, videoDimensions, calculateCanvasDimensions])

  // Note: Effect rendering now handled in animation loop with multi-pass system

  // Control playback
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.play()
    } else {
      video.pause()
    }
  }, [isPlaying])

  // Seek to time
  useEffect(() => {
    const video = videoRef.current
    if (!video || Math.abs(video.currentTime - currentTime) < 0.1) return
    video.currentTime = currentTime
  }, [currentTime])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#000' }} />
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(0,0,0,0.7)',
          color: '#0ea5e9',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: 12,
          fontFamily: 'monospace',
        }}
      >
        {fps} FPS
      </div>
    </div>
  )
})

WebGLVideoPreview.displayName = 'WebGLVideoPreview'

export default WebGLVideoPreview
