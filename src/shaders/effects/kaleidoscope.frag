precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uSegments; // Number of kaleidoscope segments (2-32)
uniform float uRotation; // Rotation angle in radians
uniform float uMode; // 0=Mirror mode, 1=Rotate mode
uniform float uEdgeSoftness; // Softness/blending at segment edges
uniform float uCenterX; // Center offset X
uniform float uCenterY; // Center offset Y
uniform float uZoom; // Zoom/scale factor

varying vec2 vUv;

const float PI = 3.14159265359;

// Rotation matrix
mat2 rotate2D(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

void main() {
  // Apply center offset
  vec2 center = vec2(uCenterX, uCenterY);
  vec2 uv = vUv - center;

  // Apply zoom
  uv /= uZoom;

  // Convert to polar coordinates
  float angle = atan(uv.y, uv.x);
  float radius = length(uv);

  // Apply rotation
  angle += uRotation;

  // Create kaleidoscope segments
  float segmentAngle = 2.0 * PI / max(uSegments, 2.0);

  if (uMode < 0.5) {
    // Mirror Mode - alternating mirror reflections
    // Normalize angle to [0, 2π]
    float normalizedAngle = mod(angle + PI, 2.0 * PI);

    // Find which segment we're in
    float segmentIndex = floor(normalizedAngle / segmentAngle);

    // Get angle within segment
    float angleInSegment = mod(normalizedAngle, segmentAngle);

    // Mirror every other segment
    if (mod(segmentIndex, 2.0) > 0.5) {
      angleInSegment = segmentAngle - angleInSegment;
    }

    // Edge softness blending
    if (uEdgeSoftness > 0.01) {
      // Calculate distance to segment edges
      float distToEdge = min(angleInSegment, segmentAngle - angleInSegment);
      float edgeBlend = smoothstep(0.0, segmentAngle * uEdgeSoftness * 0.5, distToEdge);

      // Sample at mirrored edge
      float mirroredAngle = segmentAngle - angleInSegment;
      vec2 mirroredUv = vec2(cos(segmentIndex * segmentAngle + mirroredAngle),
                             sin(segmentIndex * segmentAngle + mirroredAngle)) * radius + center;

      // Sample at current position
      vec2 currentUv = vec2(cos(segmentIndex * segmentAngle + angleInSegment),
                           sin(segmentIndex * segmentAngle + angleInSegment)) * radius + center;

      vec4 currentColor = texture2D(uTexture, currentUv);
      vec4 mirroredColor = texture2D(uTexture, mirroredUv);

      gl_FragColor = mix(mirroredColor, currentColor, edgeBlend);
      return;
    }

    // No edge softness - standard sharp edges
    angle = segmentIndex * segmentAngle + angleInSegment;

  } else {
    // Rotate Mode - segments rotate without mirroring
    // Wrap angle to first segment only
    float normalizedAngle = mod(angle + PI, 2.0 * PI);
    float angleInFirstSegment = mod(normalizedAngle, segmentAngle);

    // Edge softness blending
    if (uEdgeSoftness > 0.01) {
      // Calculate distance to segment edges
      float distToEdge = min(angleInFirstSegment, segmentAngle - angleInFirstSegment);
      float edgeBlend = smoothstep(0.0, segmentAngle * uEdgeSoftness * 0.5, distToEdge);

      // Sample at next segment edge
      float nextSegmentAngle = mod(angleInFirstSegment + segmentAngle * 0.1, segmentAngle);
      vec2 nextUv = vec2(cos(nextSegmentAngle), sin(nextSegmentAngle)) * radius + center;

      // Sample at current position
      vec2 currentUv = vec2(cos(angleInFirstSegment), sin(angleInFirstSegment)) * radius + center;

      vec4 currentColor = texture2D(uTexture, currentUv);
      vec4 nextColor = texture2D(uTexture, nextUv);

      gl_FragColor = mix(nextColor, currentColor, edgeBlend);
      return;
    }

    angle = angleInFirstSegment;
  }

  // Convert back to cartesian coordinates
  vec2 kaleidoUv = vec2(cos(angle), sin(angle)) * radius + center;

  gl_FragColor = texture2D(uTexture, kaleidoUv);
}
