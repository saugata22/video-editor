precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uMapSource; // 0=Simplex, 1=Perlin, 2=Luma, 3=Value, 4=Curl
uniform float uIntensityX; // X displacement strength
uniform float uIntensityY; // Y displacement strength
uniform float uScale; // Map scale/frequency
uniform float uTimeSpeed; // Time evolution speed
uniform float uEdgeBehavior; // 0=Clamp, 1=Mirror, 2=Wrap
uniform float uSmoothness; // Map smoothing/blur amount
uniform float uSeed; // Random seed

varying vec2 vUv;

// Helper functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

// Random with seed
float random(vec2 st, float seed) {
  return fract(sin(dot(st.xy + seed, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Simplex Noise
float simplexNoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Perlin Noise
float perlinNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  float a = random(i, uSeed);
  float b = random(i + vec2(1.0, 0.0), uSeed);
  float c = random(i + vec2(0.0, 1.0), uSeed);
  float d = random(i + vec2(1.0, 1.0), uSeed);

  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Value Noise
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  f = f * f * (3.0 - 2.0 * f);

  float a = random(i, uSeed);
  float b = random(i + vec2(1.0, 0.0), uSeed);
  float c = random(i + vec2(0.0, 1.0), uSeed);
  float d = random(i + vec2(1.0, 1.0), uSeed);

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Curl Noise
vec2 curlNoise(vec2 p) {
  float eps = 0.01;
  float n1 = simplexNoise(p + vec2(0.0, eps));
  float n2 = simplexNoise(p - vec2(0.0, eps));
  float n3 = simplexNoise(p + vec2(eps, 0.0));
  float n4 = simplexNoise(p - vec2(eps, 0.0));

  float dx = (n3 - n4) / (2.0 * eps);
  float dy = (n1 - n2) / (2.0 * eps);

  return vec2(-dy, dx);
}

// RGB to Luma
float getLuma(vec3 rgb) {
  return dot(rgb, vec3(0.299, 0.587, 0.114));
}

// Edge behavior sampling
vec4 sampleWithEdgeBehavior(sampler2D tex, vec2 uv) {
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

void main() {
  vec2 uv = vUv;
  float timeOffset = uTime * uTimeSpeed;

  // Generate displacement map based on source
  vec2 displacement = vec2(0.0);

  if (uMapSource < 0.5) {
    // Simplex Noise
    vec2 noiseCoord = uv * uScale + uSeed + timeOffset;
    displacement.x = simplexNoise(noiseCoord);
    displacement.y = simplexNoise(noiseCoord + vec2(100.0));

  } else if (uMapSource < 1.5) {
    // Perlin Noise
    vec2 noiseCoord = uv * uScale + uSeed + timeOffset;
    displacement.x = perlinNoise(noiseCoord);
    displacement.y = perlinNoise(noiseCoord + vec2(100.0));

  } else if (uMapSource < 2.5) {
    // Luma-based displacement
    vec4 color = texture2D(uTexture, uv);
    float luma = getLuma(color.rgb);

    // Use luma gradients for displacement direction
    float lumaRight = getLuma(sampleWithEdgeBehavior(uTexture, uv + vec2(0.01, 0.0)).rgb);
    float lumaLeft = getLuma(sampleWithEdgeBehavior(uTexture, uv - vec2(0.01, 0.0)).rgb);
    float lumaUp = getLuma(sampleWithEdgeBehavior(uTexture, uv + vec2(0.0, 0.01)).rgb);
    float lumaDown = getLuma(sampleWithEdgeBehavior(uTexture, uv - vec2(0.0, 0.01)).rgb);

    displacement.x = (lumaRight - lumaLeft) * uScale;
    displacement.y = (lumaUp - lumaDown) * uScale;

  } else if (uMapSource < 3.5) {
    // Value Noise
    vec2 noiseCoord = uv * uScale + uSeed + timeOffset;
    displacement.x = valueNoise(noiseCoord);
    displacement.y = valueNoise(noiseCoord + vec2(100.0));

  } else {
    // Curl Noise
    vec2 noiseCoord = uv * uScale + uSeed + timeOffset;
    displacement = curlNoise(noiseCoord);
  }

  // Apply smoothness (multi-sample blur for displacement map)
  if (uSmoothness > 0.01) {
    vec2 smoothedDisplacement = vec2(0.0);
    float totalWeight = 0.0;
    int samples = int(uSmoothness * 5.0) + 1;

    for (int x = -samples; x <= samples; x++) {
      for (int y = -samples; y <= samples; y++) {
        vec2 offset = vec2(float(x), float(y)) * 0.01;
        float weight = 1.0 / (1.0 + length(offset) * 10.0);

        vec2 sampleUv = uv + offset;
        vec2 sampleDisp;

        // Re-sample displacement at offset position
        if (uMapSource < 0.5) {
          vec2 noiseCoord = sampleUv * uScale + uSeed + timeOffset;
          sampleDisp.x = simplexNoise(noiseCoord);
          sampleDisp.y = simplexNoise(noiseCoord + vec2(100.0));
        } else if (uMapSource < 1.5) {
          vec2 noiseCoord = sampleUv * uScale + uSeed + timeOffset;
          sampleDisp.x = perlinNoise(noiseCoord);
          sampleDisp.y = perlinNoise(noiseCoord + vec2(100.0));
        } else {
          sampleDisp = displacement; // Luma mode doesn't need re-sampling
        }

        smoothedDisplacement += sampleDisp * weight;
        totalWeight += weight;
      }
    }

    displacement = smoothedDisplacement / totalWeight;
  }

  // Normalize displacement to -0.5 to 0.5 range
  displacement = (displacement - 0.5);

  // Apply separate X/Y intensity
  displacement.x *= uIntensityX * 0.1;
  displacement.y *= uIntensityY * 0.1;

  // Apply displacement to UV
  uv += displacement;

  // Sample with edge behavior
  gl_FragColor = sampleWithEdgeBehavior(uTexture, uv);
}
