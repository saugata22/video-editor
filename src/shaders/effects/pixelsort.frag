precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uThreshold;
uniform float uIntensity;
uniform float uTime;
varying vec2 vUv;

// Simple brightness calculation
float brightness(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec2 uv = vUv;

  // Horizontal pixel sorting effect
  float b = brightness(texture2D(uTexture, uv).rgb);

  // Sort pixels based on brightness threshold
  if (b > uThreshold) {
    float offset = (b - uThreshold) * uIntensity * 0.1;
    uv.x += offset;
  }

  gl_FragColor = texture2D(uTexture, uv);
}
