precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uThreshold; // Brightness threshold for glow
uniform float uRadius; // Blur radius for glow
uniform float uIntensity; // Glow intensity
uniform float uQuality; // Quality level (1-5)

varying vec2 vUv;

// Gaussian weight function
float gaussian(float x, float sigma) {
  const float PI = 3.14159265359;
  return exp(-(x * x) / (2.0 * sigma * sigma)) / (sigma * sqrt(2.0 * PI));
}

// Extract bright areas
vec3 extractBrightness(vec3 color, float threshold) {
  float brightness = max(max(color.r, color.g), color.b);
  float t = smoothstep(threshold - 0.1, threshold + 0.1, brightness);
  return color * t;
}

// Gaussian blur for bloom
vec3 gaussianBlur(sampler2D tex, vec2 uv, vec2 resolution, float radius, int quality) {
  vec2 texelSize = 1.0 / resolution;
  vec3 result = vec3(0.0);
  float totalWeight = 0.0;

  float sigma = max(radius * 0.5, 1.0);
  int samples = quality;

  for (int x = -16; x <= 16; x++) {
    if (abs(float(x)) > radius || abs(x) > samples) continue;
    for (int y = -16; y <= 16; y++) {
      if (abs(float(y)) > radius || abs(y) > samples) continue;

      vec2 offset = vec2(float(x), float(y)) * texelSize;
      float distance = length(vec2(float(x), float(y)));
      float weight = gaussian(distance, sigma);

      result += texture2D(tex, uv + offset).rgb * weight;
      totalWeight += weight;
    }
  }

  return result / totalWeight;
}

void main() {
  vec4 originalColor = texture2D(uTexture, vUv);

  // Extract bright areas above threshold
  vec3 brightAreas = extractBrightness(originalColor.rgb, uThreshold);

  // Apply gaussian blur to bright areas
  int qualityLevel = int(clamp(uQuality, 1.0, 5.0));
  vec3 bloom = gaussianBlur(uTexture, vUv, uResolution, uRadius, qualityLevel * 3);

  // Multiply bloom by extracted brightness to only glow bright areas
  bloom *= extractBrightness(originalColor.rgb, uThreshold);

  // Combine original with bloom
  vec3 result = originalColor.rgb + bloom * uIntensity;

  gl_FragColor = vec4(result, originalColor.a);
}
