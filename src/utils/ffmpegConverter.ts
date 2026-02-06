import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpegInstance: FFmpeg | null = null
let isLoaded = false

export async function loadFFmpeg(onProgress?: (progress: number) => void): Promise<FFmpeg> {
  if (ffmpegInstance && isLoaded) {
    console.log('✓ Using existing FFmpeg instance')
    return ffmpegInstance
  }

  console.log('=== FFMPEG.WASM INITIALIZATION ===')
  console.log('1. Creating FFmpeg instance...')

  try {
    ffmpegInstance = new FFmpeg()
    console.log('  ✓ FFmpeg instance created')
  } catch (error) {
    console.error('  ✗ Failed to create FFmpeg instance:', error)
    throw new Error('Failed to initialize FFmpeg: ' + (error as Error).message)
  }

  // Set up logging
  ffmpegInstance.on('log', ({ type, message }) => {
    console.log(`[FFmpeg ${type}]`, message)
  })

  ffmpegInstance.on('progress', ({ progress, time }) => {
    const percent = progress * 100
    if (onProgress) {
      onProgress(percent)
    }
    console.log(`[FFmpeg Progress] ${percent.toFixed(1)}% (time: ${time}s)`)
  })

  // Load FFmpeg WASM files with timeout
  console.log('\n2. Loading FFmpeg WASM core files...')
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
  console.log('  - Base URL:', baseURL)

  try {
    console.log('  - Downloading ffmpeg-core.js...')
    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript')
    console.log('    ✓ ffmpeg-core.js downloaded')

    console.log('  - Downloading ffmpeg-core.wasm...')
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
    console.log('    ✓ ffmpeg-core.wasm downloaded')

    console.log('  - Loading FFmpeg...')
    const loadPromise = ffmpegInstance.load({
      coreURL,
      wasmURL,
    })

    // Add 30 second timeout for loading
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('FFmpeg load timeout after 30 seconds')), 30000)
    )

    await Promise.race([loadPromise, timeoutPromise])
    console.log('✓ FFmpeg.wasm loaded successfully\n')
    isLoaded = true

    return ffmpegInstance
  } catch (error) {
    console.error('\n✗ FFMPEG LOAD FAILED')
    console.error('Error:', error)
    console.error('Name:', (error as Error).name)
    console.error('Message:', (error as Error).message)
    console.error('Stack:', (error as Error).stack)

    ffmpegInstance = null
    isLoaded = false

    throw new Error('Failed to load FFmpeg.wasm: ' + (error as Error).message)
  }
}

