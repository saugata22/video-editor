// Gaussian blur effect
uniform sampler2D tDiffuse;
uniform float intensity; // 0.0 to 10.0
varying vec2 vUv;

void main() {
  vec2 texelSize = vec2(1.0) / vec2(textureSize(tDiffuse, 0));
  vec4 color = vec4(0.0);
  float total = 0.0;

  float radius = intensity;

  for(float x = -radius; x <= radius; x++) {
    for(float y = -radius; y <= radius; y++) {
      vec2 offset = vec2(x, y) * texelSize;
      float weight = 1.0 - (length(vec2(x, y)) / (radius * 1.4));
      color += texture2D(tDiffuse, vUv + offset) * weight;
      total += weight;
    }
  }

  gl_FragColor = color / total;
}
