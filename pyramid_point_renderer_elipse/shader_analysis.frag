/* Analysis step */
#version 120

#extension GL_ARB_draw_buffers : enable
//#version 120

const float PI = 3.1416;

// flag for depth test on/off
uniform bool depth_test;

// one over 2 * fbo size
uniform vec2 oo_2fbo_size;

// size of half a pixel
uniform float half_pixel_size;

uniform float reconstruction_filter_size;
uniform float prefilter_size;

uniform sampler2D textureA;
uniform sampler2D textureB;
uniform sampler2D textureC;

vec2 gather_pixel_desloc[4] = vec2[4](vec2(-half_pixel_size, -half_pixel_size),
									  vec2(half_pixel_size, -half_pixel_size),
									  vec2(-half_pixel_size, half_pixel_size),
									  vec2(half_pixel_size, half_pixel_size));

// tests if a point is inside an ellipse.
// Ellipse is centered at origin and point displaced by d.
// Radius is the half the ellipse's major axis.
// Minor axis is computed by normal direction.
float pointInEllipse(in vec2 d, in float major_axis_length, in float minor_axis_length, in vec3 major_axis, in vec3 minor_axis){
  float len = length(minor_axis.xy);

  if (len == 0.0)
    minor_axis.y = 0.0;
  else
    minor_axis.y /= len;

  // angle between minor_axis and z direction
  float angle = acos(minor_axis.y);
  if (minor_axis.x > 0.0)
    angle *= -1.0;

  float cos_angle = minor_axis.y;
  float sin_angle = sin(angle);

  // rotate point to ellipse coordinate system
  vec2 rotated_pos = vec2(d.x*cos_angle + d.y*sin_angle,
						  -d.x*sin_angle + d.y*cos_angle);

  // major and minor axis
  float a = 1.0*major_axis_length;
  float b = 1.0*minor_axis_length;

  // include antialiasing filter
  a += prefilter_size;
  b += prefilter_size;

  // inside ellipse test
  float test = ((rotated_pos.x*rotated_pos.x)/(a*a)) + ((rotated_pos.y*rotated_pos.y)/(b*b));

  if (test <= reconstruction_filter_size)
    return test;
  else return -1.0;
}

void main (void) {

  vec2 tex_coord[4];
  
  vec4 bufferA = vec4(0.0, 0.0, 0.0, 0.0);
  vec4 bufferB = vec4(0.0, 0.0, 0.0, 0.0);
  vec4 bufferC = vec4(0.0, 0.0, 0.0, 0.0);

  float valid_pixels = 0.0;

  vec4 pixelA[4], pixelB[4], pixelC[4];

  //up-right
  tex_coord[0].st = gl_TexCoord[0].st + oo_2fbo_size.st;
  //up-left
  tex_coord[1].s = gl_TexCoord[0].s - oo_2fbo_size.s;
  tex_coord[1].t = gl_TexCoord[0].t + oo_2fbo_size.t;
  //down-right
  tex_coord[2].s = gl_TexCoord[0].s + oo_2fbo_size.s;
  tex_coord[2].t = gl_TexCoord[0].t - oo_2fbo_size.t;
  //down-left
  tex_coord[3].st = gl_TexCoord[0].st - oo_2fbo_size.st;

  // Gather pixels values
  for (int i = 0; i < 4; ++i) {
    pixelA[i] = texture2D (textureA, tex_coord[i].st).xyzw; //depth, interval, disp.xy
    pixelB[i] = texture2D (textureB, tex_coord[i].st).xyzw; //minor_axis
    pixelC[i] = texture2D (textureC, tex_coord[i].st).xyzw; //major_axis
  }

  // Compute the front most pixel from lower level (minimum z
  // coordinate)
  float dist_test = 0.0;
  float zmin = 10000.0;
  float zmax = -10000.0;
  float obj_id = -1.0;
  for (int i = 0; i < 4; ++i) {
    if (pixelA[i].w > 0.0) {
      dist_test = pointInEllipse(pixelA[i].zw + gather_pixel_desloc[i].xy, pixelB[i].w, pixelC[i].w, pixelB[i].xyz,
      pixelC[i].xyz);
      //dist_test = pointInCircle(pixelB[i].zw + gather_pixel_desloc[i].xy, pixelA[i].w);
      //dist_test = intersectEllipsePixel (pixelB[i].zw + gather_pixel_desloc[i].xy, pixelA[i].w, pixelA[i].xyz, half_pixel_size*2.0);

	  if  (dist_test != 0.0)
		{
		  // test for minimum depth coordinate of valid ellipses
		  if (pixelA[i].x <= zmin) {
			zmin = pixelA[i].x;
			zmax = zmin + pixelA[i].y;
		  }
		}
      else {
		// if the ellipse does not reach the center ignore it in the averaging
		pixelB[i].w = -1.0;
      }
    }
  }

  float new_zmax = zmax;

  // Gather pixels values
  for (int i = 0; i < 4; ++i)
    {
      // Check if valid gather pixel or unspecified (or ellipse out of reach set above)
      if (pixelB[i].w > 0.0) 
		{
	  	
		  //if (abs(pixelC[i].w - obj_id) < 0.1 )
		  {
			// Depth test between valid in reach ellipses
			if ((!depth_test) || (pixelA[i].x - pixelA[i].y <= zmax))
			  {
				//float w = abs(4.0 * PI * 4.0 * pixelA[i].w * pixelA[i].w * pixelA[i].z);
				float w = 1.0;
				bufferB += pixelB[i] * w;
				bufferC += pixelC[i] * w;

				// Increment ellipse total path with distance from gather pixel to center
				bufferA.zw += (pixelA[i].zw + gather_pixel_desloc[i].xy) * w;	     
	      
				// Take maximum depth range
				new_zmax = max(pixelA[i].x + pixelA[i].y, new_zmax);
	      
				valid_pixels += w;
			  }
		  }
		}
    }

  // average values if there are any valid ellipses
  // otherwise the pixel will be writen as unspecified
  
  if (valid_pixels > 0.0)
    {
      bufferA.x = zmin;
      bufferA.y = new_zmax - zmin;
      bufferA.zw /= valid_pixels;

      bufferB /= valid_pixels;
      bufferB.xyz = normalize(bufferB.xyz);
      bufferC /= valid_pixels;
      bufferC.xyz = normalize(bufferC.xyz);
      
    }

  // first buffer = (depth, max_depth, dx, dy)
  gl_FragData[0] = bufferA;
  // second buffer = minor_axis
  gl_FragData[1] = bufferB;
  // second buffer = major_axis
  gl_FragData[2] = bufferC;
}
