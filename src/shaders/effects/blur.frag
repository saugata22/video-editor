precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uRadius;
uniform float uMode; // 0=Gaussian, 1=Box, 2=Kawase, 3=Directional, 4=Radial, 5=Tilt-shift
uniform float uDirection; // For directional blur (angle in radians)
uniform float uCenterX; // For radial blur center X (0.5 = center)
uniform float uCenterY; // For radial blur center Y (0.5 = center)
uniform float uIterations; // Quality control
uniform float uLumaPreserve; // 0=off, 1=on
uniform float uEdgeBehavior; // 0=Clamp, 1=Mirror, 2=Wrap

varying vec2 vUv;

const float PI = 3.14159265359;

// Edge sampling based on behavior mode
vec4 sampleTexture(sampler2D tex, vec2 uv) {
  vec2 coord = uv;

  if (uEdgeBehavior < 0.5) {
    // Clamp
    coord = clamp(coord, 0.0, 1.0);
  } else if (uEdgeBehavior < 1.5) {
    // Mirror
    coord = abs(fract(coord * 0.5) * 2.0 - 1.0);
  } else {
    // Wrap
    coord = fract(coord);
  }

  return texture2D(tex, coord);
}

// Gaussian weight function
float gaussian(float x, float sigma) {
  return exp(-(x * x) / (2.0 * sigma * sigma)) / (sigma * sqrt(2.0 * PI));
}

// Gaussian Blur
vec4 gaussianBlur() {
  vec2 texelSize = 1.0 / uResolution;
  vec4 color = vec4(0.0);
  float totalWeight = 0.0;

  float sigma = max(uRadius * 0.5, 1.0);
  int samples = int(clamp(uIterations, 1.0, 16.0));
  float range = uRadius;

  for (int x = -16; x <= 16; x++) {
    if (abs(float(x)) > range) continue;
    for (int y = -16; y <= 16; y++) {
      if (abs(float(y)) > range) continue;

      vec2 offset = vec2(float(x), float(y)) * texelSize;
      float distance = length(vec2(float(x), float(y)));
      float weight = gaussian(distance, sigma);

      color += sampleTexture(uTexture, vUv + offset) * weight;
      totalWeight += weight;
    }
  }

  return color / totalWeight;
}

// Box Blur
vec4 boxBlur() {
  vec2 texelSize = 1.0 / uResolution;
  vec4 color = vec4(0.0);
  float total = 0.0;

  float range = uRadius;

  for (int x = -16; x <= 16; x++) {
    if (abs(float(x)) > range) continue;
    for (int y = -16; y <= 16; y++) {
      if (abs(float(y)) > range) continue;

      vec2 offset = vec2(float(x), float(y)) * texelSize;
      color += sampleTexture(uTexture, vUv + offset);
      total += 1.0;
    }
  }

  return color / total;
}

// Kawase Blur (efficient dual-pass approximation)
vec4 kawaseBlur() {
  vec2 texelSize = 1.0 / uResolution;
  vec4 color = vec4(0.0);

  int iterations = int(clamp(uIterations, 1.0, 8.0));
  float offset = uRadius * 0.5;

  // Simplified Kawase - sample diagonals
  for (int i = 0; i < 8; i++) {
    if (i >= iterations) break;

    float currentOffset = offset * (float(i) + 1.0);
    vec2 off = texelSize * currentOffset;

    color += sampleTexture(uTexture, vUv + vec2(off.x, off.y));
    color += sampleTexture(uTexture, vUv + vec2(-off.x, off.y));
    color += sampleTexture(uTexture, vUv + vec2(off.x, -off.y));
    color += sampleTexture(uTexture, vUv + vec2(-off.x, -off.y));
  }

  return color / (4.0 * float(iterations));
}

// Directional Blur (motion blur)
vec4 directionalBlur() {
  vec2 texelSize = 1.0 / uResolution;
  vec4 color = vec4(0.0);

  vec2 direction = vec2(cos(uDirection), sin(uDirection));
  int samples = int(clamp(uIterations, 1.0, 32.0));

  for (int i = 0; i < 32; i++) {
    if (i >= samples) break;

    float t = (float(i) / float(samples - 1)) - 0.5;
    vec2 offset = direction * t * uRadius * texelSize;
    color += sampleTexture(uTexture, vUv + offset);
  }

  return color / float(samples);
}

// Radial Blur (zoom blur from center)
vec4 radialBlur() {
  vec4 color = vec4(0.0);

  vec2 center = vec2(uCenterX, uCenterY);
  vec2 toCenter = center - vUv;
  int samples = int(clamp(uIterations, 1.0, 32.0));

  for (int i = 0; i < 32; i++) {
    if (i >= samples) break;

    float t = float(i) / float(samples - 1);
    float scale = 1.0 + (t - 0.5) * uRadius * 0.1;
    vec2 offset = vUv + toCenter * (1.0 - scale);
    color += sampleTexture(uTexture, offset);
  }

  return color / float(samples);
}

// Tilt-shift Blur (depth-of-field style)
vec4 tiltshiftBlur() {
  vec2 texelSize = 1.0 / uResolution;
  vec4 color = vec4(0.0);

  // Calculate blur amount based on distance from center
  float distFromCenter = abs(vUv.y - uCenterY);
  float blurAmount = smoothstep(0.0, 0.3, distFromCenter) * uRadius;

  if (blurAmount < 0.5) {
    return sampleTexture(uTexture, vUv);
  }

  float totalWeight = 0.0;
  float sigma = max(blurAmount * 0.5, 1.0);

  for (int x = -8; x <= 8; x++) {
    for (int y = -8; y <= 8; y++) {
      vec2 offset = vec2(float(x), float(y)) * texelSize;
      float distance = length(vec2(float(x), float(y)));

      if (distance > blurAmount) continue;

      float weight = gaussian(distance, sigma);
      color += sampleTexture(uTexture, vUv + offset) * weight;
      totalWeight += weight;
    }
  }

  return color / totalWeight;
}

void main() {
  vec4 original = sampleTexture(uTexture, vUv);
  vec4 blurred;

  // Select blur mode
  if (uMode < 0.5) {
    blurred = gaussianBlur();
  } else if (uMode < 1.5) {
    blurred = boxBlur();
  } else if (uMode < 2.5) {
    blurred = kawaseBlur();
  } else if (uMode < 3.5) {
    blurred = directionalBlur();
  } else if (uMode < 4.5) {
    blurred = radialBlur();
  } else {
    blurred = tiltshiftBlur();
  }

  // Luma preservation
  if (uLumaPreserve > 0.5) {
    float originalLuma = dot(original.rgb, vec3(0.299, 0.587, 0.114));
    float blurredLuma = dot(blurred.rgb, vec3(0.299, 0.587, 0.114));

    if (blurredLuma > 0.0) {
      blurred.rgb *= originalLuma / blurredLuma;
    }
  }

  gl_FragColor = blurred;
}
