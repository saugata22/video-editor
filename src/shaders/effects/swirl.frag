precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uIntensity;
uniform float uTime;
varying vec2 vUv;

void main() {
  vec2 center = vec2(0.5, 0.5);
  vec2 uv = vUv - center;

  float distance = length(uv);
  float angle = atan(uv.y, uv.x);

  // Apply swirl distortion
  float swirlAmount = uIntensity * (1.0 - distance) * 2.0;
  angle += swirlAmount;

  vec2 swirlUv = vec2(cos(angle), sin(angle)) * distance + center;

  gl_FragColor = texture2D(uTexture, swirlUv);
}
