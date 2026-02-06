precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uMirrorCount; // 0=None, 1=2x, 2=4x, 3=8x, 4=16x divisions
uniform float uAxisAngle; // Rotation angle of mirror axis in radians
uniform float uOffsetX; // Mirror line offset X
uniform float uOffsetY; // Mirror line offset Y
uniform float uBlendSeams; // Blend amount at mirror boundaries

varying vec2 vUv;

const float PI = 3.14159265359;

// Rotation matrix
mat2 rotate2D(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

void main() {
  vec2 uv = vUv;

  // Apply offset
  vec2 center = vec2(0.5 + uOffsetX, 0.5 + uOffsetY);
  vec2 centeredUv = uv - center;

  // Apply rotation
  centeredUv = rotate2D(uAxisAngle) * centeredUv;

  // Calculate mirror divisions
  int divisions = 1;
  if (uMirrorCount > 3.5) {
    divisions = 16;
  } else if (uMirrorCount > 2.5) {
    divisions = 8;
  } else if (uMirrorCount > 1.5) {
    divisions = 4;
  } else if (uMirrorCount > 0.5) {
    divisions = 2;
  }

  // No mirroring
  if (divisions == 1) {
    gl_FragColor = texture2D(uTexture, uv);
    return;
  }

  // Apply mirroring based on division count
  vec2 mirroredUv = centeredUv;

  if (divisions == 2) {
    // Simple horizontal mirror
    float distToSeam = abs(mirroredUv.x);
    mirroredUv.x = abs(mirroredUv.x);

    // Blend seams
    if (uBlendSeams > 0.01) {
      float blend = smoothstep(0.0, uBlendSeams * 0.1, distToSeam);
      vec2 seamUv = vec2(-mirroredUv.x, mirroredUv.y) + center;
      vec2 currentUv = mirroredUv + center;

      vec4 seamColor = texture2D(uTexture, seamUv);
      vec4 currentColor = texture2D(uTexture, currentUv);

      gl_FragColor = mix(seamColor, currentColor, blend);
      return;
    }

  } else if (divisions == 4) {
    // Quadrant mirroring (both axes)
    float distToSeamX = abs(mirroredUv.x);
    float distToSeamY = abs(mirroredUv.y);
    mirroredUv.x = abs(mirroredUv.x);
    mirroredUv.y = abs(mirroredUv.y);

    // Blend seams
    if (uBlendSeams > 0.01) {
      float blendX = smoothstep(0.0, uBlendSeams * 0.1, distToSeamX);
      float blendY = smoothstep(0.0, uBlendSeams * 0.1, distToSeamY);
      float blend = min(blendX, blendY);

      vec2 currentUv = mirroredUv + center;
      vec4 currentColor = texture2D(uTexture, currentUv);

      // Sample adjacent quadrants for blending
      vec2 seamUvX = vec2(-mirroredUv.x, mirroredUv.y) + center;
      vec2 seamUvY = vec2(mirroredUv.x, -mirroredUv.y) + center;

      vec4 seamColorX = texture2D(uTexture, seamUvX);
      vec4 seamColorY = texture2D(uTexture, seamUvY);

      vec4 blendedColor = mix(mix(seamColorX, seamColorY, 0.5), currentColor, blend);

      gl_FragColor = blendedColor;
      return;
    }

  } else if (divisions == 8) {
    // 8-way radial mirroring
    float angle = atan(mirroredUv.y, mirroredUv.x);
    float radius = length(mirroredUv);

    // Normalize to 45-degree slice
    float sliceAngle = PI / 4.0;
    float normalizedAngle = mod(angle + PI, 2.0 * PI);
    float sliceIndex = floor(normalizedAngle / sliceAngle);
    float angleInSlice = mod(normalizedAngle, sliceAngle);

    // Mirror every other slice
    if (mod(sliceIndex, 2.0) > 0.5) {
      angleInSlice = sliceAngle - angleInSlice;
    }

    // Blend seams
    if (uBlendSeams > 0.01) {
      float distToEdge = min(angleInSlice, sliceAngle - angleInSlice);
      float blend = smoothstep(0.0, uBlendSeams * sliceAngle * 0.5, distToEdge);

      float mirroredAngle = sliceAngle - angleInSlice;
      vec2 mirroredPos = vec2(cos(sliceIndex * sliceAngle + mirroredAngle),
                              sin(sliceIndex * sliceAngle + mirroredAngle)) * radius;
      vec2 currentPos = vec2(cos(sliceIndex * sliceAngle + angleInSlice),
                            sin(sliceIndex * sliceAngle + angleInSlice)) * radius;

      vec4 currentColor = texture2D(uTexture, currentPos + center);
      vec4 mirroredColor = texture2D(uTexture, mirroredPos + center);

      gl_FragColor = mix(mirroredColor, currentColor, blend);
      return;
    }

    mirroredUv = vec2(cos(sliceIndex * sliceAngle + angleInSlice),
                     sin(sliceIndex * sliceAngle + angleInSlice)) * radius;

  } else if (divisions == 16) {
    // 16-way radial mirroring
    float angle = atan(mirroredUv.y, mirroredUv.x);
    float radius = length(mirroredUv);

    // Normalize to 22.5-degree slice
    float sliceAngle = PI / 8.0;
    float normalizedAngle = mod(angle + PI, 2.0 * PI);
    float sliceIndex = floor(normalizedAngle / sliceAngle);
    float angleInSlice = mod(normalizedAngle, sliceAngle);

    // Mirror every other slice
    if (mod(sliceIndex, 2.0) > 0.5) {
      angleInSlice = sliceAngle - angleInSlice;
    }

    // Blend seams
    if (uBlendSeams > 0.01) {
      float distToEdge = min(angleInSlice, sliceAngle - angleInSlice);
      float blend = smoothstep(0.0, uBlendSeams * sliceAngle * 0.5, distToEdge);

      float mirroredAngle = sliceAngle - angleInSlice;
      vec2 mirroredPos = vec2(cos(sliceIndex * sliceAngle + mirroredAngle),
                              sin(sliceIndex * sliceAngle + mirroredAngle)) * radius;
      vec2 currentPos = vec2(cos(sliceIndex * sliceAngle + angleInSlice),
                            sin(sliceIndex * sliceAngle + angleInSlice)) * radius;

      vec4 currentColor = texture2D(uTexture, currentPos + center);
      vec4 mirroredColor = texture2D(uTexture, mirroredPos + center);

      gl_FragColor = mix(mirroredColor, currentColor, blend);
      return;
    }

    mirroredUv = vec2(cos(sliceIndex * sliceAngle + angleInSlice),
                     sin(sliceIndex * sliceAngle + angleInSlice)) * radius;
  }

  // Rotate back and re-center
  vec2 finalUv = mirroredUv + center;

  gl_FragColor = texture2D(uTexture, finalUv);
}
