precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec2 center = vec2(0.5, 0.5);

  // Fractal zoom effect
  vec4 color = vec4(0.0);
  float layers = 5.0;

  for (float i = 0.0; i < 5.0; i++) {
    float scale = pow(2.0, i) * (1.0 + sin(uTime + i) * uIntensity * 0.5);
    float rotation = uTime * 0.5 + i * 0.5;

    // Transform UV
    vec2 p = (uv - center) * scale;
    float angle = rotation;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    p = rot * p + center;

    // Wrap coordinates
    p = fract(p);

    // Sample and accumulate
    vec4 sample = texture2D(uTexture, p);
    color += sample / layers;
  }

  // Add color shifting
  color.rgb *= vec3(
    1.0 + sin(uTime) * uIntensity * 0.3,
    1.0 + sin(uTime + 2.0) * uIntensity * 0.3,
    1.0 + sin(uTime + 4.0) * uIntensity * 0.3
  );

  gl_FragColor = color;
}
