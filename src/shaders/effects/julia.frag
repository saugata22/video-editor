precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uIterations; // Maximum iterations (quality)
uniform float uZoom; // Zoom level
uniform float uPanX; // Pan X position
uniform float uPanY; // Pan Y position
uniform float uConstantX; // Julia set constant C (real part)
uniform float uConstantY; // Julia set constant C (imaginary part)
uniform float uColorMode; // 0=Smooth, 1=Banded, 2=Orbit trap
uniform float uVideoInfluence; // How much video texture affects the fractal
uniform float uRotation; // Rotation angle

varying vec2 vUv;

const float PI = 3.14159265359;

// Calculate Julia set with smooth iteration count
float juliaSmooth(vec2 z, vec2 c, int maxIter) {
  float smoothIter = 0.0;

  for (int i = 0; i < 200; i++) {
    if (i >= maxIter) break;

    float zSq = dot(z, z);
    if (zSq > 256.0) {
      // Smooth iteration count for continuous coloring
      smoothIter = float(i) - log2(log2(zSq)) + 4.0;
      break;
    }

    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;

    if (i == maxIter - 1) {
      smoothIter = float(maxIter);
    }
  }

  return smoothIter;
}

// Calculate orbit trap for Julia set
vec2 juliaOrbitTrap(vec2 z, vec2 c, int maxIter) {
  float minDist = 1000.0;
  vec2 trapPoint = vec2(0.0);

  for (int i = 0; i < 200; i++) {
    if (i >= maxIter) break;

    float zSq = dot(z, z);
    if (zSq > 256.0) break;

    // Track closest approach to origin
    float dist = length(z);
    if (dist < minDist) {
      minDist = dist;
      trapPoint = z;
    }

    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
  }

  return trapPoint;
}

// Rotation matrix
mat2 rotate2D(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

void main() {
  vec2 uv = vUv;

  // Apply rotation to UV
  vec2 centeredUv = uv - 0.5;
  centeredUv = rotate2D(uRotation) * centeredUv;
  centeredUv += 0.5;

  // Transform to complex plane with zoom and pan
  vec2 z = (centeredUv - 0.5) / uZoom;
  z += vec2(uPanX, uPanY);

  // Julia set constant parameter
  vec2 c = vec2(uConstantX, uConstantY);

  int maxIter = int(clamp(uIterations, 10.0, 200.0));

  if (uColorMode < 0.5) {
    // Smooth iteration coloring - map video INTO fractal space
    float iter = juliaSmooth(z, c, maxIter);
    float t = iter / float(maxIter);

    // Map the fractal iteration space to video texture coordinates
    // This creates the effect of video pixels being "inside" the fractal
    vec2 videoUv = vec2(
      fract(t * 3.0 + z.x * 0.5),
      fract(t * 5.0 + z.y * 0.5)
    );

    // Sample video at fractal-determined position
    vec4 videoColor = texture2D(uTexture, videoUv);

    // Modulate video color by fractal structure
    float fractalMask = smoothstep(0.0, 1.0, t);
    vec3 finalColor = videoColor.rgb;

    // Apply fractal-based color shift
    finalColor *= vec3(
      0.5 + 0.5 * sin(t * 2.0 * PI),
      0.5 + 0.5 * sin(t * 2.0 * PI + 2.0),
      0.5 + 0.5 * sin(t * 2.0 * PI + 4.0)
    );

    // Blend with original video based on influence
    vec4 originalVideo = texture2D(uTexture, uv);
    finalColor = mix(originalVideo.rgb, finalColor, uVideoInfluence);

    gl_FragColor = vec4(finalColor, 1.0);

  } else if (uColorMode < 1.5) {
    // Banded iteration coloring
    float iter = juliaSmooth(z, c, maxIter);
    float t = iter / float(maxIter);

    // Create distinct bands
    float bands = floor(t * 10.0) / 10.0;

    // Map video UV based on band position
    vec2 videoUv = vec2(
      fract(bands * 2.0 + z.x * 0.3),
      fract(bands * 3.0 + z.y * 0.3)
    );

    vec4 videoColor = texture2D(uTexture, videoUv);

    // Apply banded coloring
    vec3 bandColor = vec3(
      step(0.5, fract(bands * 3.0)),
      step(0.5, fract(bands * 5.0)),
      step(0.5, fract(bands * 7.0))
    );

    vec3 finalColor = videoColor.rgb * (bandColor * 0.5 + 0.5);

    vec4 originalVideo = texture2D(uTexture, uv);
    finalColor = mix(originalVideo.rgb, finalColor, uVideoInfluence);

    gl_FragColor = vec4(finalColor, 1.0);

  } else {
    // Orbit trap coloring - video mapped to orbit trajectory
    vec2 trapPoint = juliaOrbitTrap(z, c, maxIter);

    // Use orbit trap point to sample video
    vec2 videoUv = vec2(
      fract(trapPoint.x * 0.5 + 0.5),
      fract(trapPoint.y * 0.5 + 0.5)
    );

    vec4 videoColor = texture2D(uTexture, videoUv);

    // Create psychedelic effect based on orbit distance
    float orbitDist = length(trapPoint);
    vec3 orbitColor = vec3(
      sin(orbitDist * 10.0) * 0.5 + 0.5,
      sin(orbitDist * 10.0 + 2.0) * 0.5 + 0.5,
      sin(orbitDist * 10.0 + 4.0) * 0.5 + 0.5
    );

    vec3 finalColor = videoColor.rgb * orbitColor;

    vec4 originalVideo = texture2D(uTexture, uv);
    finalColor = mix(originalVideo.rgb, finalColor, uVideoInfluence);

    gl_FragColor = vec4(finalColor, 1.0);
  }
}
