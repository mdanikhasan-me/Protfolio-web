// Reference interior layer formulas, inspected against the live About page.
// Keep grid/cross layers separate so transparent blending matches the source scene.

export const interiorBackgroundFragment = /* glsl */ `#define GLSLIFY 1
varying vec2 vUv;uniform sampler2D uNoiseTex;uniform float uNoise;uniform vec2 uScreenResolution;uniform vec2 uMousePos;float random(vec2 p){return fract(sin(dot(p.xy,vec2(12.9898,78.233)))*43758.5453);}void main(void){vec3 o=vec3(0.0);vec4 noise=texture2D(uNoiseTex,vUv*1.0)+random(vUv)*0.2;float rnd=(0.6+random(vUv)*0.4);o.x+=smoothstep(0.5,1.0,noise.x);o.y+=smoothstep(0.2,1.0,noise.y);o.z+=smoothstep(0.0,1.0,noise.z);o.xyz*=vec3(0.3,0.4,0.6)*0.3;o+=vec3(0.01,0.025,0.06);vec2 cuv=vUv-0.5;float len=length(cuv);o.xyz*=smoothstep(0.9,0.3,len);o*=smoothstep(1.0,0.0,length(vUv-0.5+vec2(-0.3,0.0)))*0.8;vec2 fragUv=gl_FragCoord.xy/uScreenResolution.xy;gl_FragColor=vec4(o,1.0);}`;

export const interiorGridVertex = /* glsl */ `#define GLSLIFY 1
varying vec2 vUv;uniform vec3 uScale;uniform float uTime;uniform float uScroll;
#define PI 3.14159265359
#define TPI 6.28318530718
#define HPI 1.57079632679
mat2 rotate(float rad){return mat2(cos(rad),sin(rad),-sin(rad),cos(rad));}
#ifdef IS_GRID
#endif
#ifdef IS_CROSS
attribute vec2 instanceId;
#endif
void main(void){vec2 localPos=position.xy;
#ifdef IS_CROSS
vec2 loopPos=instanceId.xy;loopPos.y=mod(loopPos.y+uScroll*0.1,1.0);localPos=(loopPos-0.5)*1.0;
#endif
float theta=localPos.x*PI;vec3 roundedPos=vec3(0.0);
#ifdef IS_ROUND
roundedPos=vec3(sin(theta)*0.5*uScale.x,localPos.y*uScale.y*1.5,-cos(theta)*uScale.x*0.5);
#endif
#ifdef IS_FLAT
roundedPos=vec3(localPos.x*uScale.x,localPos.y*uScale.y,0.0);
#endif
vec3 pos=vec3(0.0);
#ifdef IS_GRID
pos=roundedPos;
#endif
#ifdef IS_CROSS
pos=position*0.15;
#ifdef IS_ROUND
pos.xz*=rotate(-theta);
#endif
pos+=roundedPos;
#endif
gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);vUv=uv;}`;

export const interiorGridFragment = /* glsl */ `#define GLSLIFY 1
varying vec2 vUv;uniform vec2 uGrid;uniform float uTime;uniform float uScroll;uniform sampler2D uFluidsTex;void main(void){float line=0.0;vec2 gridUv=vUv*uGrid;gridUv.y-=uScroll*1.5;float lineThreshold=0.45;
#ifndef IS_DARK
#ifdef IS_THIN_LIGHT
lineThreshold=0.44;
#else
lineThreshold=0.46;
#endif
#endif
line+=smoothstep(lineThreshold,0.5,abs(fract(gridUv.x)-0.5));line=max(line,smoothstep(lineThreshold,0.5,abs(fract(gridUv.y)-0.5)));
#ifdef IS_DARK
gl_FragColor=vec4(vec3(0.0),0.1);
#else
vec4 fluids=texture2D(uFluidsTex,vUv);vec3 col=vec3(1.0);col.xy-=fluids.xy*0.005;gl_FragColor=vec4(col,0.5);
#endif
#ifdef IS_THIN_LIGHT
gl_FragColor.a*=line*0.05;
#else
gl_FragColor.a*=line*0.2;
#endif
}`;

export const interiorCrossFragment = /* glsl */ `#define GLSLIFY 1
varying vec2 vUv;void main(void){float line=0.0;vec2 gridUv=vUv-0.5;float w=0.08;line+=smoothstep(w,0.01,abs(gridUv.x));line=max(line,smoothstep(w,w*0.1,abs(gridUv.y)));
#ifdef IS_DARK
gl_FragColor=vec4(vec3(0.0),0.2);
#else
gl_FragColor=vec4(vec3(1.0),0.3);
#ifdef IS_THIN_LIGHT
gl_FragColor.a*=0.5;
#endif
#endif
gl_FragColor.a*=line;}`;
