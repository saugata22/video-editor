// Pixelate effect
uniform sampler2D tDiffuse;
uniform float pixelSize; // 1.0 to 50.0
varying vec2 vUv;

void main() {
  vec2 texSize = vec2(textureSize(tDiffuse, 0));
  vec2 pixelatedUv = floor(vUv * texSize / pixelSize) * pixelSize / texSize;
  gl_FragColor = texture2D(tDiffuse, pixelatedUv);
}
