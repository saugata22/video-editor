precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uIntensity;
uniform float uTime;
varying vec2 vUv;

#define PI 3.14159265359

void main() {
  vec2 center = vec2(0.5, 0.5);
  vec2 uv = vUv - center;

  // Convert to polar coordinates
  float radius = length(uv);
  float angle = atan(uv.y, uv.x);

  // Mix between cartesian and polar
  vec2 polarUv = vec2(angle / (2.0 * PI) + 0.5, radius * 2.0);
  vec2 finalUv = mix(vUv, polarUv, uIntensity);

  gl_FragColor = texture2D(uTexture, finalUv);
}
