precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uIntensity;
uniform float uBassLevel;    // 0-1, driven by audio analysis
uniform float uMidLevel;     // 0-1
uniform float uTrebleLevel;  // 0-1
varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  // Bass drives horizontal wave distortion
  float bassWave = sin(uv.y * 10.0 + uTime * 2.0) * uBassLevel * uIntensity * 0.1;
  uv.x += bassWave;

  // Mid frequencies drive vertical ripples
  float midRipple = sin(uv.x * 15.0 + uTime * 3.0) * uMidLevel * uIntensity * 0.08;
  uv.y += midRipple;

  // Treble drives pixel offset/glitch
  float trebleGlitch = step(0.95, uTrebleLevel) * (sin(uv.y * 100.0 + uTime * 10.0) * 0.05);

  vec4 color = texture2D(uTexture, uv);

  // Apply RGB split based on treble
  if (trebleGlitch > 0.0) {
    float offset = uTrebleLevel * uIntensity * 0.02;
    color.r = texture2D(uTexture, uv + vec2(offset, 0.0)).r;
    color.b = texture2D(uTexture, uv - vec2(offset, 0.0)).b;
  }

  // Add pulsing saturation based on overall energy
  float energy = (uBassLevel + uMidLevel + uTrebleLevel) / 3.0;
  vec3 gray = vec3(dot(color.rgb, vec3(0.299, 0.587, 0.114)));
  color.rgb = mix(gray, color.rgb, 1.0 + energy * uIntensity);

  gl_FragColor = color;
}
