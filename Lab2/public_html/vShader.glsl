#version 300 es
// Vertex shader

in vec3 vPosition;  // position of vertex (x, y, z)
in vec3 vColor;     // color of vertex (r, g, b)

out vec3 fColor;    // output color to send to fragment shader

void main() {
  gl_Position = vec4(vPosition, 1); // set vertex position (x, y, z, w)
  gl_PointSize = 20.0;              // set size of points drawn
  fColor = vColor;                  // output color to fragment shader
}
