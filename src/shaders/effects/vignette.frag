precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uIntensity;
uniform float uRadius;
uniform float uTime;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(uTexture, vUv);

  // Calculate distance from center
  vec2 center = vec2(0.5, 0.5);
  float dist = distance(vUv, center);

  // Create vignette effect
  float vignette = smoothstep(uRadius, uRadius - uIntensity, dist);

  gl_FragColor = vec4(color.rgb * vignette, color.a);
}
