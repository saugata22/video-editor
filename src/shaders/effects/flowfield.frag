precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uFieldType; // 0=Curl, 1=Radial, 2=Spiral, 3=Vortex, 4=Sine Wave
uniform float uIntensity; // Flow strength
uniform float uViscosity; // Flow persistence/smoothing
uniform float uIterations; // Multi-pass iterations (1-20)
uniform float uScale; // Field scale/frequency
uniform float uSpeed; // Time evolution speed
uniform float uAttractorCount; // 0-4 attractor points
uniform float uAttractorX1; // First attractor X position
uniform float uAttractorY1; // First attractor Y position
uniform float uAttractorStrength1; // First attractor strength
uniform float uSeed; // Random seed

varying vec2 vUv;

const float PI = 3.14159265359;

// Helper functions for noise (for curl field)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

// Simplex noise
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

// Curl noise (derivative-based flow field)
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

// Calculate flow vector based on field type
vec2 calculateFlowVector(vec2 uv, float time) {
  vec2 flow = vec2(0.0);
  vec2 center = vec2(0.5, 0.5);
  vec2 toCenter = uv - center;
  float dist = length(toCenter);
  float angle = atan(toCenter.y, toCenter.x);

  if (uFieldType < 0.5) {
    // Curl Noise Field
    vec2 noiseCoord = uv * uScale + uSeed;
    flow = curlNoise(noiseCoord + time);

  } else if (uFieldType < 1.5) {
    // Radial Field (outward from center)
    if (dist > 0.001) {
      flow = normalize(toCenter);
    }

  } else if (uFieldType < 2.5) {
    // Spiral Field
    float spiralAngle = angle + dist * uScale;
    flow = vec2(cos(spiralAngle), sin(spiralAngle));

  } else if (uFieldType < 3.5) {
    // Vortex Field (rotation around center)
    flow = vec2(-toCenter.y, toCenter.x);
    if (dist > 0.001) {
      flow = normalize(flow);
    }
    // Strength based on distance
    flow *= (1.0 - smoothstep(0.0, 0.5, dist));

  } else {
    // Sine Wave Field
    float waveX = sin(uv.y * uScale + time);
    float waveY = cos(uv.x * uScale - time);
    flow = vec2(waveX, waveY);
  }

  return flow;
}

// Add attractor influence
vec2 addAttractorInfluence(vec2 uv, vec2 currentFlow) {
  vec2 attractorInfluence = vec2(0.0);

  if (uAttractorCount > 0.5) {
    // First attractor
    vec2 attractorPos = vec2(uAttractorX1, uAttractorY1);
    vec2 toAttractor = attractorPos - uv;
    float dist = length(toAttractor);

    if (dist > 0.001) {
      vec2 attractorDir = normalize(toAttractor);
      float falloff = 1.0 / (1.0 + dist * 5.0);
      attractorInfluence += attractorDir * uAttractorStrength1 * falloff;
    }

    // Could add more attractors here (uAttractorX2, uAttractorY2, etc.)
    // For now, one attractor to keep parameter count manageable
  }

  return currentFlow + attractorInfluence;
}

void main() {
  vec2 uv = vUv;
  float timeOffset = uTime * uSpeed;

  // Multi-pass flow following
  int iterations = int(clamp(uIterations, 1.0, 20.0));
  vec2 flowUv = uv;
  vec2 accumulatedFlow = vec2(0.0);

  for (int i = 0; i < 20; i++) {
    if (i >= iterations) break;

    float t = float(i) / max(float(iterations), 1.0);

    // Calculate flow vector at current position
    vec2 flowVector = calculateFlowVector(flowUv, timeOffset + t);

    // Add attractor influence
    flowVector = addAttractorInfluence(flowUv, flowVector);

    // Normalize and scale
    if (length(flowVector) > 0.001) {
      flowVector = normalize(flowVector);
    }

    // Apply viscosity (flow persistence from previous iterations)
    if (i > 0) {
      flowVector = mix(flowVector, normalize(accumulatedFlow), uViscosity);
    }

    // Accumulate flow
    accumulatedFlow += flowVector;

    // Step along flow field
    float stepSize = uIntensity * 0.01 / max(float(iterations), 1.0);
    flowUv += flowVector * stepSize;
  }

  // Sample texture at final position
  gl_FragColor = texture2D(uTexture, flowUv);
}
