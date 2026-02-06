precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uCellSizeX;
uniform float uCellSizeY;
uniform float uShape; // 0=Square, 1=Circle, 2=Hex
uniform float uAlignment; // 0=Screen, 1=Centered
uniform float uColorSampling; // 0=Average, 1=Nearest
uniform float uJitter; // Cell jitter amount

varying vec2 vUv;

const float PI = 3.14159265359;

// Pseudo-random function
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Hexagonal grid coordinates
vec2 hexCoord(vec2 p, float size) {
  const float sqrt3 = 1.732050808;
  vec2 hex;
  hex.x = p.x * 2.0 / 3.0 / size;
  hex.y = (-p.x / 3.0 + sqrt3 / 3.0 * p.y) / size;
  return hex;
}

vec2 hexRound(vec2 h) {
  const float sqrt3 = 1.732050808;
  vec2 r = floor(h + 0.5);
  vec2 f = h - r;
  if (abs(f.x) >= abs(f.y)) {
    r.x = r.x + f.x;
  } else {
    r.y = r.y + f.y;
  }
  return r;
}

vec2 hexToPixel(vec2 h, float size) {
  const float sqrt3 = 1.732050808;
  vec2 p;
  p.x = size * 3.0 / 2.0 * h.x;
  p.y = size * sqrt3 * (h.y + h.x / 2.0);
  return p;
}

void main() {
  vec2 cellSize = vec2(uCellSizeX, uCellSizeY) / uResolution;

  // Apply alignment offset
  vec2 uv = vUv;
  if (uAlignment > 0.5) {
    // Centered alignment
    uv -= 0.5;
    uv = floor(uv / cellSize) * cellSize;
    uv += 0.5;
  }

  // Calculate cell coordinate
  vec2 cellCoord;

  if (uShape < 0.5) {
    // Square cells
    cellCoord = floor(uv / cellSize) * cellSize;

    // Apply jitter
    if (uJitter > 0.0) {
      vec2 cellId = floor(uv / cellSize);
      vec2 jitterOffset = vec2(
        random(cellId) * 2.0 - 1.0,
        random(cellId + vec2(1.0)) * 2.0 - 1.0
      ) * cellSize * uJitter * 0.5;

      // Animated jitter
      float timeOffset = sin(uTime * 2.0 + random(cellId) * 6.28) * 0.5 + 0.5;
      jitterOffset *= timeOffset;

      cellCoord += jitterOffset;
    }

  } else if (uShape < 1.5) {
    // Circular cells (grid is still square, but sample in circle shape)
    cellCoord = floor(uv / cellSize) * cellSize;

    // Check if pixel is within circle
    vec2 cellCenter = cellCoord + cellSize * 0.5;
    vec2 toCellCenter = uv - cellCenter;
    float dist = length(toCellCenter);
    float radius = min(cellSize.x, cellSize.y) * 0.5;

    if (dist > radius) {
      // Outside circle - show adjacent cell color
      vec2 adjacent = floor((cellCenter + normalize(toCellCenter) * cellSize) / cellSize) * cellSize;
      cellCoord = adjacent;
    }

  } else {
    // Hexagonal cells
    float hexSize = min(uCellSizeX, uCellSizeY) * 0.5;
    vec2 pixelCoord = uv * uResolution;
    vec2 hexGrid = hexCoord(pixelCoord, hexSize);
    vec2 hexIndex = hexRound(hexGrid);
    vec2 hexPixel = hexToPixel(hexIndex, hexSize);
    cellCoord = hexPixel / uResolution;
  }

  // Clamp to valid texture coordinates
  cellCoord = clamp(cellCoord, vec2(0.0), vec2(1.0));

  // Sample color
  vec4 color;

  if (uColorSampling < 0.5) {
    // Average sampling - sample multiple points in cell
    color = vec4(0.0);
    int samples = 4;
    for (int x = 0; x < 2; x++) {
      for (int y = 0; y < 2; y++) {
        vec2 offset = (vec2(float(x), float(y)) / 2.0) * cellSize;
        color += texture2D(uTexture, cellCoord + offset);
      }
    }
    color /= float(samples);
  } else {
    // Nearest sampling - single point at cell center
    vec2 centerOffset = cellSize * 0.5;
    color = texture2D(uTexture, cellCoord + centerOffset);
  }

  gl_FragColor = color;
}
