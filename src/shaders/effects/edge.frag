precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uIntensity;
uniform float uThickness;
uniform float uTime;
varying vec2 vUv;

// Sobel edge detection
void main() {
  vec2 texelSize = 1.0 / uResolution;

  // Sample surrounding pixels
  float tl = length(texture2D(uTexture, vUv + vec2(-texelSize.x, texelSize.y)).rgb);
  float t  = length(texture2D(uTexture, vUv + vec2(0.0, texelSize.y)).rgb);
  float tr = length(texture2D(uTexture, vUv + vec2(texelSize.x, texelSize.y)).rgb);
  float l  = length(texture2D(uTexture, vUv + vec2(-texelSize.x, 0.0)).rgb);
  float r  = length(texture2D(uTexture, vUv + vec2(texelSize.x, 0.0)).rgb);
  float bl = length(texture2D(uTexture, vUv + vec2(-texelSize.x, -texelSize.y)).rgb);
  float b  = length(texture2D(uTexture, vUv + vec2(0.0, -texelSize.y)).rgb);
  float br = length(texture2D(uTexture, vUv + vec2(texelSize.x, -texelSize.y)).rgb);

  // Sobel operator
  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;

  float edge = length(vec2(gx, gy)) * uThickness;
  edge = smoothstep(0.5 - uIntensity * 0.5, 0.5 + uIntensity * 0.5, edge);

  vec4 color = texture2D(uTexture, vUv);

  // Mix original with edge detection
  gl_FragColor = vec4(mix(color.rgb, vec3(edge), uIntensity), color.a);
}
