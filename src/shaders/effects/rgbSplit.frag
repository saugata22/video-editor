precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uOffsetMagnitude; // Base offset strength
uniform float uDirection; // Direction angle in radians
uniform float uChannelR; // Enable R channel split (0 or 1)
uniform float uChannelG; // Enable G channel split (0 or 1)
uniform float uChannelB; // Enable B channel split (0 or 1)
uniform float uLumaInfluence; // How much luma affects offset
uniform float uTemporalJitter; // Animated jitter amount

varying vec2 vUv;

const float PI = 3.14159265359;

// Pseudo-random function
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// RGB to Luma conversion
float getLuma(vec3 rgb) {
  return dot(rgb, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec4 originalColor = texture2D(uTexture, vUv);
  float luma = getLuma(originalColor.rgb);

  // Calculate base direction vector
  vec2 directionVec = vec2(cos(uDirection), sin(uDirection));

  // Apply temporal jitter
  float jitterAmount = uTemporalJitter;
  if (jitterAmount > 0.0) {
    float timeJitter = sin(uTime * 5.0 + random(floor(vUv * 100.0)) * 6.28) * jitterAmount;
    float angleJitter = timeJitter * 0.5;
    directionVec = vec2(
      cos(uDirection + angleJitter),
      sin(uDirection + angleJitter)
    );
  }

  // Calculate luma-based offset multiplier
  float lumaMultiplier = 1.0 + (luma - 0.5) * uLumaInfluence * 2.0;
  lumaMultiplier = max(lumaMultiplier, 0.0);

  // Calculate final offset with luma influence
  vec2 baseOffset = directionVec * uOffsetMagnitude * 0.01 * lumaMultiplier;

  // Sample channels with different offsets
  float r = originalColor.r;
  float g = originalColor.g;
  float b = originalColor.b;

  if (uChannelR > 0.5) {
    r = texture2D(uTexture, vUv + baseOffset).r;
  }

  if (uChannelG > 0.5) {
    // G channel gets half offset in opposite direction for classic chromatic aberration
    g = texture2D(uTexture, vUv - baseOffset * 0.5).g;
  }

  if (uChannelB > 0.5) {
    b = texture2D(uTexture, vUv - baseOffset).b;
  }

  gl_FragColor = vec4(r, g, b, originalColor.a);
}
