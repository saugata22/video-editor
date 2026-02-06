precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uCells;
uniform float uIntensity;
uniform float uTime;
varying vec2 vUv;

// Hash function for pseudo-random values
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

// Voronoi distance
float voronoi(vec2 uv, float scale) {
  vec2 g = floor(uv * scale);
  vec2 f = fract(uv * scale);

  float minDist = 1.0;
  vec2 minPoint;

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = hash2(g + neighbor);
      point = 0.5 + 0.5 * sin(uTime * 0.5 + 6.2831 * point);

      vec2 diff = neighbor + point - f;
      float dist = length(diff);

      if (dist < minDist) {
        minDist = dist;
        minPoint = point;
      }
    }
  }

  return minDist;
}

void main() {
  vec2 uv = vUv;

  // Get voronoi pattern
  float v = voronoi(uv, uCells);

  // Apply as color quantization or displacement
  vec4 color = texture2D(uTexture, uv);

  // Mix original color with voronoi pattern
  vec3 voronoiColor = color.rgb * (1.0 - uIntensity) + vec3(v) * uIntensity;

  gl_FragColor = vec4(voronoiColor, color.a);
}
