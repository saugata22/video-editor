precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec2 center = vec2(0.5, 0.5);
  vec2 pos = uv - center;

  // Rotating spiral displacement
  float dist = length(pos);
  float angle = atan(pos.y, pos.x) + uTime + dist * uIntensity * 10.0;

  // Pulsing radial distortion
  float pulse = sin(uTime * 2.0) * 0.5 + 0.5;
  dist = dist * (1.0 + pulse * uIntensity * 0.3);

  // Reconstruct position
  vec2 newPos = vec2(cos(angle), sin(angle)) * dist + center;

  // Sample with chromatic aberration
  float offset = uIntensity * 0.02;
  vec4 color;
  color.r = texture2D(uTexture, newPos + vec2(offset, 0.0)).r;
  color.g = texture2D(uTexture, newPos).g;
  color.b = texture2D(uTexture, newPos - vec2(offset, 0.0)).b;
  color.a = 1.0;

  // Color cycling
  float hueShift = uTime * 0.5;
  color.rgb = color.rgb * (1.0 + sin(hueShift + color.r * 6.28) * uIntensity * 0.5);

  // Add kaleidoscope segments
  float segments = 6.0;
  float segmentAngle = atan(pos.y, pos.x);
  float segmented = mod(segmentAngle, 6.28 / segments);
  vec2 segmentedPos = vec2(cos(segmented), sin(segmented)) * dist + center;

  color = mix(color, texture2D(uTexture, segmentedPos), uIntensity * 0.3);

  gl_FragColor = color;
}
