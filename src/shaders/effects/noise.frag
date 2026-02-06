precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uNoiseType; // 0=Simplex, 1=Perlin, 2=Curl, 3=Value
uniform float uScale; // Noise scale
uniform float uIntensity; // Distortion intensity
uniform float uTimeSpeed; // Time evolution speed
uniform float uAxisLock; // 0=both, 1=X only, 2=Y only
uniform float uSeed; // Noise seed

varying vec2 vUv;

// Helper functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

// Random function with seed
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

// Curl Noise (derivative of noise)
vec2 curlNoise(vec2 p) {
  float eps = 0.01;

  // Sample noise at offset positions
  float n1 = simplexNoise(p + vec2(0.0, eps));
  float n2 = simplexNoise(p - vec2(0.0, eps));
  float n3 = simplexNoise(p + vec2(eps, 0.0));
  float n4 = simplexNoise(p - vec2(eps, 0.0));

  // Calculate derivatives
  float dx = (n3 - n4) / (2.0 * eps);
  float dy = (n1 - n2) / (2.0 * eps);

  // Return curl (perpendicular to gradient)
  return vec2(-dy, dx);
}

void main() {
  vec2 uv = vUv;

  // Apply seed and time
  float timeOffset = uTime * uTimeSpeed;
  vec2 noiseCoord = uv * uScale + uSeed + timeOffset;

  // Calculate noise displacement
  vec2 displacement = vec2(0.0);

  if (uNoiseType < 0.5) {
    // Simplex Noise
    float noise = simplexNoise(noiseCoord);
    displacement = vec2(noise, simplexNoise(noiseCoord + 100.0));

  } else if (uNoiseType < 1.5) {
    // Perlin Noise
    float noise = perlinNoise(noiseCoord);
    displacement = vec2(noise, perlinNoise(noiseCoord + 100.0));

  } else if (uNoiseType < 2.5) {
    // Curl Noise
    displacement = curlNoise(noiseCoord);

  } else {
    // Value Noise
    float noise = valueNoise(noiseCoord);
    displacement = vec2(noise, valueNoise(noiseCoord + 100.0));
  }

  // Apply axis lock
  if (uAxisLock > 0.5 && uAxisLock < 1.5) {
    // X only
    displacement.y = 0.0;
  } else if (uAxisLock > 1.5) {
    // Y only
    displacement.x = 0.0;
  }

  // Apply displacement
  displacement *= uIntensity * 0.05;
  uv += displacement;

  gl_FragColor = texture2D(uTexture, uv);
}
