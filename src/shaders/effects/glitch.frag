precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uIntensity; // Overall glitch intensity
uniform float uFrequency; // How often glitches trigger
uniform float uSeed; // Repeatable randomness seed
uniform float uLineShift; // Enable line shift (0 or 1)
uniform float uBlockDisplace; // Enable block displacement (0 or 1)
uniform float uChannelDesync; // Enable channel desync (0 or 1)
uniform float uTimeSlice; // Enable time slice repeat (0 or 1)
uniform float uCompressionArtifacts; // Enable compression artifacts (0 or 1)
uniform float uHorizontalBias; // Horizontal vs vertical bias (0=vertical, 1=horizontal)

varying vec2 vUv;

// Seeded random function
float random(vec2 st, float seed) {
  return fract(sin(dot(st.xy, vec2(12.9898 + seed, 78.233 + seed))) * 43758.5453123);
}

// Hash function for block IDs
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

void main() {
  vec2 uv = vUv;
  vec4 color = texture2D(uTexture, uv);

  // Time-based trigger with frequency control
  float timeStep = floor(uTime * uFrequency);
  float trigger = random(vec2(timeStep), uSeed);

  // Only apply glitch if trigger threshold is met
  if (trigger < (1.0 - uIntensity)) {
    gl_FragColor = color;
    return;
  }

  // Line Shift - horizontal or vertical line displacement
  if (uLineShift > 0.5) {
    float lineAxis = mix(uv.y, uv.x, uHorizontalBias);
    float lineId = floor(lineAxis * 100.0);
    float lineRand = random(vec2(lineId, timeStep), uSeed);

    if (lineRand > 0.9) {
      float shift = (random(vec2(timeStep, lineId), uSeed) - 0.5) * uIntensity * 0.15;
      if (uHorizontalBias > 0.5) {
        uv.y += shift;
      } else {
        uv.x += shift;
      }
    }
  }

  // Block Displacement - rectangular block shifts
  if (uBlockDisplace > 0.5) {
    vec2 blockSize = mix(vec2(0.05, 0.15), vec2(0.15, 0.05), uHorizontalBias);
    vec2 blockId = floor(uv / blockSize);
    float blockRand = random(blockId + vec2(timeStep), uSeed);

    if (blockRand > 0.85) {
      vec2 blockOffset = vec2(
        random(blockId + vec2(1.0, timeStep), uSeed) - 0.5,
        random(blockId + vec2(2.0, timeStep), uSeed) - 0.5
      ) * uIntensity * 0.1;
      uv += blockOffset;
    }
  }

  // Time Slice Repeat - freeze and repeat sections
  if (uTimeSlice > 0.5) {
    float sliceAxis = mix(uv.y, uv.x, uHorizontalBias);
    float sliceId = floor(sliceAxis * 10.0);
    float sliceRand = random(vec2(sliceId, timeStep), uSeed);

    if (sliceRand > 0.9) {
      float repeatPos = fract(sliceAxis * 10.0) * 0.1;
      float freezePos = hash(sliceId + timeStep) * 0.1;
      if (uHorizontalBias > 0.5) {
        uv.x = (sliceId * 0.1) + freezePos;
      } else {
        uv.y = (sliceId * 0.1) + freezePos;
      }
    }
  }

  // Compression Artifacts - blocky quantization
  if (uCompressionArtifacts > 0.5) {
    float artifactRand = random(vec2(timeStep, floor(uv.x * 50.0)), uSeed);
    if (artifactRand > 0.92) {
      vec2 blockSize = vec2(0.02, 0.02) / uIntensity;
      uv = floor(uv / blockSize) * blockSize;
    }
  }

  // Sample with modified UV
  color = texture2D(uTexture, uv);

  // Channel Desync - separate RGB channel offsets
  if (uChannelDesync > 0.5) {
    vec2 rOffset = vec2(
      random(vec2(timeStep, 1.0), uSeed) - 0.5,
      random(vec2(timeStep, 2.0), uSeed) - 0.5
    ) * uIntensity * 0.02;

    vec2 bOffset = vec2(
      random(vec2(timeStep, 3.0), uSeed) - 0.5,
      random(vec2(timeStep, 4.0), uSeed) - 0.5
    ) * uIntensity * 0.02;

    color.r = texture2D(uTexture, uv + rOffset).r;
    color.b = texture2D(uTexture, uv + bOffset).b;
  }

  gl_FragColor = color;
}
