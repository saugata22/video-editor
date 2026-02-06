precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uIntensity;
uniform float uFrequency;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  // Create multiple wave layers that respond to audio frequency
  float wave1 = sin(uv.x * 20.0 + uTime * 2.0 + uFrequency * 10.0) * uIntensity * 0.05;
  float wave2 = sin(uv.y * 15.0 + uTime * 1.5 - uFrequency * 8.0) * uIntensity * 0.05;
  float wave3 = cos(length(uv - 0.5) * 30.0 - uTime * 3.0 + uFrequency * 12.0) * uIntensity * 0.03;

  uv.x += wave1 + wave3;
  uv.y += wave2 + wave3;

  vec4 color = texture2D(uTexture, uv);

  // Add waveform visualization overlay
  float waveform = abs(sin(uv.x * 50.0 + uFrequency * 20.0 - uTime * 5.0));
  if (abs(uv.y - 0.5) < waveform * uIntensity * 0.1) {
    color.rgb = mix(color.rgb, vec3(0.0, 1.0, 1.0), 0.5);
  }

  gl_FragColor = color;
}
