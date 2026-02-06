precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uDotShape; // 0=Circle, 1=Line, 2=Cross
uniform float uFrequency; // Dot frequency
uniform float uAngleC; // Cyan angle
uniform float uAngleM; // Magenta angle
uniform float uAngleY; // Yellow angle
uniform float uAngleK; // Black (Key) angle
uniform float uInkSpread; // Ink spread amount
uniform float uThreshold; // Threshold curve

varying vec2 vUv;

const float PI = 3.14159265359;

// Rotation matrix
mat2 rotate2D(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

// RGB to CMYK conversion
vec4 rgbToCmyk(vec3 rgb) {
  float k = 1.0 - max(max(rgb.r, rgb.g), rgb.b);
  vec3 cmy = vec3(0.0);
  if (k < 1.0) {
    cmy = (vec3(1.0) - rgb - k) / (1.0 - k);
  }
  return vec4(cmy, k);
}

// CMYK to RGB conversion
vec3 cmykToRgb(vec4 cmyk) {
  vec3 cmy = cmyk.rgb * (1.0 - cmyk.a) + cmyk.a;
  return vec3(1.0) - cmy;
}

// Halftone dot shape functions
float circleDot(vec2 p, float size) {
  return 1.0 - smoothstep(size - 0.1, size, length(p));
}

float lineDot(vec2 p, float size) {
  return 1.0 - smoothstep(size - 0.05, size, abs(p.y));
}

float crossDot(vec2 p, float size) {
  float horizontal = 1.0 - smoothstep(size - 0.05, size, abs(p.y));
  float vertical = 1.0 - smoothstep(size - 0.05, size, abs(p.x));
  return max(horizontal, vertical);
}

// Generate halftone for a single channel
float halftoneChannel(vec2 uv, float angle, float value) {
  // Rotate coordinates
  vec2 rotatedUv = rotate2D(angle) * (uv - 0.5) + 0.5;

  // Scale by frequency
  vec2 gridUv = rotatedUv * uResolution / uFrequency;
  vec2 gridPos = fract(gridUv) - 0.5;

  // Apply threshold curve (gamma correction to value)
  float adjustedValue = pow(value, uThreshold);

  // Calculate dot size based on value and ink spread
  float dotSize = adjustedValue * 0.5 * (1.0 + uInkSpread);

  // Generate dot based on shape
  float dot = 0.0;
  if (uDotShape < 0.5) {
    dot = circleDot(gridPos, dotSize);
  } else if (uDotShape < 1.5) {
    dot = lineDot(gridPos, dotSize);
  } else {
    dot = crossDot(gridPos, dotSize);
  }

  return dot;
}

void main() {
  vec4 color = texture2D(uTexture, vUv);

  // Convert to CMYK
  vec4 cmyk = rgbToCmyk(color.rgb);

  // Generate halftone for each channel with different angles
  float cHalftone = halftoneChannel(vUv, uAngleC, cmyk.r);
  float mHalftone = halftoneChannel(vUv, uAngleM, cmyk.g);
  float yHalftone = halftoneChannel(vUv, uAngleY, cmyk.b);
  float kHalftone = halftoneChannel(vUv, uAngleK, cmyk.a);

  // Reconstruct CMYK with halftone
  vec4 halftoneCmyk = vec4(
    1.0 - cHalftone,
    1.0 - mHalftone,
    1.0 - yHalftone,
    1.0 - kHalftone
  );

  // Convert back to RGB
  vec3 halftoneRgb = cmykToRgb(halftoneCmyk);

  gl_FragColor = vec4(halftoneRgb, color.a);
}
