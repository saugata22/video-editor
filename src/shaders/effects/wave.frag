precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uAmplitude;
uniform float uFrequency;
uniform float uTime;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  // Apply sine wave distortion
  float wave = sin(uv.y * uFrequency * 10.0 + uTime) * uAmplitude * 0.05;
  uv.x += wave;

  // Vertical wave
  float vwave = sin(uv.x * uFrequency * 10.0 + uTime) * uAmplitude * 0.05;
  uv.y += vwave;

  gl_FragColor = texture2D(uTexture, uv);
}
