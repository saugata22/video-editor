precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec3 uKeyColor; // Color to remove (default green)
uniform float uThreshold;
uniform float uSmoothness;
uniform float uTime;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(uTexture, vUv);

  // Calculate distance from key color
  vec3 diff = color.rgb - uKeyColor;
  float distance = length(diff);

  // Create alpha mask based on distance
  float alpha = smoothstep(uThreshold - uSmoothness, uThreshold + uSmoothness, distance);

  gl_FragColor = vec4(color.rgb, color.a * alpha);
}
