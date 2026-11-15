// Nova Weed post-processing: renders the scene into an HDR target, adds a soft bloom,
// warm color grading, a gentle vignette, then tone maps to the screen. One toggle in settings.
import * as THREE from '/vendor/three/three.module.min.js';

const QUAD_V='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const BRIGHT_F=`uniform sampler2D tex;uniform float thresh;varying vec2 vUv;
void main(){vec3 c=texture2D(tex,vUv).rgb;float l=dot(c,vec3(.2126,.7152,.0722));gl_FragColor=vec4(c*smoothstep(thresh,thresh+.6,l),1.);}`;
const BLUR_F=`uniform sampler2D tex;uniform vec2 dir;varying vec2 vUv;
void main(){vec3 s=texture2D(tex,vUv).rgb*.227;
 s+=texture2D(tex,vUv+dir*1.385).rgb*.316;s+=texture2D(tex,vUv-dir*1.385).rgb*.316;
 s+=texture2D(tex,vUv+dir*3.231).rgb*.07;s+=texture2D(tex,vUv-dir*3.231).rgb*.07;gl_FragColor=vec4(s,1.);}`;
const FINAL_F=`uniform sampler2D tex,bloom;uniform float bloomK,sat,warm,vig,contrast;varying vec2 vUv;
void main(){vec3 c=texture2D(tex,vUv).rgb+texture2D(bloom,vUv).rgb*bloomK;
 float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,sat);                    // saturation
 c*=vec3(1.+warm,1.+warm*.35,1.-warm*.6);                                         // warm grade
 c=mix(c,c*c*(3.-2.*c),contrast*.15);                                             // gentle S-curve
 vec2 d=vUv-.5;c*=1.-vig*smoothstep(.25,.85,dot(d,d)*2.);                         // vignette
 gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

export function createPost(renderer){
 const opt={type:THREE.HalfFloatType,depthBuffer:true};
 const main=new THREE.WebGLRenderTarget(4,4,{...opt,samples:4});
 const a=new THREE.WebGLRenderTarget(4,4,{type:THREE.HalfFloatType,depthBuffer:false}),b=a.clone();
 const cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1),geo=new THREE.PlaneGeometry(2,2);
 const mk=(f,u)=>{const s=new THREE.Scene();const m=new THREE.ShaderMaterial({vertexShader:QUAD_V,fragmentShader:f,uniforms:u,depthTest:false,depthWrite:false,toneMapped:f===FINAL_F});s.add(new THREE.Mesh(geo,m));return {s,m}};
 const bright=mk(BRIGHT_F,{tex:{value:null},thresh:{value:.9}});
 const blur=mk(BLUR_F,{tex:{value:null},dir:{value:new THREE.Vector2()}});
 const fin=mk(FINAL_F,{tex:{value:null},bloom:{value:null},bloomK:{value:.55},sat:{value:1.1},warm:{value:.045},vig:{value:.32},contrast:{value:1}});
 let W=4,H=4;
 const api={enabled:true,
  setSize(w,h){W=w;H=h;main.setSize(w,h);a.setSize(Math.max(1,w>>2),Math.max(1,h>>2));b.setSize(Math.max(1,w>>2),Math.max(1,h>>2))},
  set(o){for(const [k,v]of Object.entries(o))if(fin.m.uniforms[k])fin.m.uniforms[k].value=v},
  render(scene,camera){
   if(!api.enabled){renderer.setRenderTarget(null);renderer.render(scene,camera);return}
   renderer.setRenderTarget(main);renderer.render(scene,camera);
   bright.m.uniforms.tex.value=main.texture;renderer.setRenderTarget(a);renderer.render(bright.s,cam);
   for(let i=0;i<2;i++){
    blur.m.uniforms.tex.value=a.texture;blur.m.uniforms.dir.value.set(1/a.width,0);renderer.setRenderTarget(b);renderer.render(blur.s,cam);
    blur.m.uniforms.tex.value=b.texture;blur.m.uniforms.dir.value.set(0,1/a.height);renderer.setRenderTarget(a);renderer.render(blur.s,cam);
   }
   fin.m.uniforms.tex.value=main.texture;fin.m.uniforms.bloom.value=a.texture;renderer.setRenderTarget(null);renderer.render(fin.s,cam);
  }};
 return api;
}