export async function convertWebMToMP4(
  webmBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const startTime = Date.now()

  try {
    console.log('\n=== WEBM TO MP4 CONVERSION ===')
    console.log('Input Analysis:')
    console.log(`  - Blob size: ${(webmBlob.size / 1024 / 1024).toFixed(2)} MB`)
    console.log(`  - Blob type: ${webmBlob.type}`)

    // Load FFmpeg if not already loaded
    console.log('\nStep 1: Loading FFmpeg...')
    const ffmpeg = await loadFFmpeg(onProgress)

    // File names
    const inputFileName = 'input.webm'
    const outputFileName = 'output.mp4'

    // Step 2: Write input file
    console.log('\nStep 2: Writing input file to virtual filesystem...')
    const inputData = await fetchFile(webmBlob)
    console.log(`  - Fetched ${inputData.length} bytes from blob`)

    await ffmpeg.writeFile(inputFileName, inputData)
    console.log(`  ✓ Written to virtual FS: ${inputFileName}`)

    // Verify file was written
    try {
      const files = await ffmpeg.listDir('/')
      console.log('  - Virtual FS contents:', files.map((f: any) => f.name).join(', '))
    } catch (e) {
      console.warn('  - Could not list directory:', e)
    }

    // Step 3: Convert
    console.log('\nStep 3: Converting WebM to MP4...')
    const ffmpegArgs = [
      '-i', inputFileName,
      '-c:v', 'libx264',           // H.264 video codec
      '-preset', 'ultrafast',      // Fastest encoding
      '-crf', '23',                // Reasonable quality
      '-c:a', 'aac',               // AAC audio codec
      '-b:a', '128k',              // Audio bitrate
      '-movflags', '+faststart',   // Web streaming optimization
      '-y',                        // Overwrite output file
      outputFileName
    ]
    console.log('  - FFmpeg command:', ffmpegArgs.join(' '))

    // Execute with timeout
    console.log('  - Starting conversion (max 2 minutes)...')
    const execPromise = ffmpeg.exec(ffmpegArgs)

    // Add 2 minute timeout for conversion
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Conversion timeout - exceeded 2 minutes')), 120000)
    )

    await Promise.race([execPromise, timeoutPromise])
    console.log('  ✓ Conversion complete')

    // Step 4: Read output
    console.log('\nStep 4: Reading output file...')
    let data: Uint8Array
    try {
      data = await ffmpeg.readFile(outputFileName) as Uint8Array
      console.log(`  ✓ Read ${data.length} bytes from ${outputFileName}`)
    } catch (e) {
      console.error('  ✗ Failed to read output file:', e)
      throw new Error('FFmpeg conversion completed but output file not found')
    }

    // Convert to Blob
    const mp4Blob = new Blob([data], { type: 'video/mp4' })
    console.log(`  - Created MP4 blob: ${(mp4Blob.size / 1024 / 1024).toFixed(2)} MB`)

    // Step 5: Cleanup
    console.log('\nStep 5: Cleaning up virtual filesystem...')
    try {
      await ffmpeg.deleteFile(inputFileName)
      await ffmpeg.deleteFile(outputFileName)
      console.log('  ✓ Cleanup complete')
    } catch (e) {
      console.warn('  ⚠ Cleanup warning (non-critical):', e)
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n✓ CONVERSION SUCCESSFUL (${elapsed}s)`)
    console.log(`  - Input: ${(webmBlob.size / 1024 / 1024).toFixed(2)} MB (WebM)`)
    console.log(`  - Output: ${(mp4Blob.size / 1024 / 1024).toFixed(2)} MB (MP4)`)
    console.log('=== END CONVERSION ===\n')

    return mp4Blob

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.error(`\n✗ CONVERSION FAILED (${elapsed}s)`)
    console.error('Error Type:', (error as Error).name)
    console.error('Error Message:', (error as Error).message)
    console.error('Full Error:', error)
    console.error('Stack Trace:', (error as Error).stack)

    // Provide detailed diagnostics
    console.error('\nDiagnostics:')
    console.error('  - FFmpeg loaded:', isLoaded)
    console.error('  - Input size:', (webmBlob.size / 1024 / 1024).toFixed(2), 'MB')
    console.error('  - Time elapsed:', elapsed, 's')

    if (ffmpegInstance) {
      try {
        const files = await ffmpegInstance.listDir('/')
        console.error('  - Virtual FS:', files.map((f: any) => `${f.name} (${f.size} bytes)`).join(', '))
      } catch (e) {
        console.error('  - Could not list virtual FS')
      }
    }

    // Try to provide helpful error message
    let errorMessage = 'Failed to convert to MP4'
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Conversion timed out after 2 minutes. Try:\n• Exporting a shorter video\n• Using WebM format instead\n• Reducing quality settings'
      } else if (error.message.includes('memory') || error.message.includes('OOM')) {
        errorMessage = 'Not enough memory for conversion. Try:\n• Reducing video quality\n• Exporting shorter duration\n• Closing other browser tabs'
      } else if (error.message.includes('load')) {
        errorMessage = 'Failed to load FFmpeg.wasm. Check:\n• Internet connection\n• Browser console for CORS errors\n• Ad blockers or security extensions'
      } else {
        errorMessage = `FFmpeg conversion error: ${error.message}`
      }
    }

    console.error('=== END CONVERSION (FAILED) ===\n')
    throw new Error(errorMessage)
  }
}

export function isFFmpegLoaded(): boolean {
  return isLoaded
}
