precision highp float;
uniform sampler2D uTexture;
uniform sampler2D uPrevTexture; // Previous frame for motion vectors
uniform vec2 uResolution;
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;

// Random function
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
  vec2 uv = vUv;

  // Calculate motion vectors (simplified)
  vec4 current = texture2D(uTexture, uv);
  vec4 previous = texture2D(uPrevTexture, uv);
  vec3 motion = current.rgb - previous.rgb;

  // Exaggerate motion
  vec2 motionOffset = motion.rg * uIntensity * 0.1;

  // Macroblock-style displacement
  vec2 blockSize = vec2(16.0) / uResolution;
  vec2 blockUv = floor(uv / blockSize) * blockSize;

  // Random glitch based on time and position
  float glitch = step(0.95, random(blockUv + fract(uTime)));

  if (glitch > 0.0 && uIntensity > 0.5) {
    // Corrupt this block
    uv = blockUv + random(blockUv + uTime) * blockSize;
    motionOffset *= 5.0;
  }

  // Apply motion-based displacement
  uv += motionOffset;

  vec4 color = texture2D(uTexture, uv);

  // Add compression artifacts
  if (uIntensity > 0.3) {
    color.rgb = floor(color.rgb * (8.0 - uIntensity * 4.0)) / (8.0 - uIntensity * 4.0);
  }

  // I-frame removal simulation (color bleeding)
  if (glitch > 0.0) {
    color = mix(color, previous, 0.7);
  }

  gl_FragColor = color;
}
