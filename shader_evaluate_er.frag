/* Synthesis step */

#extension GL_ARB_draw_buffers : enable
//#version 120

const float pi = 3.1416;

const float reduc_factor = 1.0;

// flag for depth test on/off
//uniform bool depth_test;

uniform float reconstruction_filter_size;
uniform float prefilter_size;

uniform vec2 displacement;

uniform sampler2D textureA;
uniform sampler2D textureB;

// tests if a point is inside a circle.
// Circle is centered at origin, and point is
// displaced by param d.
float pointInCircle(in vec2 d, in float radius){
  float sqrt_len = d.x*d.x + d.y*d.y;

  radius *= 2.0;
  radius += prefilter_size;

  float dif = sqrt_len / (radius*radius);

  if (dif <= reconstruction_filter_size)
    return dif;
  else return -1.0;
}

// tests if a point is inside an ellipse.
// Ellipse is centered at origin and point displaced by d.
// Radius is the half the ellipse's major axis.
// Minor axis is computed by normal direction.
// @param d Difference vector from center of ellipse to point.
// @param radius Ellipse major axis length * 0.5.
// @param normal Normal vector.
float pointInEllipse(in vec2 d, in float radius, in vec3 normal){
  float len = length(normal.xy);

  if (len == 0.0)
    normal.y = 0.0;
  else
    normal.y /= len;

  // angle between normal and z direction
  float angle = acos(normal.y);
  if (normal.x > 0.0)
    angle *= -1.0;

  // rotate point to ellipse coordinate system
  vec2 rotated_pos = vec2(d.x*cos(angle) + d.y*sin(angle),
			  -d.x*sin(angle) + d.y*cos(angle));

  // major and minor axis
  float a = 2.0*radius;
  float b = a*normal.z;

  // include antialiasing filter (increase both axis)
  a += prefilter_size;
  b += prefilter_size;

  // inside ellipse test
  float test = ((rotated_pos.x*rotated_pos.x)/(a*a)) + ((rotated_pos.y*rotated_pos.y)/(b*b));

  if (test <= reconstruction_filter_size)
    return test;
  else return -1.0;
}

void main (void) {

  // retrieve candidadte ellipse from displacement position
  vec4 pixelA = texture2D (textureA, gl_TexCoord[0].st + displacement.xy).xyzw;

  // retrieve actual pixel with current values
  vec4 buffer = texture2D (textureB, gl_TexCoord[0].st).xyzw;

  // if pixel from displacement position is a projected surfel, check if current
  // pixel is inside its radius
  if (pixelA.w > 0.0) {

    // if no displacement just use projected point values
    if (displacement.xy == vec2(0.0, 0.0)){       
      buffer = vec4(texture2D (textureA, gl_TexCoord[0].st).xyz, reduc_factor);
      buffer.z *= reduc_factor;
    }
    else {
      // convert from spherical coordinates
      pixelA.xy *= vec2(2.0*pi, pi);
      vec3 normal = vec3 (cos(pixelA.x)*sin(pixelA.y), sin(pixelA.x)*sin(pixelA.y), cos(pixelA.y));

      float dist_test = pointInEllipse(displacement.xy, pixelA.w, normal);
      //float dist_test = pointInCircle(displacement.xy, pixelA.w);
	
      // Ellipse in range
      if (dist_test > 0.0) {

	// empty pixel
/* 	if (buffer.w == 0.0) { */
/* 	  buffer = vec4(pixelA.xy, pixelA.z*reduc_factor, reduc_factor); */
/* 	} */
/* 	// sum contribution to current values */
/* 	else  */
	{
	  float weight = exp(-0.5*dist_test)*reduc_factor;
	  buffer.xy *= vec2(2.0*pi, pi);
	  vec3 curr_normal = vec3 (cos(buffer.x)*sin(buffer.y), sin(buffer.x)*sin(buffer.y), cos(buffer.y));

	  curr_normal *= buffer.w;
	  curr_normal += normal * weight;

	  curr_normal = normalize( curr_normal );
	  float theta = atan( curr_normal.y / curr_normal.x );
	  float phi = acos( curr_normal.z );

	  buffer = vec4(theta/(2.0*pi), phi/pi, buffer.z+pixelA.z*weight, buffer.w+weight);
	}
      }
    }
  }
  gl_FragColor = buffer;
}