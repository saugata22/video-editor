precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uLevelsR; // Red channel levels
uniform float uLevelsG; // Green channel levels
uniform float uLevelsB; // Blue channel levels
uniform float uMode; // 0=RGB, 1=Luma
uniform float uDitheringType; // 0=None, 1=Bayer, 2=Noise
uniform float uDitherIntensity; // Dither strength

varying vec2 vUv;

// Pseudo-random function
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Bayer matrix 8x8
float bayer8x8(vec2 pos) {
  const mat4 bayerMatrix = mat4(
    0.0, 32.0, 8.0, 40.0,
    48.0, 16.0, 56.0, 24.0,
    12.0, 44.0, 4.0, 36.0,
    60.0, 28.0, 52.0, 20.0
  );

  int x = int(mod(pos.x, 4.0));
  int y = int(mod(pos.y, 4.0));

  float value = 0.0;
  if (y == 0) {
    if (x == 0) value = bayerMatrix[0][0];
    else if (x == 1) value = bayerMatrix[0][1];
    else if (x == 2) value = bayerMatrix[0][2];
    else value = bayerMatrix[0][3];
  } else if (y == 1) {
    if (x == 0) value = bayerMatrix[1][0];
    else if (x == 1) value = bayerMatrix[1][1];
    else if (x == 2) value = bayerMatrix[1][2];
    else value = bayerMatrix[1][3];
  } else if (y == 2) {
    if (x == 0) value = bayerMatrix[2][0];
    else if (x == 1) value = bayerMatrix[2][1];
    else if (x == 2) value = bayerMatrix[2][2];
    else value = bayerMatrix[2][3];
  } else {
    if (x == 0) value = bayerMatrix[3][0];
    else if (x == 1) value = bayerMatrix[3][1];
    else if (x == 2) value = bayerMatrix[3][2];
    else value = bayerMatrix[3][3];
  }

  return value / 64.0;
}

// RGB to Luma conversion
float getLuma(vec3 rgb) {
  return dot(rgb, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec4 color = texture2D(uTexture, vUv);
  vec2 pixelCoord = vUv * uResolution;

  // Calculate dither value
  float ditherValue = 0.0;

  if (uDitheringType < 0.5) {
    // No dithering
    ditherValue = 0.0;
  } else if (uDitheringType < 1.5) {
    // Bayer dithering
    ditherValue = (bayer8x8(pixelCoord) - 0.5) * uDitherIntensity;
  } else {
    // Noise dithering
    ditherValue = (random(pixelCoord) - 0.5) * uDitherIntensity;
  }

  vec3 posterized;

  if (uMode < 0.5) {
    // RGB mode - posterize each channel separately
    vec3 dithered = color.rgb + vec3(ditherValue);

    posterized.r = floor(dithered.r * uLevelsR) / uLevelsR;
    posterized.g = floor(dithered.g * uLevelsG) / uLevelsG;
    posterized.b = floor(dithered.b * uLevelsB) / uLevelsB;

  } else {
    // Luma mode - posterize based on luminance
    float luma = getLuma(color.rgb);
    float ditheredLuma = luma + ditherValue;

    // Use average of all channel levels for luma posterization
    float avgLevels = (uLevelsR + uLevelsG + uLevelsB) / 3.0;
    float posterizedLuma = floor(ditheredLuma * avgLevels) / avgLevels;

    // Reconstruct color maintaining hue
    float lumaDiff = posterizedLuma / max(luma, 0.001);
    posterized = color.rgb * lumaDiff;
  }

  gl_FragColor = vec4(posterized, color.a);
}
