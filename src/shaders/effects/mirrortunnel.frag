precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uDepthLayers; // Number of visible tunnel layers
uniform float uSegments; // Radial mirror divisions
uniform float uSpeed; // Animation speed
uniform float uTwist; // Spiral rotation per depth layer
uniform float uScalePerLayer; // Scale change per layer
uniform float uColorShift; // Color shift per depth layer
uniform float uCenterX; // Center offset X
uniform float uCenterY; // Center offset Y

varying vec2 vUv;

const float PI = 3.14159265359;

void main() {
  vec2 uv = vUv;

  // Apply center offset
  vec2 center = vec2(uCenterX, uCenterY);
  vec2 pos = uv - center;

  // Convert to polar coordinates
  float dist = length(pos);
  float angle = atan(pos.y, pos.x);

  // Create infinite tunnel effect with depth layers
  float timeOffset = uTime * uSpeed;
  float tunnelDepth = 1.0 / (dist + 0.01) - timeOffset;

  // Apply scale per layer
  tunnelDepth *= uScalePerLayer;

  // Get fractional depth for layering
  float layerDepth = fract(tunnelDepth);
  float layerIndex = floor(tunnelDepth);

  // Apply twist (spiral rotation based on depth)
  float twist = layerIndex * uTwist * 0.1;
  angle += twist;

  // Mirror segments
  float segmentCount = max(uSegments, 2.0);
  float segmentAngle = 2.0 * PI / segmentCount;

  // Normalize angle and create mirrored segments
  float normalizedAngle = mod(angle + PI, 2.0 * PI);
  float segmentIndex = floor(normalizedAngle / segmentAngle);
  float angleInSegment = mod(normalizedAngle, segmentAngle);

  // Mirror every other segment
  if (mod(segmentIndex, 2.0) > 0.5) {
    angleInSegment = segmentAngle - angleInSegment;
  }

  // Reconstruct position for tunnel
  float radius = layerDepth * 0.5;
  vec2 tunnelPos = vec2(
    cos(angleInSegment) * radius,
    sin(angleInSegment) * radius
  ) + center;

  // Sample texture
  vec4 color = texture2D(uTexture, tunnelPos);

  // Apply depth-based effects
  float depthFactor = 1.0 - (dist * 0.5);

  // Color shift per layer
  if (uColorShift > 0.01) {
    float hueShift = layerIndex * uColorShift * 0.5;

    // RGB color rotation
    vec3 shiftedColor = vec3(
      color.r * cos(hueShift) - color.g * sin(hueShift),
      color.r * sin(hueShift) + color.g * cos(hueShift),
      color.b
    );

    color.rgb = mix(color.rgb, shiftedColor, uColorShift);
  }

  // Add depth-based brightness variation
  float brightness = 0.7 + 0.3 * cos(layerDepth * PI);
  color.rgb *= brightness * depthFactor;

  // Add layer boundaries glow
  float layerEdge = abs(layerDepth - 0.5) * 2.0;
  layerEdge = 1.0 - smoothstep(0.8, 1.0, layerEdge);

  vec3 edgeGlow = vec3(
    sin(layerIndex + timeOffset) * 0.5 + 0.5,
    sin(layerIndex + timeOffset + 2.0) * 0.5 + 0.5,
    sin(layerIndex + timeOffset + 4.0) * 0.5 + 0.5
  ) * layerEdge * 0.3;

  color.rgb += edgeGlow;

  // Apply segment edge highlights
  float edgeDist = min(angleInSegment, segmentAngle - angleInSegment);
  float segmentEdge = smoothstep(0.0, 0.05, edgeDist);
  color.rgb *= 0.8 + 0.2 * segmentEdge;

  gl_FragColor = color;
}
