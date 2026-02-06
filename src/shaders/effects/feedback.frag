precision highp float;
uniform sampler2D uTexture;
uniform sampler2D uFeedbackTexture; // Previous frame
uniform vec2 uResolution;
uniform float uTime;
uniform float uFeedbackAmount; // Feedback blend strength
uniform float uScale; // Zoom amount per frame
uniform float uRotation; // Rotation per frame
uniform float uOffsetX; // X offset per frame
uniform float uOffsetY; // Y offset per frame
uniform float uDecay; // Color decay factor
uniform float uBlendMode; // 0=Normal, 1=Add, 2=Multiply, 3=Screen
uniform float uStabilization; // Prevent runaway noise

varying vec2 vUv;

const float PI = 3.14159265359;

// Blend modes
vec3 blendNormal(vec3 base, vec3 blend, float opacity) {
  return mix(base, blend, opacity);
}

vec3 blendAdd(vec3 base, vec3 blend, float opacity) {
  return base + blend * opacity;
}

vec3 blendMultiply(vec3 base, vec3 blend, float opacity) {
  return mix(base, base * blend, opacity);
}

vec3 blendScreen(vec3 base, vec3 blend, float opacity) {
  vec3 result = vec3(1.0) - (vec3(1.0) - base) * (vec3(1.0) - blend);
  return mix(base, result, opacity);
}

void main() {
  vec2 uv = vUv;
  vec2 center = vec2(0.5, 0.5);

  // Transform for feedback
  vec2 feedbackUv = uv - center;

  // Apply rotation
  float angle = uRotation * 0.1;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  feedbackUv = rot * feedbackUv;

  // Apply scale
  feedbackUv *= uScale;

  // Apply offset
  feedbackUv += vec2(uOffsetX, uOffsetY) * 0.1;

  // Back to screen space
  feedbackUv += center;

  // Sample current frame
  vec4 current = texture2D(uTexture, uv);

  // Sample previous frame with transform
  vec4 feedback = texture2D(uFeedbackTexture, feedbackUv);

  // Apply decay to feedback
  feedback.rgb *= uDecay;

  // Stabilization - clamp extreme values
  if (uStabilization > 0.5) {
    float brightness = dot(feedback.rgb, vec3(0.299, 0.587, 0.114));
    if (brightness > 2.0 || brightness < 0.01) {
      feedback.rgb *= 0.5;
    }
  }

  // Apply blend mode
  vec3 blended;
  if (uBlendMode < 0.5) {
    // Normal blend
    blended = blendNormal(current.rgb, feedback.rgb, uFeedbackAmount);
  } else if (uBlendMode < 1.5) {
    // Add blend
    blended = blendAdd(current.rgb, feedback.rgb, uFeedbackAmount);
  } else if (uBlendMode < 2.5) {
    // Multiply blend
    blended = blendMultiply(current.rgb, feedback.rgb, uFeedbackAmount);
  } else {
    // Screen blend
    blended = blendScreen(current.rgb, feedback.rgb, uFeedbackAmount);
  }

  gl_FragColor = vec4(blended, current.a);
}
