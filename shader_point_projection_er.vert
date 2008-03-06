// GLSL CODE

/// 1st Vertex Shader

// Projects points to screen space and rotates normal
// stores output on texture

uniform vec3 eye;
varying vec3 normal_vec_vertex;
varying vec3 radius_depth_w_vertex;

void main(void)
{

  if ( dot(normalize(gl_Vertex.xyz - eye), gl_Normal) < -0.2 ) {

  // back face culling (rotated eye, fixed point)  
    radius_depth_w_vertex.x = 0.0;

    // for some reason seting the vector to vec4(0.0) drops
    // the performance significantly, at least on the GeForce8800 -- RM 2007-10-19
    gl_Position = vec4(1.0);
  }
  else
  {
    // only rotate point and normal if not culled
    vec4 v = gl_ModelViewProjectionMatrix * vec4(gl_Vertex.xyz, 1.0);
   
    normal_vec_vertex = normalize(gl_NormalMatrix * gl_Normal);

    // compute depth value without projection matrix, only modelview
    radius_depth_w_vertex = vec3(gl_Vertex.w, -(gl_ModelViewMatrix * vec4(gl_Vertex.xyz, 1.0)).z, v.w);
    
    // radius_depth_w.z = radius_depth_w.y;

    gl_Position = v;
  }

  gl_FrontColor = gl_Color;
}