/*
** point_based_renderer.h Point Based Render header.
**
**
**   history:	created  02-Jul-07
*/


#ifndef __POINT_BASED_RENDERER_H__
#define __POINT_BASED_RENDERER_H__

#include "glslKernel/glslKernel.h"
#include "surfels.h"
#include "pyramid_types.h"
#include "materials.h"
#include "object.h"

class PointBasedRenderer
{
 private:

 public:
  PointBasedRenderer() : window_width(1024), window_height(1024),
    canvas_width(1024), canvas_height(1024),
    material_id(0), depth_test(1), elliptical_weight(1),
    reconstruction_filter_size(1.0), prefilter_size(1.0), use_lod(0), color_per_lod(0)
    {}

  PointBasedRenderer(int w, int h) : window_width(w), window_height(h),
    canvas_width(h), canvas_height(h),
    material_id(0), depth_test(1), elliptical_weight(1),
    reconstruction_filter_size(1.0), prefilter_size(1.0), use_lod(0), color_per_lod(0)
    {}

   virtual ~PointBasedRenderer() {};

   virtual void draw( ) {}
   virtual void draw(int) {}
   virtual void drawNormalsToBuffer ( GLfloat*, int, int ) {}
   virtual void drawPointIdsBuffer ( GLfloat*, int, int ) {}
   virtual void interpolate( ) {}
   virtual void projectSamples(Primitives*) {}
   virtual void projectSamplesIds(Primitives*) {}
   virtual void clearBuffers( ) {}

   virtual void setPrefilterSize(double s) { prefilter_size = s; }
   virtual void setReconstructionFilterSize(double s) { reconstruction_filter_size = s; }

   virtual void getDataProjectedPixels ( int* ) {}

   /** For Ellipse Rasterization **/
   virtual void setCpuMaskSize ( int ) {}
   virtual void setGpuMaskSize ( int ) {}
   virtual void setNumSampleSubdivisions ( int ) {}

   /** For JFA Splatting **/
   virtual void setDistanceType ( int ) {}

   void setEye (Point e) {
     eye = e;
   }
   
   void setLight (double l[3]) {
     light_dir[0] = l[0];
     light_dir[1] = l[1];
     light_dir[2] = l[2];
   }

   void setMaterial (const int m) {
     if (m < NUM_MATERIALS)
       material_id = m;
   }

   const int getMaterial ( void ) {
     return material_id;
   }

   void upMaterial ( void ) {
     ++material_id;
     if (material_id == NUM_MATERIALS)
       material_id = 0;

   }
   void downMaterial ( void ) {
     --material_id;
     if (material_id < 0)
       material_id = NUM_MATERIALS - 1;
   }

   void setDepthTest( const bool d ) {
     depth_test = d;
   }

   void setBackFaceCulling( const bool b ) {
     back_face_culling = b;
   }

   void setEllipticalWeight( const bool w ) {
     elliptical_weight = w;
   }

   virtual void useLOD( const int l ) {
     use_lod = l;
   }

   virtual void useColorPerLOD( const bool c ) {
     color_per_lod = c;
   }

 protected:
   /// Window width.
   GLuint window_width;
   /// Window height.
   GLuint window_height;

   /// Canvas width.
   int canvas_width;
   /// Canvas height.
   int canvas_height;

   /// Light direction vector.
   double light_dir[3];
   /// Eye position.
   Point eye;

   /// Identification of the material from materials.h table.
   int material_id;

   /// Flag to turn on/off depth test
   bool depth_test;

   /// Flag to turn on/off back_face_culling
   bool back_face_culling;

   /// Flag to turn on/off elliptical weight
   bool elliptical_weight;

   /// Size of reconstruction filter.
   double reconstruction_filter_size;
   /// Size of antialising filter.
   double prefilter_size;

   /// Flag for enabling/disabling LOD rendering 0 = none, 1 = lod, 2 = upsampling
   int use_lod;

   /// Flag for enabling/disabling color per LOD level
   bool color_per_lod;
};

#define CHECK_FOR_OGL_ERROR()	  									 \
	do {															 \
		GLenum err;													 \
		err = glGetError();											 \
		if (err != GL_NO_ERROR)										 \
		{															 \
			fprintf(stderr, "%s(%d) glError: %s\n",					 \
					__FILE__, __LINE__, gluErrorString(err));		 \
		}															 \
	} while(0)

#if !defined NULL
#	define NULL 0
#endif

#if !defined TRUE
#	define TRUE 1
#endif

#if !defined FALSE
#	define FALSE 0
#endif


 /* macros */

#if !defined MAX
#	define MAX(a, b) ((a) > (b) ? (a) : (b))
#endif


#endif