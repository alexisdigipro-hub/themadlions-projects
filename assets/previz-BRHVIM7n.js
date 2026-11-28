import"./modulepreload-polyfill-B5Qt9EMX.js";/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const hl="187",_s={ROTATE:0,DOLLY:1,PAN:2},ms={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},$u=0,ql=1,Yu=2,xs=1,qu=2,Vs=3,Hi=0,sn=1,jn=2,vs=0,Ys=1,Kl=2,Zl=3,Jl=4,Ku=5,fs=100,Zu=101,Ju=102,Qu=103,ju=104,td=200,ed=201,nd=202,id=203,Eh=204,bh=205,sd=206,rd=207,ad=208,od=209,ld=210,cd=211,hd=212,ud=213,dd=214,lo=0,co=1,ho=2,tr=3,uo=4,fo=5,po=6,mo=7,Th=0,fd=1,pd=2,ni=0,wh=1,Ah=2,Rh=3,Ch=4,Ph=5,Lh=6,Dh=7,Ih=300,ys=301,er=302,ba=303,Ta=304,go=1e3,ti=1001,_o=1002,ze=1003,md=1004,fr=1005,en=1006,wa=1007,gi=1008,dn=1009,Nh=1010,Uh=1011,nr=1012,ul=1013,Vn=1014,kn=1015,Wn=1016,dl=1017,fl=1018,Es=1020,Fh=35902,Oh=35899,zh=1021,kh=1022,Bn=1023,Si=1026,_i=1027,Bh=1028,pl=1029,Vi=1030,ml=1031,gl=1033,Vr=33776,Wr=33777,Xr=33778,$r=33779,xo=35840,vo=35841,Mo=35842,So=35843,yo=36196,Eo=37492,bo=37496,To=37488,wo=37489,Jr=37490,Ao=37491,Ro=37808,Co=37809,Po=37810,Lo=37811,Do=37812,Io=37813,No=37814,Uo=37815,Fo=37816,Oo=37817,zo=37818,ko=37819,Bo=37820,Go=37821,Ho=36492,Vo=36494,Wo=36495,Xo=36283,$o=36284,Qr=36285,Yo=36286,gd=3200,qo=0,_d=1,pi="",un="srgb",jr="srgb-linear",ta="linear",re="srgb",Aa=7680,xd=519,vd=512,Md=513,Sd=514,Gh=515,yd=516,Ed=517,Hh=518,Vh=519,Wh=35044,Ql="300 es",An=2e3,ir=2001;function bd(n){for(let t=n.length-1;t>=0;--t)if(n[t]>=65535)return!0;return!1}function ea(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function Td(){const n=ea("canvas");return n.style.display="block",n}const jl={};function na(...n){const t="THREE."+n.shift();console.log(t,...n)}function Xh(n){const t=n[0];if(typeof t=="string"&&t.startsWith("TSL:")){const e=n[1];e&&e.isStackTrace?n[0]+=" "+e.getLocation():n[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return n}function Nt(...n){n=Xh(n);const t="THREE."+n.shift();{const e=n[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...n)}}function jt(...n){n=Xh(n);const t="THREE."+n.shift();{const e=n[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...n)}}function Yr(...n){const t=n.join(" ");t in jl||(jl[t]=!0,Nt(...n))}function wd(n,t,e){return new Promise(function(i,s){function r(){switch(n.clientWaitSync(t,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:s();break;case n.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:i()}}setTimeout(r,e)})}const Ad={[lo]:lo,[ho]:po,[uo]:uo,[tr]:fo,[co]:co,[po]:ho,[mo]:mo,[fo]:tr};class wi{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[t]===void 0&&(i[t]=[]),i[t].indexOf(e)===-1&&i[t].push(e)}hasEventListener(t,e){const i=this._listeners;return i===void 0?!1:i[t]!==void 0&&i[t].indexOf(e)!==-1}removeEventListener(t,e){const i=this._listeners;if(i===void 0)return;const s=i[t];if(s!==void 0){const r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){const e=this._listeners;if(e===void 0)return;const i=e[t.type];if(i!==void 0){t.target=this;const s=i.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,t);t.target=null}}}const Ge=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let tc=1234567;const qs=Math.PI/180,sr=180/Math.PI;function Ai(){const n=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Ge[n&255]+Ge[n>>8&255]+Ge[n>>16&255]+Ge[n>>24&255]+"-"+Ge[t&255]+Ge[t>>8&255]+"-"+Ge[t>>16&15|64]+Ge[t>>24&255]+"-"+Ge[e&63|128]+Ge[e>>8&255]+"-"+Ge[e>>16&255]+Ge[e>>24&255]+Ge[i&255]+Ge[i>>8&255]+Ge[i>>16&255]+Ge[i>>24&255]).toLowerCase()}function $t(n,t,e){return Math.max(t,Math.min(e,n))}function _l(n,t){return(n%t+t)%t}function Rd(n,t,e,i,s){return i+(n-t)*(s-i)/(e-t)}function Cd(n,t,e){return n!==t?(e-n)/(t-n):0}function Ks(n,t,e){return(1-e)*n+e*t}function Pd(n,t,e,i){return Ks(n,t,1-Math.exp(-e*i))}function Ld(n,t=1){return t-Math.abs(_l(n,t*2)-t)}function Dd(n,t,e){return n<=t?0:n>=e?1:(n=(n-t)/(e-t),n*n*(3-2*n))}function Id(n,t,e){return n<=t?0:n>=e?1:(n=(n-t)/(e-t),n*n*n*(n*(n*6-15)+10))}function Nd(n,t){return n+Math.floor(Math.random()*(t-n+1))}function Ud(n,t){return n+Math.random()*(t-n)}function Fd(n){return n*(.5-Math.random())}function Od(n){n!==void 0&&(tc=n);let t=tc+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function zd(n){return n*qs}function kd(n){return n*sr}function Bd(n){return n>0&&Number.isInteger(n)&&2**Math.round(Math.log2(n))===n}function Gd(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function $h(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function Hd(n,t,e,i,s){const r=Math.cos,a=Math.sin,o=r(e/2),c=a(e/2),l=r((t+i)/2),h=a((t+i)/2),f=r((t-i)/2),p=a((t-i)/2),m=r((i-t)/2),g=a((i-t)/2);switch(s){case"XYX":n.set(o*h,c*f,c*p,o*l);break;case"YZY":n.set(c*p,o*h,c*f,o*l);break;case"ZXZ":n.set(c*f,c*p,o*h,o*l);break;case"XZX":n.set(o*h,c*g,c*m,o*l);break;case"YXY":n.set(c*m,o*h,c*g,o*l);break;case"ZYZ":n.set(c*g,c*m,o*h,o*l);break;default:Nt("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function ua(n){switch(n.constructor){case Uint32Array:return 4294967295;case Uint16Array:return 65535;case Uint8Array:case Uint8ClampedArray:return 255;case Int32Array:return 2147483647;case Int16Array:return 32767;case Int8Array:return 127;default:return}}function xl(n,t){if(t.constructor===Float32Array)return n;const e=ua(t);if(e===void 0)throw new Error("THREE.MathUtils: Invalid component type.");return Math.max(n/e,-1)}function vl(n,t){if(t.constructor===Float32Array)return n;const e=ua(t);if(e===void 0)throw new Error("THREE.MathUtils: Invalid component type.");return Math.round(n*e)}const rr={DEG2RAD:qs,RAD2DEG:sr,generateUUID:Ai,clamp:$t,euclideanModulo:_l,mapLinear:Rd,inverseLerp:Cd,lerp:Ks,damp:Pd,pingpong:Ld,smoothstep:Dd,smootherstep:Id,randInt:Nd,randFloat:Ud,randFloatSpread:Fd,seededRandom:Od,degToRad:zd,radToDeg:kd,isPowerOfTwo:Bd,ceilPowerOfTwo:Gd,floorPowerOfTwo:$h,setQuaternionFromProperEuler:Hd,normalize:vl,denormalize:xl},Il=class Il{constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,i=this.y,s=t.elements;return this.x=s[0]*e+s[3]*i+s[6],this.y=s[1]*e+s[4]*i+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=$t(this.x,t.x,e.x),this.y=$t(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=$t(this.x,t,e),this.y=$t(this.y,t,e),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar($t(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const i=this.dot(t)/e;return Math.acos($t(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,i=this.y-t.y;return e*e+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const i=Math.cos(e),s=Math.sin(e),r=this.x-t.x,a=this.y-t.y;return this.x=r*i-a*s+t.x,this.y=r*s+a*i+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};Il.prototype.isVector2=!0;let At=Il;class yi{constructor(t=0,e=0,i=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=i,this._w=s}static slerpFlat(t,e,i,s,r,a,o){let c=i[s+0],l=i[s+1],h=i[s+2],f=i[s+3],p=r[a+0],m=r[a+1],g=r[a+2],M=r[a+3];if(f!==M||c!==p||l!==m||h!==g){let d=c*p+l*m+h*g+f*M;d<0&&(p=-p,m=-m,g=-g,M=-M,d=-d);let u=1-o;if(d<.9995){const v=Math.acos(d),b=Math.sin(v);u=Math.sin(u*v)/b,o=Math.sin(o*v)/b,c=c*u+p*o,l=l*u+m*o,h=h*u+g*o,f=f*u+M*o}else{c=c*u+p*o,l=l*u+m*o,h=h*u+g*o,f=f*u+M*o;const v=1/Math.sqrt(c*c+l*l+h*h+f*f);c*=v,l*=v,h*=v,f*=v}}t[e]=c,t[e+1]=l,t[e+2]=h,t[e+3]=f}static multiplyQuaternionsFlat(t,e,i,s,r,a){const o=i[s],c=i[s+1],l=i[s+2],h=i[s+3],f=r[a],p=r[a+1],m=r[a+2],g=r[a+3];return t[e]=o*g+h*f+c*m-l*p,t[e+1]=c*g+h*p+l*f-o*m,t[e+2]=l*g+h*m+o*p-c*f,t[e+3]=h*g-o*f-c*p-l*m,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,i,s){return this._x=t,this._y=e,this._z=i,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const i=t._x,s=t._y,r=t._z,a=t._order,o=Math.cos,c=Math.sin,l=o(i/2),h=o(s/2),f=o(r/2),p=c(i/2),m=c(s/2),g=c(r/2);switch(a){case"XYZ":this._x=p*h*f+l*m*g,this._y=l*m*f-p*h*g,this._z=l*h*g+p*m*f,this._w=l*h*f-p*m*g;break;case"YXZ":this._x=p*h*f+l*m*g,this._y=l*m*f-p*h*g,this._z=l*h*g-p*m*f,this._w=l*h*f+p*m*g;break;case"ZXY":this._x=p*h*f-l*m*g,this._y=l*m*f+p*h*g,this._z=l*h*g+p*m*f,this._w=l*h*f-p*m*g;break;case"ZYX":this._x=p*h*f-l*m*g,this._y=l*m*f+p*h*g,this._z=l*h*g-p*m*f,this._w=l*h*f+p*m*g;break;case"YZX":this._x=p*h*f+l*m*g,this._y=l*m*f+p*h*g,this._z=l*h*g-p*m*f,this._w=l*h*f-p*m*g;break;case"XZY":this._x=p*h*f-l*m*g,this._y=l*m*f-p*h*g,this._z=l*h*g+p*m*f,this._w=l*h*f+p*m*g;break;default:Nt("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const i=e/2,s=Math.sin(i);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,i=e[0],s=e[4],r=e[8],a=e[1],o=e[5],c=e[9],l=e[2],h=e[6],f=e[10],p=i+o+f;if(p>0){const m=.5/Math.sqrt(p+1);this._w=.25/m,this._x=(h-c)*m,this._y=(r-l)*m,this._z=(a-s)*m}else if(i>o&&i>f){const m=2*Math.sqrt(1+i-o-f);this._w=(h-c)/m,this._x=.25*m,this._y=(s+a)/m,this._z=(r+l)/m}else if(o>f){const m=2*Math.sqrt(1+o-i-f);this._w=(r-l)/m,this._x=(s+a)/m,this._y=.25*m,this._z=(c+h)/m}else{const m=2*Math.sqrt(1+f-i-o);this._w=(a-s)/m,this._x=(r+l)/m,this._y=(c+h)/m,this._z=.25*m}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let i=t.dot(e)+1;return i<1e-8?(i=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=i):(this._x=0,this._y=-t.z,this._z=t.y,this._w=i)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=i),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs($t(this.dot(t),-1,1)))}rotateTowards(t,e){const i=this.angleTo(t);if(i===0)return this;const s=Math.min(1,e/i);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const i=t._x,s=t._y,r=t._z,a=t._w,o=e._x,c=e._y,l=e._z,h=e._w;return this._x=i*h+a*o+s*l-r*c,this._y=s*h+a*c+r*o-i*l,this._z=r*h+a*l+i*c-s*o,this._w=a*h-i*o-s*c-r*l,this._onChangeCallback(),this}slerp(t,e){let i=t._x,s=t._y,r=t._z,a=t._w,o=this.dot(t);o<0&&(i=-i,s=-s,r=-r,a=-a,o=-o);let c=1-e;if(o<.9995){const l=Math.acos(o),h=Math.sin(l);c=Math.sin(c*l)/h,e=Math.sin(e*l)/h,this._x=this._x*c+i*e,this._y=this._y*c+s*e,this._z=this._z*c+r*e,this._w=this._w*c+a*e,this._onChangeCallback()}else this._x=this._x*c+i*e,this._y=this._y*c+s*e,this._z=this._z*c+r*e,this._w=this._w*c+a*e,this.normalize();return this}slerpQuaternions(t,e,i){return this.copy(t).slerp(e,i)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),i=Math.random(),s=Math.sqrt(1-i),r=Math.sqrt(i);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const Nl=class Nl{constructor(t=0,e=0,i=0){this.x=t,this.y=e,this.z=i}set(t,e,i){return i===void 0&&(i=this.z),this.x=t,this.y=e,this.z=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(ec.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(ec.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,i=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*i+r[6]*s,this.y=r[1]*e+r[4]*i+r[7]*s,this.z=r[2]*e+r[5]*i+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,i=this.y,s=this.z,r=t.elements,a=1/(r[3]*e+r[7]*i+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*i+r[8]*s+r[12])*a,this.y=(r[1]*e+r[5]*i+r[9]*s+r[13])*a,this.z=(r[2]*e+r[6]*i+r[10]*s+r[14])*a,this}applyQuaternion(t){const e=this.x,i=this.y,s=this.z,r=t.x,a=t.y,o=t.z,c=t.w,l=2*(a*s-o*i),h=2*(o*e-r*s),f=2*(r*i-a*e);return this.x=e+c*l+a*f-o*h,this.y=i+c*h+o*l-r*f,this.z=s+c*f+r*h-a*l,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,i=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*i+r[8]*s,this.y=r[1]*e+r[5]*i+r[9]*s,this.z=r[2]*e+r[6]*i+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=$t(this.x,t.x,e.x),this.y=$t(this.y,t.y,e.y),this.z=$t(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=$t(this.x,t,e),this.y=$t(this.y,t,e),this.z=$t(this.z,t,e),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar($t(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const i=t.x,s=t.y,r=t.z,a=e.x,o=e.y,c=e.z;return this.x=s*c-r*o,this.y=r*a-i*c,this.z=i*o-s*a,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const i=t.dot(this)/e;return this.copy(t).multiplyScalar(i)}projectOnPlane(t){return Ra.copy(this).projectOnVector(t),this.sub(Ra)}reflect(t){return this.sub(Ra.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const i=this.dot(t)/e;return Math.acos($t(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,i=this.y-t.y,s=this.z-t.z;return e*e+i*i+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,i){const s=Math.sin(e)*t;return this.x=s*Math.sin(i),this.y=Math.cos(e)*t,this.z=s*Math.cos(i),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,i){return this.x=t*Math.sin(e),this.y=i,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),i=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=i,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,i=Math.sqrt(1-e*e);return this.x=i*Math.cos(t),this.y=e,this.z=i*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};Nl.prototype.isVector3=!0;let N=Nl;const Ra=new N,ec=new yi,Ul=class Ul{constructor(t,e,i,s,r,a,o,c,l){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,i,s,r,a,o,c,l)}set(t,e,i,s,r,a,o,c,l){const h=this.elements;return h[0]=t,h[1]=s,h[2]=o,h[3]=e,h[4]=r,h[5]=c,h[6]=i,h[7]=a,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],this}extractBasis(t,e,i){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const i=t.elements,s=e.elements,r=this.elements,a=i[0],o=i[3],c=i[6],l=i[1],h=i[4],f=i[7],p=i[2],m=i[5],g=i[8],M=s[0],d=s[3],u=s[6],v=s[1],b=s[4],y=s[7],w=s[2],T=s[5],_=s[8];return r[0]=a*M+o*v+c*w,r[3]=a*d+o*b+c*T,r[6]=a*u+o*y+c*_,r[1]=l*M+h*v+f*w,r[4]=l*d+h*b+f*T,r[7]=l*u+h*y+f*_,r[2]=p*M+m*v+g*w,r[5]=p*d+m*b+g*T,r[8]=p*u+m*y+g*_,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],a=t[4],o=t[5],c=t[6],l=t[7],h=t[8];return e*a*h-e*o*l-i*r*h+i*o*c+s*r*l-s*a*c}invert(){const t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],a=t[4],o=t[5],c=t[6],l=t[7],h=t[8],f=h*a-o*l,p=o*c-h*r,m=l*r-a*c,g=e*f+i*p+s*m;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const M=1/g;return t[0]=f*M,t[1]=(s*l-h*i)*M,t[2]=(o*i-s*a)*M,t[3]=p*M,t[4]=(h*e-s*c)*M,t[5]=(s*r-o*e)*M,t[6]=m*M,t[7]=(i*c-l*e)*M,t[8]=(a*e-i*r)*M,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,i,s,r,a,o){const c=Math.cos(r),l=Math.sin(r);return this.set(i*c,i*l,-i*(c*a+l*o)+a+t,-s*l,s*c,-s*(-l*a+c*o)+o+e,0,0,1),this}scale(t,e){return Yr("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Ca.makeScale(t,e)),this}rotate(t){return Yr("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Ca.makeRotation(-t)),this}translate(t,e){return Yr("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Ca.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,i,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,i=t.elements;for(let s=0;s<9;s++)if(e[s]!==i[s])return!1;return!0}fromArray(t,e=0){for(let i=0;i<9;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){const i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t}clone(){return new this.constructor().fromArray(this.elements)}};Ul.prototype.isMatrix3=!0;let Ot=Ul;const Ca=new Ot,nc=new Ot().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),ic=new Ot().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Vd(){const n={enabled:!0,workingColorSpace:jr,spaces:{},convert:function(s,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===re&&(s.r=ii(s.r),s.g=ii(s.g),s.b=ii(s.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===re&&(s.r=Ms(s.r),s.g=Ms(s.g),s.b=Ms(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===pi?ta:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,a){return s.copy(this.spaces[a].fromXYZ).multiply(this.spaces[r].toXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[jr]:{primaries:t,whitePoint:i,transfer:ta,toXYZ:nc,fromXYZ:ic,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:un},outputColorSpaceConfig:{drawingBufferColorSpace:un}},[un]:{primaries:t,whitePoint:i,transfer:re,toXYZ:nc,fromXYZ:ic,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:un}}}),n}const Jt=Vd();function ii(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function Ms(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let Ji;class Wd{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let i;if(t instanceof HTMLCanvasElement)i=t;else{Ji===void 0&&(Ji=ea("canvas")),Ji.width=t.width,Ji.height=t.height;const s=Ji.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),i=Ji}return i.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=ea("canvas");e.width=t.width,e.height=t.height;const i=e.getContext("2d");i.drawImage(t,0,0,t.width,t.height);const s=i.getImageData(0,0,t.width,t.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=ii(r[a]/255)*255;return i.putImageData(s,0,0),e}else if(t.data){const e=t.data.slice(0);for(let i=0;i<e.length;i++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[i]=Math.floor(ii(e[i]/255)*255):e[i]=ii(e[i]);return{data:e,width:t.width,height:t.height}}else return Nt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let Xd=0;class Ml{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:Xd++}),this.uuid=Ai(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){const e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width||0,e.height||0,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const i={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(Pa(s[a].image)):r.push(Pa(s[a]))}else r=Pa(s);i.url=r}return e||(t.images[this.uuid]=i),i}}function Pa(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?Wd.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(Nt("Texture: Unable to serialize Texture."),{})}let $d=0;const La=new N;class We extends wi{constructor(t=We.DEFAULT_IMAGE,e=We.DEFAULT_MAPPING,i=ti,s=ti,r=en,a=gi,o=Bn,c=dn,l=We.DEFAULT_ANISOTROPY,h=pi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:$d++}),this.uuid=Ai(),this.name="",this.source=new Ml(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=i,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new At(0,0),this.repeat=new At(1,1),this.center=new At(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ot,this.generateMipmaps=!0,this.mipmapsAutoUpdate=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.isPMREMTexture=!1,this.normalized=!1}get width(){return this.source.getSize(La).x}get height(){return this.source.getSize(La).y}get depth(){return this.source.getSize(La).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.mipmapsAutoUpdate=t.mipmapsAutoUpdate,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isPMREMTexture=t.isPMREMTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(const e in t){const i=t[e];if(i===void 0){Nt(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}const s=this[e];if(s===void 0){Nt(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&i&&s.isVector2&&i.isVector2||s&&i&&s.isVector3&&i.isVector3||s&&i&&s.isMatrix3&&i.isMatrix3?s.copy(i):this[e]=i}}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,mipmapsAutoUpdate:this.mipmapsAutoUpdate,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),e||(t.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Ih)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case go:t.x=t.x-Math.floor(t.x);break;case ti:t.x=t.x<0?0:1;break;case _o:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case go:t.y=t.y-Math.floor(t.y);break;case ti:t.y=t.y<0?0:1;break;case _o:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}We.DEFAULT_IMAGE=null;We.DEFAULT_MAPPING=Ih;We.DEFAULT_ANISOTROPY=1;const Fl=class Fl{constructor(t=0,e=0,i=0,s=1){this.x=t,this.y=e,this.z=i,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,i,s){return this.x=t,this.y=e,this.z=i,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,i=this.y,s=this.z,r=this.w,a=t.elements;return this.x=a[0]*e+a[4]*i+a[8]*s+a[12]*r,this.y=a[1]*e+a[5]*i+a[9]*s+a[13]*r,this.z=a[2]*e+a[6]*i+a[10]*s+a[14]*r,this.w=a[3]*e+a[7]*i+a[11]*s+a[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,i,s,r;const c=t.elements,l=c[0],h=c[4],f=c[8],p=c[1],m=c[5],g=c[9],M=c[2],d=c[6],u=c[10];if(Math.abs(h-p)<.01&&Math.abs(f-M)<.01&&Math.abs(g-d)<.01){if(Math.abs(h+p)<.1&&Math.abs(f+M)<.1&&Math.abs(g+d)<.1&&Math.abs(l+m+u-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const b=(l+1)/2,y=(m+1)/2,w=(u+1)/2,T=(h+p)/4,_=(f+M)/4,E=(g+d)/4;return b>y&&b>w?b<.01?(i=0,s=.707106781,r=.707106781):(i=Math.sqrt(b),s=T/i,r=_/i):y>w?y<.01?(i=.707106781,s=0,r=.707106781):(s=Math.sqrt(y),i=T/s,r=E/s):w<.01?(i=.707106781,s=.707106781,r=0):(r=Math.sqrt(w),i=_/r,s=E/r),this.set(i,s,r,e),this}let v=Math.sqrt((d-g)*(d-g)+(f-M)*(f-M)+(p-h)*(p-h));return Math.abs(v)<.001&&(v=1),this.x=(d-g)/v,this.y=(f-M)/v,this.z=(p-h)/v,this.w=Math.acos((l+m+u-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=$t(this.x,t.x,e.x),this.y=$t(this.y,t.y,e.y),this.z=$t(this.z,t.z,e.z),this.w=$t(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=$t(this.x,t,e),this.y=$t(this.y,t,e),this.z=$t(this.z,t,e),this.w=$t(this.w,t,e),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar($t(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this.w=t.w+(e.w-t.w)*i,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};Fl.prototype.isVector4=!0;let _e=Fl;class Yd extends wi{constructor(t=1,e=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:en,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},i),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=i.depth,this.scissor=new _e(0,0,t,e),this.scissorTest=!1,this.viewport=new _e(0,0,t,e),this.textures=[];const s=i.count;for(let r=0;r<s;r++)this.textures[r]=new We({width:t,height:e,depth:i.depth}),this.textures[r].isRenderTargetTexture=!0,this.textures[r].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveColorBuffer=i.resolveColorBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this.storeMultisampledColorBuffer=i.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=i.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=i.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview,this.useArrayDepthTexture=i.useArrayDepthTexture}_setTextureOptions(t={}){const e={minFilter:en,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.mipmapsAutoUpdate!==void 0&&(e.mipmapsAutoUpdate=t.mipmapsAutoUpdate),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,i=1){if(this.width!==t||this.height!==e||this.depth!==i){this.width=t,this.height=e,this.depth=i;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=i,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,i=t.textures.length;e<i;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;const s=Object.assign({},t.textures[e].image);this.textures[e].source=new Ml(s)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){const e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;else this.depthTexture=null;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Gn extends Yd{constructor(t=1,e=1,i={}){super(t,e,i),this.isWebGLRenderTarget=!0}}class Yh extends We{constructor(t=null,e=1,i=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:i,depth:s},this.magFilter=ze,this.minFilter=ze,this.wrapR=ti,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class qd extends We{constructor(t=null,e=1,i=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:i,depth:s},this.magFilter=ze,this.minFilter=ze,this.wrapR=ti,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}}const ha=class ha{constructor(t,e,i,s,r,a,o,c,l,h,f,p,m,g,M,d){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,i,s,r,a,o,c,l,h,f,p,m,g,M,d)}set(t,e,i,s,r,a,o,c,l,h,f,p,m,g,M,d){const u=this.elements;return u[0]=t,u[4]=e,u[8]=i,u[12]=s,u[1]=r,u[5]=a,u[9]=o,u[13]=c,u[2]=l,u[6]=h,u[10]=f,u[14]=p,u[3]=m,u[7]=g,u[11]=M,u[15]=d,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ha().fromArray(this.elements)}copy(t){const e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],e[9]=i[9],e[10]=i[10],e[11]=i[11],e[12]=i[12],e[13]=i[13],e[14]=i[14],e[15]=i[15],this}copyPosition(t){const e=this.elements,i=t.elements;return e[12]=i[12],e[13]=i[13],e[14]=i[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,i){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),i.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this)}makeBasis(t,e,i){return this.set(t.x,e.x,i.x,0,t.y,e.y,i.y,0,t.z,e.z,i.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();const e=this.elements,i=t.elements,s=1/Qi.setFromMatrixColumn(t,0).length(),r=1/Qi.setFromMatrixColumn(t,1).length(),a=1/Qi.setFromMatrixColumn(t,2).length();return e[0]=i[0]*s,e[1]=i[1]*s,e[2]=i[2]*s,e[3]=0,e[4]=i[4]*r,e[5]=i[5]*r,e[6]=i[6]*r,e[7]=0,e[8]=i[8]*a,e[9]=i[9]*a,e[10]=i[10]*a,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,i=t.x,s=t.y,r=t.z,a=Math.cos(i),o=Math.sin(i),c=Math.cos(s),l=Math.sin(s),h=Math.cos(r),f=Math.sin(r);if(t.order==="XYZ"){const p=a*h,m=a*f,g=o*h,M=o*f;e[0]=c*h,e[4]=-c*f,e[8]=l,e[1]=m+g*l,e[5]=p-M*l,e[9]=-o*c,e[2]=M-p*l,e[6]=g+m*l,e[10]=a*c}else if(t.order==="YXZ"){const p=c*h,m=c*f,g=l*h,M=l*f;e[0]=p+M*o,e[4]=g*o-m,e[8]=a*l,e[1]=a*f,e[5]=a*h,e[9]=-o,e[2]=m*o-g,e[6]=M+p*o,e[10]=a*c}else if(t.order==="ZXY"){const p=c*h,m=c*f,g=l*h,M=l*f;e[0]=p-M*o,e[4]=-a*f,e[8]=g+m*o,e[1]=m+g*o,e[5]=a*h,e[9]=M-p*o,e[2]=-a*l,e[6]=o,e[10]=a*c}else if(t.order==="ZYX"){const p=a*h,m=a*f,g=o*h,M=o*f;e[0]=c*h,e[4]=g*l-m,e[8]=p*l+M,e[1]=c*f,e[5]=M*l+p,e[9]=m*l-g,e[2]=-l,e[6]=o*c,e[10]=a*c}else if(t.order==="YZX"){const p=a*c,m=a*l,g=o*c,M=o*l;e[0]=c*h,e[4]=M-p*f,e[8]=g*f+m,e[1]=f,e[5]=a*h,e[9]=-o*h,e[2]=-l*h,e[6]=m*f+g,e[10]=p-M*f}else if(t.order==="XZY"){const p=a*c,m=a*l,g=o*c,M=o*l;e[0]=c*h,e[4]=-f,e[8]=l*h,e[1]=p*f+M,e[5]=a*h,e[9]=m*f-g,e[2]=g*f-m,e[6]=o*h,e[10]=M*f+p}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Kd,t,Zd)}lookAt(t,e,i){const s=this.elements;return rn.subVectors(t,e),rn.lengthSq()===0&&(rn.z=1),rn.normalize(),oi.crossVectors(i,rn),oi.lengthSq()===0&&(Math.abs(i.z)===1?rn.x+=1e-4:rn.z+=1e-4,rn.normalize(),oi.crossVectors(i,rn)),oi.normalize(),pr.crossVectors(rn,oi),s[0]=oi.x,s[4]=pr.x,s[8]=rn.x,s[1]=oi.y,s[5]=pr.y,s[9]=rn.y,s[2]=oi.z,s[6]=pr.z,s[10]=rn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const i=t.elements,s=e.elements,r=this.elements,a=i[0],o=i[4],c=i[8],l=i[12],h=i[1],f=i[5],p=i[9],m=i[13],g=i[2],M=i[6],d=i[10],u=i[14],v=i[3],b=i[7],y=i[11],w=i[15],T=s[0],_=s[4],E=s[8],L=s[12],R=s[1],I=s[5],F=s[9],z=s[13],C=s[2],H=s[6],$=s[10],V=s[14],et=s[3],U=s[7],X=s[11],J=s[15];return r[0]=a*T+o*R+c*C+l*et,r[4]=a*_+o*I+c*H+l*U,r[8]=a*E+o*F+c*$+l*X,r[12]=a*L+o*z+c*V+l*J,r[1]=h*T+f*R+p*C+m*et,r[5]=h*_+f*I+p*H+m*U,r[9]=h*E+f*F+p*$+m*X,r[13]=h*L+f*z+p*V+m*J,r[2]=g*T+M*R+d*C+u*et,r[6]=g*_+M*I+d*H+u*U,r[10]=g*E+M*F+d*$+u*X,r[14]=g*L+M*z+d*V+u*J,r[3]=v*T+b*R+y*C+w*et,r[7]=v*_+b*I+y*H+w*U,r[11]=v*E+b*F+y*$+w*X,r[15]=v*L+b*z+y*V+w*J,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],i=t[4],s=t[8],r=t[12],a=t[1],o=t[5],c=t[9],l=t[13],h=t[2],f=t[6],p=t[10],m=t[14],g=t[3],M=t[7],d=t[11],u=t[15],v=c*m-l*p,b=o*m-l*f,y=o*p-c*f,w=a*m-l*h,T=a*p-c*h,_=a*f-o*h;return e*(M*v-d*b+u*y)-i*(g*v-d*w+u*T)+s*(g*b-M*w+u*_)-r*(g*y-M*T+d*_)}determinantAffine(){const t=this.elements,e=t[0],i=t[4],s=t[8],r=t[1],a=t[5],o=t[9],c=t[2],l=t[6],h=t[10];return e*(a*h-o*l)-i*(r*h-o*c)+s*(r*l-a*c)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,i){const s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=i),this}invert(){const t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],a=t[4],o=t[5],c=t[6],l=t[7],h=t[8],f=t[9],p=t[10],m=t[11],g=t[12],M=t[13],d=t[14],u=t[15],v=e*o-i*a,b=e*c-s*a,y=e*l-r*a,w=i*c-s*o,T=i*l-r*o,_=s*l-r*c,E=h*M-f*g,L=h*d-p*g,R=h*u-m*g,I=f*d-p*M,F=f*u-m*M,z=p*u-m*d,C=v*z-b*F+y*I+w*R-T*L+_*E;if(C===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const H=1/C;return t[0]=(o*z-c*F+l*I)*H,t[1]=(s*F-i*z-r*I)*H,t[2]=(M*_-d*T+u*w)*H,t[3]=(p*T-f*_-m*w)*H,t[4]=(c*R-a*z-l*L)*H,t[5]=(e*z-s*R+r*L)*H,t[6]=(d*y-g*_-u*b)*H,t[7]=(h*_-p*y+m*b)*H,t[8]=(a*F-o*R+l*E)*H,t[9]=(i*R-e*F-r*E)*H,t[10]=(g*T-M*y+u*v)*H,t[11]=(f*y-h*T-m*v)*H,t[12]=(o*L-a*I-c*E)*H,t[13]=(e*I-i*L+s*E)*H,t[14]=(M*b-g*w-d*v)*H,t[15]=(h*w-f*b+p*v)*H,this}scale(t){const e=this.elements,i=t.x,s=t.y,r=t.z;return e[0]*=i,e[4]*=s,e[8]*=r,e[1]*=i,e[5]*=s,e[9]*=r,e[2]*=i,e[6]*=s,e[10]*=r,e[3]*=i,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],i=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,i,s))}makeTranslation(t,e,i){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,i,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),i=Math.sin(t);return this.set(1,0,0,0,0,e,-i,0,0,i,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,0,i,0,0,1,0,0,-i,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,0,i,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const i=Math.cos(e),s=Math.sin(e),r=1-i,a=t.x,o=t.y,c=t.z,l=r*a,h=r*o;return this.set(l*a+i,l*o-s*c,l*c+s*o,0,l*o+s*c,h*o+i,h*c-s*a,0,l*c-s*o,h*c+s*a,r*c*c+i,0,0,0,0,1),this}makeScale(t,e,i){return this.set(t,0,0,0,0,e,0,0,0,0,i,0,0,0,0,1),this}makeShear(t,e,i,s,r,a){return this.set(1,i,r,0,t,1,a,0,e,s,1,0,0,0,0,1),this}compose(t,e,i){const s=this.elements,r=e._x,a=e._y,o=e._z,c=e._w,l=r+r,h=a+a,f=o+o,p=r*l,m=r*h,g=r*f,M=a*h,d=a*f,u=o*f,v=c*l,b=c*h,y=c*f,w=i.x,T=i.y,_=i.z;return s[0]=(1-(M+u))*w,s[1]=(m+y)*w,s[2]=(g-b)*w,s[3]=0,s[4]=(m-y)*T,s[5]=(1-(p+u))*T,s[6]=(d+v)*T,s[7]=0,s[8]=(g+b)*_,s[9]=(d-v)*_,s[10]=(1-(p+M))*_,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,i){const s=this.elements;t.x=s[12],t.y=s[13],t.z=s[14];const r=this.determinantAffine();if(r===0)return i.set(1,1,1),e.identity(),this;let a=Qi.set(s[0],s[1],s[2]).length();const o=Qi.set(s[4],s[5],s[6]).length(),c=Qi.set(s[8],s[9],s[10]).length();r<0&&(a=-a),En.copy(this);const l=1/a,h=1/o,f=1/c;return En.elements[0]*=l,En.elements[1]*=l,En.elements[2]*=l,En.elements[4]*=h,En.elements[5]*=h,En.elements[6]*=h,En.elements[8]*=f,En.elements[9]*=f,En.elements[10]*=f,e.setFromRotationMatrix(En),i.x=a,i.y=o,i.z=c,this}makePerspective(t,e,i,s,r,a,o=An,c=!1){const l=this.elements,h=2*r/(e-t),f=2*r/(i-s),p=(e+t)/(e-t),m=(i+s)/(i-s);let g,M;if(c)g=r/(a-r),M=a*r/(a-r);else if(o===An)g=-(a+r)/(a-r),M=-2*a*r/(a-r);else if(o===ir)g=-a/(a-r),M=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=p,l[12]=0,l[1]=0,l[5]=f,l[9]=m,l[13]=0,l[2]=0,l[6]=0,l[10]=g,l[14]=M,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,e,i,s,r,a,o=An,c=!1){const l=this.elements,h=2/(e-t),f=2/(i-s),p=-(e+t)/(e-t),m=-(i+s)/(i-s);let g,M;if(c)g=1/(a-r),M=a/(a-r);else if(o===An)g=-2/(a-r),M=-(a+r)/(a-r);else if(o===ir)g=-1/(a-r),M=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=0,l[12]=p,l[1]=0,l[5]=f,l[9]=0,l[13]=m,l[2]=0,l[6]=0,l[10]=g,l[14]=M,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){const e=this.elements,i=t.elements;for(let s=0;s<16;s++)if(e[s]!==i[s])return!1;return!0}fromArray(t,e=0){for(let i=0;i<16;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){const i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t[e+9]=i[9],t[e+10]=i[10],t[e+11]=i[11],t[e+12]=i[12],t[e+13]=i[13],t[e+14]=i[14],t[e+15]=i[15],t}};ha.prototype.isMatrix4=!0;let ue=ha;const Qi=new N,En=new ue,Kd=new N(0,0,0),Zd=new N(1,1,1),oi=new N,pr=new N,rn=new N,sc=new ue,rc=new yi;class Ei{constructor(t=0,e=0,i=0,s=Ei.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=i,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,i,s=this._order){return this._x=t,this._y=e,this._z=i,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,i=!0){const s=t.elements,r=s[0],a=s[4],o=s[8],c=s[1],l=s[5],h=s[9],f=s[2],p=s[6],m=s[10];switch(e){case"XYZ":this._y=Math.asin($t(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,m),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(p,l),this._z=0);break;case"YXZ":this._x=Math.asin(-$t(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,m),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-f,r),this._z=0);break;case"ZXY":this._x=Math.asin($t(p,-1,1)),Math.abs(p)<.9999999?(this._y=Math.atan2(-f,m),this._z=Math.atan2(-a,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-$t(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(p,m),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-a,l));break;case"YZX":this._z=Math.asin($t(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-f,r)):(this._x=0,this._y=Math.atan2(o,m));break;case"XZY":this._z=Math.asin(-$t(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(p,l),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-h,m),this._y=0);break;default:Nt("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,i===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,i){return sc.makeRotationFromQuaternion(t),this.setFromRotationMatrix(sc,e,i)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return rc.setFromEuler(this),this.setFromQuaternion(rc,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Ei.DEFAULT_ORDER="XYZ";class Sl{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let Jd=0;const ac=new N,ji=new yi,$n=new ue,mr=new N,Ds=new N,Qd=new N,jd=new yi,oc=new N(1,0,0),lc=new N(0,1,0),cc=new N(0,0,1),hc={type:"added"},tf={type:"removed"},ts={type:"childadded",child:null},Da={type:"childremoved",child:null};class Ae extends wi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Jd++}),this.uuid=Ai(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Ae.DEFAULT_UP.clone();const t=new N,e=new Ei,i=new yi,s=new N(1,1,1);function r(){i.setFromEuler(e,!1)}function a(){e.setFromQuaternion(i,void 0,!1)}e._onChange(r),i._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new ue},normalMatrix:{value:new Ot}}),this.matrix=new ue,this.matrixWorld=new ue,this.matrixAutoUpdate=Ae.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Ae.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Sl,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale),this.pivot!==null&&this.position.copy(this.pivot).applyMatrix4(this.matrix).sub(this.pivot)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return ji.setFromAxisAngle(t,e),this.quaternion.multiply(ji),this}rotateOnWorldAxis(t,e){return ji.setFromAxisAngle(t,e),this.quaternion.premultiply(ji),this}rotateX(t){return this.rotateOnAxis(oc,t)}rotateY(t){return this.rotateOnAxis(lc,t)}rotateZ(t){return this.rotateOnAxis(cc,t)}translateOnAxis(t,e){return ac.copy(t).applyQuaternion(this.quaternion),this.position.add(ac.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(oc,t)}translateY(t){return this.translateOnAxis(lc,t)}translateZ(t){return this.translateOnAxis(cc,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4($n.copy(this.matrixWorld).invert())}lookAt(t,e,i){t.isVector3?mr.copy(t):mr.set(t,e,i);const s=this.parent;this.updateWorldMatrix(!0,!1),Ds.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?$n.lookAt(Ds,mr,this.up):$n.lookAt(mr,Ds,this.up),this.quaternion.setFromRotationMatrix($n),s&&($n.extractRotation(s.matrixWorld),ji.setFromRotationMatrix($n),this.quaternion.premultiply(ji.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(jt("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(hc),ts.child=t,this.dispatchEvent(ts),ts.child=null):jt("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(tf),Da.child=t,this.dispatchEvent(Da),Da.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),$n.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),$n.multiply(t.parent.matrixWorld)),t.applyMatrix4($n),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(hc),ts.child=t,this.dispatchEvent(ts),ts.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let i=0,s=this.children.length;i<s;i++){const a=this.children[i].getObjectByProperty(t,e);if(a!==void 0)return a}}getObjectsByProperty(t,e,i=[]){this[t]===e&&i.push(this);const s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(t,e,i);return i}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ds,t,Qd),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ds,jd,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){return!0}traverse(t){t(this);const e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const t=this.pivot;if(t!==null){const e=t.x,i=t.y,s=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*i-r[8]*s,r[13]+=i-r[1]*e-r[5]*i-r[9]*s,r[14]+=s-r[2]*e-r[6]*i-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].updateMatrixWorld(t)}updateWorldMatrix(t,e,i=!1){const s=this.parent;if(t===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||i)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,i=!0),e===!0){const r=this.children;for(let a=0,o=r.length;a<o;a++)r[a].updateWorldMatrix(!1,!0,i)}}toJSON(t){const e=t===void 0||typeof t=="string",i={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,s.name=this.name,s.castShadow=this.castShadow,s.receiveShadow=this.receiveShadow,s.visible=this.visible,s.frustumCulled=this.frustumCulled,s.renderOrder=this.renderOrder,s.static=this.static,s.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(o=>({...o})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(t)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const c=o.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){const f=c[l];r(t.shapes,f)}else r(t.shapes,c)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(r(t.materials,this.material[c]));s.material=o}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){const c=this.animations[o];s.animations.push(r(t.animations,c))}}if(e){const o=a(t.geometries),c=a(t.materials),l=a(t.textures),h=a(t.images),f=a(t.shapes),p=a(t.skeletons),m=a(t.animations),g=a(t.nodes);o.length>0&&(i.geometries=o),c.length>0&&(i.materials=c),l.length>0&&(i.textures=l),h.length>0&&(i.images=h),f.length>0&&(i.shapes=f),p.length>0&&(i.skeletons=p),m.length>0&&(i.animations=m),g.length>0&&(i.nodes=g)}return i.object=s,i;function a(o){const c=[];for(const l in o){const h=o[l];delete h.metadata,c.push(h)}return c}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let i=0;i<t.children.length;i++){const s=t.children[i];this.add(s.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}}Ae.DEFAULT_UP=new N(0,1,0);Ae.DEFAULT_MATRIX_AUTO_UPDATE=!0;Ae.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class ei extends Ae{constructor(){super(),this.isGroup=!0,this.type="Group"}}const ef={type:"move"};class Ia{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new ei,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new ei,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new N,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new N),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new ei,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new N,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new N,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const i of t.hand.values())this._getHandJoint(e,i)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,i){let s=null,r=null,a=null;const o=this._targetRay,c=this._grip,l=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(l&&t.hand){a=!0;for(const M of t.hand.values()){const d=e.getJointPose(M,i),u=this._getHandJoint(l,M);d!==null&&(u.matrix.fromArray(d.transform.matrix),u.matrix.decompose(u.position,u.quaternion,u.scale),u.matrixWorldNeedsUpdate=!0,u.jointRadius=d.radius),u.visible=d!==null}const h=l.joints["index-finger-tip"],f=l.joints["thumb-tip"],p=h.position.distanceTo(f.position),m=.02,g=.005;l.inputState.pinching&&p>m+g?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!l.inputState.pinching&&p<=m-g&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else c!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,i),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.quaternion,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1,c.eventsEnabled&&c.dispatchEvent({type:"gripUpdated",data:t,target:this})));o!==null&&(s=e.getPose(t.targetRaySpace,i),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(ef)))}return o!==null&&(o.visible=s!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=a!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const i=new ei;i.matrixAutoUpdate=!1,i.visible=!1,t.joints[e.jointName]=i,t.add(i)}return t.joints[e.jointName]}}const qh={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},li={h:0,s:0,l:0},gr={h:0,s:0,l:0};function Na(n,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?n+(t-n)*6*e:e<1/2?t:e<2/3?n+(t-n)*6*(2/3-e):n}class Xt{constructor(t,e,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,i)}set(t,e,i){if(e===void 0&&i===void 0){const s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,i);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=un){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Jt.colorSpaceToWorking(this,e),this}setRGB(t,e,i,s=Jt.workingColorSpace){return this.r=t,this.g=e,this.b=i,Jt.colorSpaceToWorking(this,s),this}setHSL(t,e,i,s=Jt.workingColorSpace){if(t=_l(t,1),e=$t(e,0,1),i=$t(i,0,1),e===0)this.r=this.g=this.b=i;else{const r=i<=.5?i*(1+e):i+e-i*e,a=2*i-r;this.r=Na(a,r,t+1/3),this.g=Na(a,r,t),this.b=Na(a,r,t-1/3)}return Jt.colorSpaceToWorking(this,s),this}setStyle(t,e=un){function i(r){r!==void 0&&parseFloat(r)<1&&Nt("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r;const a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return i(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return i(r[4]),this.setRGB(Math.min(100,parseFloat(r[1]))/100,Math.min(100,parseFloat(r[2]))/100,Math.min(100,parseFloat(r[3]))/100,e);break;case"hsl":case"hsla":if(r=/^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return i(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:Nt("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){const r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(a===6)return this.setHex(parseInt(r,16),e);Nt("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=un){const i=qh[t.toLowerCase()];return i!==void 0?this.setHex(i,e):Nt("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=ii(t.r),this.g=ii(t.g),this.b=ii(t.b),this}copyLinearToSRGB(t){return this.r=Ms(t.r),this.g=Ms(t.g),this.b=Ms(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=un){return Jt.workingToColorSpace(He.copy(this),t),Math.round($t(He.r*255,0,255))*65536+Math.round($t(He.g*255,0,255))*256+Math.round($t(He.b*255,0,255))}getHexString(t=un){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Jt.workingColorSpace){Jt.workingToColorSpace(He.copy(this),e);const i=He.r,s=He.g,r=He.b,a=Math.max(i,s,r),o=Math.min(i,s,r);let c,l;const h=(o+a)/2;if(o===a)c=0,l=0;else{const f=a-o;switch(l=h<=.5?f/(a+o):f/(2-a-o),a){case i:c=(s-r)/f+(s<r?6:0);break;case s:c=(r-i)/f+2;break;case r:c=(i-s)/f+4;break}c/=6}return t.h=c,t.s=l,t.l=h,t}getRGB(t,e=Jt.workingColorSpace){return Jt.workingToColorSpace(He.copy(this),e),t.r=He.r,t.g=He.g,t.b=He.b,t}getStyle(t=un){Jt.workingToColorSpace(He.copy(this),t);const e=He.r,i=He.g,s=He.b;return t!==un?`color(${t} ${e.toFixed(3)} ${i.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(i*255)},${Math.round(s*255)})`}offsetHSL(t,e,i){return this.getHSL(li),this.setHSL(li.h+t,li.s+e,li.l+i)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,i){return this.r=t.r+(e.r-t.r)*i,this.g=t.g+(e.g-t.g)*i,this.b=t.b+(e.b-t.b)*i,this}lerpHSL(t,e){this.getHSL(li),t.getHSL(gr);const i=Ks(li.h,gr.h,e),s=Ks(li.s,gr.s,e),r=Ks(li.l,gr.l,e);return this.setHSL(i,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,i=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*i+r[6]*s,this.g=r[1]*e+r[4]*i+r[7]*s,this.b=r[2]*e+r[5]*i+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const He=new Xt;Xt.NAMES=qh;class yl{constructor(t,e=1,i=1e3){this.isFog=!0,this.name="",this.color=new Xt(t),this.near=e,this.far=i}clone(){return new yl(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class nf extends Ae{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Ei,this.environmentIntensity=1,this.environmentRotation=new Ei,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),this.background=t.background!==null?t.background.clone():null,this.environment=t.environment!==null?t.environment.clone():null,this.fog=t.fog!==null?t.fog.clone():null,this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),this.overrideMaterial=t.overrideMaterial!==null?t.overrideMaterial.clone():null,this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}}const bn=new N,Yn=new N,Ua=new N,qn=new N,es=new N,ns=new N,uc=new N,Fa=new N,Oa=new N,za=new N,ka=new _e,Ba=new _e,Ga=new _e;class Mn{constructor(t=new N,e=new N,i=new N){this.a=t,this.b=e,this.c=i}static getNormal(t,e,i,s){s.subVectors(i,e),bn.subVectors(t,e),s.cross(bn);const r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,i,s,r){bn.subVectors(s,e),Yn.subVectors(i,e),Ua.subVectors(t,e);const a=bn.dot(bn),o=bn.dot(Yn),c=bn.dot(Ua),l=Yn.dot(Yn),h=Yn.dot(Ua),f=a*l-o*o;if(f===0)return r.set(0,0,0),null;const p=1/f,m=(l*c-o*h)*p,g=(a*h-o*c)*p;return r.set(1-m-g,g,m)}static containsPoint(t,e,i,s){return this.getBarycoord(t,e,i,s,qn)===null?!1:qn.x>=0&&qn.y>=0&&qn.x+qn.y<=1}static getInterpolation(t,e,i,s,r,a,o,c){return this.getBarycoord(t,e,i,s,qn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,qn.x),c.addScaledVector(a,qn.y),c.addScaledVector(o,qn.z),c)}static getInterpolatedAttribute(t,e,i,s,r,a){return ka.setScalar(0),Ba.setScalar(0),Ga.setScalar(0),ka.fromBufferAttribute(t,e),Ba.fromBufferAttribute(t,i),Ga.fromBufferAttribute(t,s),a.setScalar(0),a.addScaledVector(ka,r.x),a.addScaledVector(Ba,r.y),a.addScaledVector(Ga,r.z),a}static isFrontFacing(t,e,i,s){return bn.subVectors(i,e),Yn.subVectors(t,e),bn.cross(Yn).dot(s)<0}set(t,e,i){return this.a.copy(t),this.b.copy(e),this.c.copy(i),this}setFromPointsAndIndices(t,e,i,s){return this.a.copy(t[e]),this.b.copy(t[i]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,i,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,i),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return bn.subVectors(this.c,this.b),Yn.subVectors(this.a,this.b),bn.cross(Yn).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return Mn.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return Mn.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,i,s,r){return Mn.getInterpolation(t,this.a,this.b,this.c,e,i,s,r)}containsPoint(t){return Mn.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return Mn.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const i=this.a,s=this.b,r=this.c;let a,o;es.subVectors(s,i),ns.subVectors(r,i),Fa.subVectors(t,i);const c=es.dot(Fa),l=ns.dot(Fa);if(c<=0&&l<=0)return e.copy(i);Oa.subVectors(t,s);const h=es.dot(Oa),f=ns.dot(Oa);if(h>=0&&f<=h)return e.copy(s);const p=c*f-h*l;if(p<=0&&c>=0&&h<=0&&c-h>0)return a=c/(c-h),e.copy(i).addScaledVector(es,a);za.subVectors(t,r);const m=es.dot(za),g=ns.dot(za);if(g>=0&&m<=g)return e.copy(r);const M=m*l-c*g;if(M<=0&&l>=0&&g<=0)return o=l/(l-g),e.copy(i).addScaledVector(ns,o);const d=h*g-m*f;if(d<=0&&f-h>=0&&m-g>=0)return uc.subVectors(r,s),o=(f-h)/(f-h+(m-g)),e.copy(s).addScaledVector(uc,o);const u=1/(d+M+p);return a=M*u,o=p*u,e.copy(i).addScaledVector(es,a).addScaledVector(ns,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}class or{constructor(t=new N(1/0,1/0,1/0),e=new N(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e+=3)this.expandByPoint(Tn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,i=t.count;e<i;e++)this.expandByPoint(Tn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const i=Tn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(i),this.max.copy(t).add(i),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const i=t.geometry;if(i!==void 0){const r=i.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0&&t.isBatchedMesh!==!0)for(let a=0,o=r.count;a<o;a++)t.isMesh===!0?t.getVertexPosition(a,Tn):Tn.fromBufferAttribute(r,a),Tn.applyMatrix4(t.matrixWorld),this.expandByPoint(Tn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),_r.copy(t.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),_r.copy(i.boundingBox)),_r.applyMatrix4(t.matrixWorld),this.union(_r)}const s=t.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Tn),Tn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,i;return t.normal.x>0?(e=t.normal.x*this.min.x,i=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,i=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,i+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,i+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,i+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,i+=t.normal.z*this.min.z),e<=-t.constant&&i>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Is),xr.subVectors(this.max,Is),is.subVectors(t.a,Is),ss.subVectors(t.b,Is),rs.subVectors(t.c,Is),ci.subVectors(ss,is),hi.subVectors(rs,ss),Di.subVectors(is,rs);let e=[0,-ci.z,ci.y,0,-hi.z,hi.y,0,-Di.z,Di.y,ci.z,0,-ci.x,hi.z,0,-hi.x,Di.z,0,-Di.x,-ci.y,ci.x,0,-hi.y,hi.x,0,-Di.y,Di.x,0];return!Ha(e,is,ss,rs,xr)||(e=[1,0,0,0,1,0,0,0,1],!Ha(e,is,ss,rs,xr))?!1:(vr.crossVectors(ci,hi),e=[vr.x,vr.y,vr.z],Ha(e,is,ss,rs,xr))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Tn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Tn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Kn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Kn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Kn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Kn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Kn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Kn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Kn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Kn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Kn),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}}const Kn=[new N,new N,new N,new N,new N,new N,new N,new N],Tn=new N,_r=new or,is=new N,ss=new N,rs=new N,ci=new N,hi=new N,Di=new N,Is=new N,xr=new N,vr=new N,Ii=new N;function Ha(n,t,e,i,s){for(let r=0,a=n.length-3;r<=a;r+=3){Ii.fromArray(n,r);const o=s.x*Math.abs(Ii.x)+s.y*Math.abs(Ii.y)+s.z*Math.abs(Ii.z),c=t.dot(Ii),l=e.dot(Ii),h=i.dot(Ii);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>o)return!1}return!0}const ye=new N,Mr=new At;let sf=0;class Mi extends wi{constructor(t,e,i=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:sf++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=i,this.usage=Wh,this.updateRanges=[],this.gpuType=kn,this.version=0,this._normalizationScale=t!==void 0?ua(t):void 0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this._normalizationScale=t._normalizationScale,this}copyAt(t,e,i){t*=this.itemSize,i*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[i+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,i=this.count;e<i;e++)Mr.fromBufferAttribute(this,e),Mr.applyMatrix3(t),this.setXY(e,Mr.x,Mr.y);else if(this.itemSize===3)for(let e=0,i=this.count;e<i;e++)ye.fromBufferAttribute(this,e),ye.applyMatrix3(t),this.setXYZ(e,ye.x,ye.y,ye.z);return this}applyMatrix4(t){for(let e=0,i=this.count;e<i;e++)ye.fromBufferAttribute(this,e),ye.applyMatrix4(t),this.setXYZ(e,ye.x,ye.y,ye.z);return this}applyNormalMatrix(t){for(let e=0,i=this.count;e<i;e++)ye.fromBufferAttribute(this,e),ye.applyNormalMatrix(t),this.setXYZ(e,ye.x,ye.y,ye.z);return this}transformDirection(t){for(let e=0,i=this.count;e<i;e++)ye.fromBufferAttribute(this,e),ye.transformDirection(t),this.setXYZ(e,ye.x,ye.y,ye.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let i=this.array[t*this.itemSize+e];return this.normalized&&(i=this._denormalize(i)),i}setComponent(t,e,i){return this.normalized&&(i=this._normalize(i)),this.array[t*this.itemSize+e]=i,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=this._denormalize(e)),e}setX(t,e){return this.normalized&&(e=this._normalize(e)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=this._denormalize(e)),e}setY(t,e){return this.normalized&&(e=this._normalize(e)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=this._denormalize(e)),e}setZ(t,e){return this.normalized&&(e=this._normalize(e)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=this._denormalize(e)),e}setW(t,e){return this.normalized&&(e=this._normalize(e)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,i){return t*=this.itemSize,this.normalized&&(e=this._normalize(e),i=this._normalize(i)),this.array[t+0]=e,this.array[t+1]=i,this}setXYZ(t,e,i,s){return t*=this.itemSize,this.normalized&&(e=this._normalize(e),i=this._normalize(i),s=this._normalize(s)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=s,this}setXYZW(t,e,i,s,r){return t*=this.itemSize,this.normalized&&(e=this._normalize(e),i=this._normalize(i),s=this._normalize(s),r=this._normalize(r)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}_denormalize(t){const e=this._normalizationScale;return e!==void 0?Math.max(t/e,-1):xl(t,this.array)}_normalize(t){const e=this._normalizationScale;return e!==void 0?Math.round(t*e):vl(t,this.array)}}class Kh extends Mi{constructor(t,e,i){super(new Uint16Array(t),e,i)}}class Zh extends Mi{constructor(t,e,i){super(new Uint32Array(t),e,i)}}class ae extends Mi{constructor(t,e,i){super(new Float32Array(t),e,i)}}const rf=new or,Ns=new N,Va=new N;class da{constructor(t=new N,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const i=this.center;e!==void 0?i.copy(e):rf.setFromPoints(t).getCenter(i);let s=0;for(let r=0,a=t.length;r<a;r++)s=Math.max(s,i.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const i=this.center.distanceToSquared(t);return e.copy(t),i>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Ns.subVectors(t,this.center);const e=Ns.lengthSq();if(e>this.radius*this.radius){const i=Math.sqrt(e),s=(i-this.radius)*.5;this.center.addScaledVector(Ns,s/i),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Va.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Ns.copy(t.center).add(Va)),this.expandByPoint(Ns.copy(t.center).sub(Va))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}}let af=0;const _n=new ue,Wa=new Ae,as=new N,an=new or,Us=new or,Ie=new N;class ve extends wi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:af++}),this.uuid=Ai(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(bd(t)?Zh:Kh)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,i=0){this.groups.push({start:t,count:e,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const r=new Ot().getNormalMatrix(t);i.applyNormalMatrix(r),i.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return _n.makeRotationFromQuaternion(t),this.applyMatrix4(_n),this}rotateX(t){return _n.makeRotationX(t),this.applyMatrix4(_n),this}rotateY(t){return _n.makeRotationY(t),this.applyMatrix4(_n),this}rotateZ(t){return _n.makeRotationZ(t),this.applyMatrix4(_n),this}translate(t,e,i){return _n.makeTranslation(t,e,i),this.applyMatrix4(_n),this}scale(t,e,i){return _n.makeScale(t,e,i),this.applyMatrix4(_n),this}lookAt(t){return Wa.lookAt(t),Wa.updateMatrix(),this.applyMatrix4(Wa.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(as).negate(),this.translate(as.x,as.y,as.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const i=[];for(let s=0,r=t.length;s<r;s++){const a=t[s];i.push(a.x,a.y,a.z||0)}this.setAttribute("position",new ae(i,3))}else{const i=Math.min(t.length,e.count);for(let s=0;s<i;s++){const r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&Nt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new or);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){jt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new N(-1/0,-1/0,-1/0),new N(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let i=0,s=e.length;i<s;i++){const r=e[i];an.setFromBufferAttribute(r),this.morphTargetsRelative?(Ie.addVectors(this.boundingBox.min,an.min),this.boundingBox.expandByPoint(Ie),Ie.addVectors(this.boundingBox.max,an.max),this.boundingBox.expandByPoint(Ie)):(this.boundingBox.expandByPoint(an.min),this.boundingBox.expandByPoint(an.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&jt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new da);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){jt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new N,1/0);return}if(t){const i=this.boundingSphere.center;if(an.setFromBufferAttribute(t),e)for(let r=0,a=e.length;r<a;r++){const o=e[r];Us.setFromBufferAttribute(o),this.morphTargetsRelative?(Ie.addVectors(an.min,Us.min),an.expandByPoint(Ie),Ie.addVectors(an.max,Us.max),an.expandByPoint(Ie)):(an.expandByPoint(Us.min),an.expandByPoint(Us.max))}an.getCenter(i);let s=0;for(let r=0,a=t.count;r<a;r++)Ie.fromBufferAttribute(t,r),s=Math.max(s,i.distanceToSquared(Ie));if(e)for(let r=0,a=e.length;r<a;r++){const o=e[r],c=this.morphTargetsRelative;for(let l=0,h=o.count;l<h;l++)Ie.fromBufferAttribute(o,l),c&&(as.fromBufferAttribute(t,l),Ie.add(as)),s=Math.max(s,i.distanceToSquared(Ie))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&jt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){jt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=e.position,s=e.normal,r=e.uv;let a=this.getAttribute("tangent");(a===void 0||a.count!==i.count)&&(a=new Mi(new Float32Array(4*i.count),4),this.setAttribute("tangent",a));const o=[],c=[],l=new Uint8Array(i.count);for(let L=0;L<i.count;L++)o[L]=new N,c[L]=new N;const h=new N,f=new N,p=new N,m=new At,g=new At,M=new At,d=new N,u=new N;function v(L,R,I){l[L]=l[R]=l[I]=1,h.fromBufferAttribute(i,L),f.fromBufferAttribute(i,R),p.fromBufferAttribute(i,I),m.fromBufferAttribute(r,L),g.fromBufferAttribute(r,R),M.fromBufferAttribute(r,I),f.sub(h),p.sub(h),g.sub(m),M.sub(m);const F=1/(g.x*M.y-M.x*g.y);isFinite(F)&&(d.copy(f).multiplyScalar(M.y).addScaledVector(p,-g.y).multiplyScalar(F),u.copy(p).multiplyScalar(g.x).addScaledVector(f,-M.x).multiplyScalar(F),o[L].add(d),o[R].add(d),o[I].add(d),c[L].add(u),c[R].add(u),c[I].add(u))}let b=this.groups;b.length===0&&(b=[{start:0,count:t.count}]);for(let L=0,R=b.length;L<R;++L){const I=b[L],F=I.start,z=I.count;for(let C=F,H=F+z;C<H;C+=3)v(t.getX(C+0),t.getX(C+1),t.getX(C+2))}const y=new N,w=new N,T=new N,_=new N;function E(L){T.fromBufferAttribute(s,L),_.copy(T);const R=o[L];y.copy(R),y.sub(T.multiplyScalar(T.dot(R))).normalize(),w.crossVectors(_,R);const F=w.dot(c[L])<0?-1:1;a.setXYZW(L,y.x,y.y,y.z,F)}for(let L=0,R=i.count;L<R;++L)l[L]&&E(L);this._transformed=!0}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let i=this.getAttribute("normal");if(i===void 0||i.count!==e.count)i=new Mi(new Float32Array(e.count*3),3),this.setAttribute("normal",i);else for(let p=0,m=i.count;p<m;p++)i.setXYZ(p,0,0,0);const s=new N,r=new N,a=new N,o=new N,c=new N,l=new N,h=new N,f=new N;if(t)for(let p=0,m=t.count;p<m;p+=3){const g=t.getX(p+0),M=t.getX(p+1),d=t.getX(p+2);s.fromBufferAttribute(e,g),r.fromBufferAttribute(e,M),a.fromBufferAttribute(e,d),h.subVectors(a,r),f.subVectors(s,r),h.cross(f),o.fromBufferAttribute(i,g),c.fromBufferAttribute(i,M),l.fromBufferAttribute(i,d),o.add(h),c.add(h),l.add(h),i.setXYZ(g,o.x,o.y,o.z),i.setXYZ(M,c.x,c.y,c.z),i.setXYZ(d,l.x,l.y,l.z)}else for(let p=0,m=e.count;p<m;p+=3)s.fromBufferAttribute(e,p+0),r.fromBufferAttribute(e,p+1),a.fromBufferAttribute(e,p+2),h.subVectors(a,r),f.subVectors(s,r),h.cross(f),i.setXYZ(p+0,h.x,h.y,h.z),i.setXYZ(p+1,h.x,h.y,h.z),i.setXYZ(p+2,h.x,h.y,h.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,i=t.count;e<i;e++)Ie.fromBufferAttribute(t,e),Ie.normalize(),t.setXYZ(e,Ie.x,Ie.y,Ie.z)}toNonIndexed(){function t(o,c){const l=o.array,h=o.itemSize,f=o.normalized,p=new l.constructor(c.length*h);let m=0,g=0;for(let M=0,d=c.length;M<d;M++){o.isInterleavedBufferAttribute?m=c[M]*o.data.stride+o.offset:m=c[M]*h;for(let u=0;u<h;u++)p[g++]=l[m++]}return new Mi(p,h,f)}if(this.index===null)return Nt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new ve,i=this.index.array,s=this.attributes;for(const o in s){const c=s[o],l=t(c,i);e.setAttribute(o,l)}const r=this.morphAttributes;for(const o in r){const c=[],l=r[o];for(let h=0,f=l.length;h<f;h++){const p=l[h],m=t(p,i);c.push(m)}e.morphAttributes[o]=c}e.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,c=a.length;o<c;o++){const l=a[o];e.addGroup(l.start,l.count,l.materialIndex)}return e}toJSON(){const t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(t[l]=c[l]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const i=this.attributes;for(const c in i){const l=i[c];t.data.attributes[c]=l.toJSON(t.data)}const s={};let r=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],h=[];for(let f=0,p=l.length;f<p;f++){const m=l[f];h.push(m.toJSON(t.data))}h.length>0&&(s[c]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(t.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(t.data.boundingSphere=o.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const i=t.index;i!==null&&this.setIndex(i.clone());const s=t.attributes;for(const l in s){const h=s[l];this.setAttribute(l,h.clone(e))}const r=t.morphAttributes;for(const l in r){const h=[],f=r[l];for(let p=0,m=f.length;p<m;p++)h.push(f[p].clone(e));this.morphAttributes[l]=h}this.morphTargetsRelative=t.morphTargetsRelative;const a=t.groups;for(let l=0,h=a.length;l<h;l++){const f=a[l];this.addGroup(f.start,f.count,f.materialIndex)}const o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());const c=t.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}class of{constructor(t,e){this.isInterleavedBuffer=!0,this.array=t,this.stride=e,this.count=t!==void 0?t.length/e:0,this.usage=Wh,this.updateRanges=[],this.version=0,this.uuid=Ai()}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.array=new t.array.constructor(t.array),this.count=t.count,this.stride=t.stride,this.usage=t.usage,this}copyAt(t,e,i){t*=this.stride,i*=e.stride;for(let s=0,r=this.stride;s<r;s++)this.array[t+s]=e.array[i+s];return this}set(t,e=0){return this.array.set(t,e),this}clone(t){t.arrayBuffers===void 0&&(t.arrayBuffers={});const e=dc(this.array);t.arrayBuffers[e]===void 0&&(t.arrayBuffers[e]=this.array.slice(0).buffer);const i=new this.array.constructor(t.arrayBuffers[e]),s=new this.constructor(i,this.stride);return s.setUsage(this.usage),s}onUpload(t){return this.onUploadCallback=t,this}toJSON(t){t.arrayBuffers===void 0&&(t.arrayBuffers={});const e=dc(this.array);t.arrayBuffers[e]===void 0&&(t.arrayBuffers[e]=Array.from(new Uint32Array(this.array.slice(0).buffer)));const i={uuid:this.uuid,buffer:e,type:this.array.constructor.name,stride:this.stride};return i.usage=this.usage,i}}function dc(n){return n.buffer._uuid===void 0&&(n.buffer._uuid=Ai()),n.byteOffset===0&&n.byteLength===n.buffer.byteLength?n.buffer._uuid:n.buffer._uuid+":"+n.byteOffset+":"+n.byteLength}const $e=new N;class ia{constructor(t,e,i,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=t,this.itemSize=e,this.offset=i,this.normalized=s,this._normalizationScale=t!==void 0?ua(t.array):void 0}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(t){this.data.needsUpdate=t}applyMatrix4(t){for(let e=0,i=this.data.count;e<i;e++)$e.fromBufferAttribute(this,e),$e.applyMatrix4(t),this.setXYZ(e,$e.x,$e.y,$e.z);return this}applyNormalMatrix(t){for(let e=0,i=this.count;e<i;e++)$e.fromBufferAttribute(this,e),$e.applyNormalMatrix(t),this.setXYZ(e,$e.x,$e.y,$e.z);return this}transformDirection(t){for(let e=0,i=this.count;e<i;e++)$e.fromBufferAttribute(this,e),$e.transformDirection(t),this.setXYZ(e,$e.x,$e.y,$e.z);return this}getComponent(t,e){let i=this.array[t*this.data.stride+this.offset+e];return this.normalized&&(i=this._denormalize(i)),i}setComponent(t,e,i){return this.normalized&&(i=this._normalize(i)),this.data.array[t*this.data.stride+this.offset+e]=i,this}setX(t,e){return this.normalized&&(e=this._normalize(e)),this.data.array[t*this.data.stride+this.offset]=e,this}setY(t,e){return this.normalized&&(e=this._normalize(e)),this.data.array[t*this.data.stride+this.offset+1]=e,this}setZ(t,e){return this.normalized&&(e=this._normalize(e)),this.data.array[t*this.data.stride+this.offset+2]=e,this}setW(t,e){return this.normalized&&(e=this._normalize(e)),this.data.array[t*this.data.stride+this.offset+3]=e,this}getX(t){let e=this.data.array[t*this.data.stride+this.offset];return this.normalized&&(e=this._denormalize(e)),e}getY(t){let e=this.data.array[t*this.data.stride+this.offset+1];return this.normalized&&(e=this._denormalize(e)),e}getZ(t){let e=this.data.array[t*this.data.stride+this.offset+2];return this.normalized&&(e=this._denormalize(e)),e}getW(t){let e=this.data.array[t*this.data.stride+this.offset+3];return this.normalized&&(e=this._denormalize(e)),e}setXY(t,e,i){return t=t*this.data.stride+this.offset,this.normalized&&(e=this._normalize(e),i=this._normalize(i)),this.data.array[t+0]=e,this.data.array[t+1]=i,this}setXYZ(t,e,i,s){return t=t*this.data.stride+this.offset,this.normalized&&(e=this._normalize(e),i=this._normalize(i),s=this._normalize(s)),this.data.array[t+0]=e,this.data.array[t+1]=i,this.data.array[t+2]=s,this}setXYZW(t,e,i,s,r){return t=t*this.data.stride+this.offset,this.normalized&&(e=this._normalize(e),i=this._normalize(i),s=this._normalize(s),r=this._normalize(r)),this.data.array[t+0]=e,this.data.array[t+1]=i,this.data.array[t+2]=s,this.data.array[t+3]=r,this}clone(t){if(t===void 0){na("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const e=[];for(let i=0;i<this.count;i++){const s=i*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return new Mi(new this.array.constructor(e),this.itemSize,this.normalized)}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new ia(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(t){if(t===void 0){na("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const e=[];for(let i=0;i<this.count;i++){const s=i*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.toJSON(t)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}_denormalize(t){const e=this._normalizationScale;return e!==void 0?Math.max(t/e,-1):xl(t,this.data.array)}_normalize(t){const e=this._normalizationScale;return e!==void 0?Math.round(t*e):vl(t,this.data.array)}}const Xa=new N,lf=new N,cf=new Ot;class Nn{constructor(t=new N(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,i,s){return this.normal.set(t,e,i),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,i){const s=Xa.subVectors(i,e).cross(lf.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,i=!0){const s=t.delta(Xa),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const a=-(t.start.dot(this.normal)+this.constant)/r;return i===!0&&(a<0||a>1)?null:e.copy(t.start).addScaledVector(s,a)}intersectsLine(t){const e=this.distanceToPoint(t.start),i=this.distanceToPoint(t.end);return e<0&&i>0||i<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const i=e||cf.getNormalMatrix(t),s=this.coplanarPoint(Xa).applyMatrix4(t),r=this.normal.applyMatrix3(i).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}}let hf=0;class Ki extends wi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:hf++}),this.uuid=Ai(),this.name="",this.type="Material",this.blending=Ys,this.side=Hi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Eh,this.blendDst=bh,this.blendEquation=fs,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Xt(0,0,0),this.blendAlpha=0,this.depthFunc=tr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=xd,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Aa,this.stencilZFail=Aa,this.stencilZPass=Aa,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const i=t[e];if(i===void 0){Nt(`Material: parameter '${e}' has value of undefined.`);continue}const s=this[e];if(s===void 0){Nt(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(i):s&&s.isVector2&&i&&i.isVector2||s&&s.isEuler&&i&&i.isEuler||s&&s.isVector3&&i&&i.isVector3?s.copy(i):this[e]=i}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,i.blending=this.blending,i.side=this.side,i.shadowSide=this.shadowSide,i.vertexColors=this.vertexColors,i.opacity=this.opacity,i.transparent=this.transparent,i.blendSrc=this.blendSrc,i.blendDst=this.blendDst,i.blendEquation=this.blendEquation,i.blendSrcAlpha=this.blendSrcAlpha,i.blendDstAlpha=this.blendDstAlpha,i.blendEquationAlpha=this.blendEquationAlpha,i.blendColor=this.blendColor.getHex(),i.blendAlpha=this.blendAlpha,i.depthFunc=this.depthFunc,i.depthTest=this.depthTest,i.depthWrite=this.depthWrite,i.colorWrite=this.colorWrite,i.clipIntersection=this.clipIntersection,i.clipShadows=this.clipShadows,i.stencilWriteMask=this.stencilWriteMask,i.stencilFunc=this.stencilFunc,i.stencilRef=this.stencilRef,i.stencilFuncMask=this.stencilFuncMask,i.stencilFail=this.stencilFail,i.stencilZFail=this.stencilZFail,i.stencilZPass=this.stencilZPass,i.stencilWrite=this.stencilWrite,i.polygonOffset=this.polygonOffset,i.polygonOffsetFactor=this.polygonOffsetFactor,i.polygonOffsetUnits=this.polygonOffsetUnits,i.dithering=this.dithering,i.alphaTest=this.alphaTest,i.alphaHash=this.alphaHash,i.alphaToCoverage=this.alphaToCoverage,i.premultipliedAlpha=this.premultipliedAlpha,i.forceSinglePass=this.forceSinglePass,i.allowOverride=this.allowOverride,i.visible=this.visible,i.toneMapped=this.toneMapped,i.name=this.name,this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.diffuseRoughness!==void 0&&(i.diffuseRoughness=this.diffuseRoughness),this.diffuseRoughnessMap&&this.diffuseRoughnessMap.isTexture&&(i.diffuseRoughnessMap=this.diffuseRoughnessMap.toJSON(t).uuid),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(i.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessMinimum!==void 0&&(i.iridescenceThicknessMinimum=this.iridescenceThicknessMinimum),this.iridescenceThicknessMaximum!==void 0&&(i.iridescenceThicknessMaximum=this.iridescenceThicknessMaximum),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(t).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(t).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(t).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(t).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(t).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(i.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(i.rotation=this.rotation),this.depthPacking!==void 0&&(i.depthPacking=this.depthPacking),this.linewidth!==void 0&&(i.linewidth=this.linewidth),this.linecap!==void 0&&(i.linecap=this.linecap),this.linejoin!==void 0&&(i.linejoin=this.linejoin),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.wireframe!==void 0&&(i.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(i.flatShading=this.flatShading),this.fog!==void 0&&(i.fog=this.fog),Object.keys(this.userData).length>0&&(i.userData=this.userData);function s(r){const a=[];for(const o in r){const c=r[o];delete c.metadata,a.push(c)}return a}if(e){const r=s(t.textures),a=s(t.images);r.length>0&&(i.textures=r),a.length>0&&(i.images=a)}return i}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new Xt().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.diffuseRoughness!==void 0&&(this.diffuseRoughness=t.diffuseRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessMinimum!==void 0&&(this.iridescenceThicknessMinimum=t.iridescenceThicknessMinimum),t.iridescenceThicknessMaximum!==void 0&&(this.iridescenceThicknessMaximum=t.iridescenceThicknessMaximum),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessMinimum=t.iridescenceThicknessRange[0],this.iridescenceThicknessMaximum=t.iridescenceThicknessRange[1]),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(i=>new Nn().fromJSON(i))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let i=t.normalScale;Array.isArray(i)===!1&&(i=[i,i]),this.normalScale=new At().fromArray(i)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new At().fromArray(t.clearcoatNormalScale)),t.diffuseRoughnessMap!==void 0&&(this.diffuseRoughnessMap=e[t.diffuseRoughnessMap]||null),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let i=null;if(e!==null){const s=e.length;i=new Array(s);for(let r=0;r!==s;++r)i[r]=e[r].clone()}return this.clippingPlanes=i,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}}class Jh extends Ki{constructor(t){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new Xt(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.rotation=t.rotation,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}}let os;const Fs=new N,ls=new N,cs=new N,hs=new At,Os=new At,Qh=new ue,Sr=new N,zs=new N,yr=new N,fc=new At,$a=new At,pc=new At;class uf extends Ae{constructor(t=new Jh){if(super(),this.isSprite=!0,this.type="Sprite",os===void 0){os=new ve;const e=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),i=new of(e,5);os.setIndex([0,1,2,0,2,3]),os.setAttribute("position",new ia(i,3,0,!1)),os.setAttribute("uv",new ia(i,2,3,!1))}this.geometry=os,this.material=t,this.center=new At(.5,.5),this.count=1}intersectsFrustum(t){return t.intersectsSprite(this)}raycast(t,e){t.camera===null&&jt('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),ls.setFromMatrixScale(this.matrixWorld),Qh.copy(t.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(t.camera.matrixWorldInverse,this.matrixWorld),cs.setFromMatrixPosition(this.modelViewMatrix),t.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&ls.multiplyScalar(-cs.z);const i=this.material.rotation;let s,r;i!==0&&(r=Math.cos(i),s=Math.sin(i));const a=this.center;Er(Sr.set(-.5,-.5,0),cs,a,ls,s,r),Er(zs.set(.5,-.5,0),cs,a,ls,s,r),Er(yr.set(.5,.5,0),cs,a,ls,s,r),fc.set(0,0),$a.set(1,0),pc.set(1,1);let o=t.ray.intersectTriangle(Sr,zs,yr,!1,Fs);if(o===null&&(Er(zs.set(-.5,.5,0),cs,a,ls,s,r),$a.set(0,1),o=t.ray.intersectTriangle(Sr,yr,zs,!1,Fs),o===null))return;const c=t.ray.origin.distanceTo(Fs);c<t.near||c>t.far||e.push({distance:c,point:Fs.clone(),uv:Mn.getInterpolation(Fs,Sr,zs,yr,fc,$a,pc,new At),face:null,object:this})}copy(t,e){return super.copy(t,e),t.center!==void 0&&this.center.copy(t.center),this.material=t.material,this}toJSON(t){const e=super.toJSON(t);return e.object.center=this.center.toArray(),e}}function Er(n,t,e,i,s,r){hs.subVectors(n,e).addScalar(.5).multiply(i),s!==void 0?(Os.x=r*hs.x-s*hs.y,Os.y=s*hs.x+r*hs.y):Os.copy(hs),n.copy(t),n.x+=Os.x,n.y+=Os.y,n.applyMatrix4(Qh)}const Zn=new N,Ya=new N,br=new N,Tr=new N;class fa{constructor(t=new N,e=new N(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Zn)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const i=e.dot(this.direction);return i<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=Zn.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Zn.copy(this.origin).addScaledVector(this.direction,e),Zn.distanceToSquared(t))}distanceSqToSegment(t,e,i,s){Ya.copy(t).add(e).multiplyScalar(.5),br.copy(e).sub(t).normalize(),Tr.copy(this.origin).sub(Ya);const r=t.distanceTo(e)*.5,a=-this.direction.dot(br),o=Tr.dot(this.direction),c=-Tr.dot(br),l=Tr.lengthSq(),h=Math.abs(1-a*a);let f,p,m,g;if(h>0)if(f=a*c-o,p=a*o-c,g=r*h,f>=0)if(p>=-g)if(p<=g){const M=1/h;f*=M,p*=M,m=f*(f+a*p+2*o)+p*(a*f+p+2*c)+l}else p=r,f=Math.max(0,-(a*p+o)),m=-f*f+p*(p+2*c)+l;else p=-r,f=Math.max(0,-(a*p+o)),m=-f*f+p*(p+2*c)+l;else p<=-g?(f=Math.max(0,-(-a*r+o)),p=f>0?-r:Math.min(Math.max(-r,-c),r),m=-f*f+p*(p+2*c)+l):p<=g?(f=0,p=Math.min(Math.max(-r,-c),r),m=p*(p+2*c)+l):(f=Math.max(0,-(a*r+o)),p=f>0?r:Math.min(Math.max(-r,-c),r),m=-f*f+p*(p+2*c)+l);else p=a>0?-r:r,f=Math.max(0,-(a*p+o)),m=-f*f+p*(p+2*c)+l;return i&&i.copy(this.origin).addScaledVector(this.direction,f),s&&s.copy(Ya).addScaledVector(br,p),m}intersectSphere(t,e){if(t.radius<0)return null;Zn.subVectors(t.center,this.origin);const i=Zn.dot(this.direction),s=Zn.dot(Zn)-i*i,r=t.radius*t.radius;if(s>r)return null;const a=Math.sqrt(r-s),o=i-a,c=i+a;return c<0?null:o<0?this.at(c,e):this.at(o,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(t.normal)+t.constant)/e;return i>=0?i:null}intersectPlane(t,e){const i=this.distanceToPlane(t);return i===null?null:this.at(i,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let i,s,r,a,o,c;const l=1/this.direction.x,h=1/this.direction.y,f=1/this.direction.z,p=this.origin;return l>=0?(i=(t.min.x-p.x)*l,s=(t.max.x-p.x)*l):(i=(t.max.x-p.x)*l,s=(t.min.x-p.x)*l),h>=0?(r=(t.min.y-p.y)*h,a=(t.max.y-p.y)*h):(r=(t.max.y-p.y)*h,a=(t.min.y-p.y)*h),i>a||r>s||((r>i||isNaN(i))&&(i=r),(a<s||isNaN(s))&&(s=a),f>=0?(o=(t.min.z-p.z)*f,c=(t.max.z-p.z)*f):(o=(t.max.z-p.z)*f,c=(t.min.z-p.z)*f),i>c||o>s)||((o>i||i!==i)&&(i=o),(c<s||s!==s)&&(s=c),s<0)?null:this.at(i>=0?i:s,e)}intersectsBox(t){return this.intersectBox(t,Zn)!==null}intersectTriangle(t,e,i,s,r){const a=this.origin,o=this.direction,c=o.x,l=o.y,h=o.z,f=t.x-a.x,p=t.y-a.y,m=t.z-a.z,g=e.x-a.x,M=e.y-a.y,d=e.z-a.z,u=i.x-a.x,v=i.y-a.y,b=i.z-a.z,y=Math.abs(c),w=Math.abs(l),T=Math.abs(h);let _,E,L,R,I,F,z,C,H,$,V,et;if(y>=w&&y>=T?(L=c,F=f,H=g,et=u,c>=0?(_=l,E=h,R=p,I=m,z=M,C=d,$=v,V=b):(_=h,E=l,R=m,I=p,z=d,C=M,$=b,V=v)):w>=T?(L=l,F=p,H=M,et=v,l>=0?(_=h,E=c,R=m,I=f,z=d,C=g,$=b,V=u):(_=c,E=h,R=f,I=m,z=g,C=d,$=u,V=b)):(L=h,F=m,H=d,et=b,h>=0?(_=c,E=l,R=f,I=p,z=g,C=M,$=u,V=v):(_=l,E=c,R=p,I=f,z=M,C=g,$=v,V=u)),L===0)return null;const U=_/L,X=E/L,J=1/L,dt=R-U*F,Tt=I-X*F,K=z-U*H,gt=C-X*H,Mt=$-U*et,Ct=V-X*et,_t=Mt*gt-Ct*K,kt=dt*Ct-Tt*Mt,Me=K*Tt-gt*dt;if(s){if(_t<0||kt<0||Me<0)return null}else if((_t<0||kt<0||Me<0)&&(_t>0||kt>0||Me>0))return null;const It=_t+kt+Me;if(It===0)return null;const ne=J*(_t*F+kt*H+Me*et);return(It>0?ne<0:ne>0)?null:this.at(ne/It,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class zi extends Ki{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Xt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Ei,this.combine=Th,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const mc=new ue,Ni=new fa,wr=new da,gc=new N,Ar=new N,Rr=new N,Cr=new N,qa=new N,Pr=new N,_c=new N,Lr=new N;class Oe extends Ae{constructor(t=new ve,e=new zi){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0?this.morphTargetInfluences=t.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,t.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){const s=e[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){const o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(t,e){const i=this.geometry,s=i.attributes.position,r=i.morphAttributes.position,a=i.morphTargetsRelative;e.fromBufferAttribute(s,t);const o=this.morphTargetInfluences;if(r&&o){Pr.set(0,0,0);for(let c=0,l=r.length;c<l;c++){const h=o[c],f=r[c];h!==0&&(qa.fromBufferAttribute(f,t),a?Pr.addScaledVector(qa,h):Pr.addScaledVector(qa.sub(e),h))}e.add(Pr)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){const i=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),wr.copy(i.boundingSphere),wr.applyMatrix4(r),Ni.copy(t.ray).recast(t.near),!(wr.containsPoint(Ni.origin)===!1&&(Ni.intersectSphere(wr,gc)===null||Ni.origin.distanceToSquared(gc)>(t.far-t.near)**2))&&(mc.copy(r).invert(),Ni.copy(t.ray).applyMatrix4(mc),!(i.boundingBox!==null&&Ni.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(t,e,Ni)))}_computeIntersections(t,e,i){let s;const r=this.geometry,a=this.material,o=r.index,c=r.attributes.position,l=r.attributes.uv,h=r.attributes.uv1,f=r.attributes.normal,p=r.groups,m=r.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,M=p.length;g<M;g++){const d=p[g],u=a[d.materialIndex],v=Math.max(d.start,m.start),b=Math.min(o.count,Math.min(d.start+d.count,m.start+m.count));for(let y=v,w=b;y<w;y+=3){const T=o.getX(y),_=o.getX(y+1),E=o.getX(y+2);s=Dr(this,u,t,i,l,h,f,T,_,E),s&&(s.faceIndex=Math.floor(y/3),s.face.materialIndex=d.materialIndex,e.push(s))}}else{const g=Math.max(0,m.start),M=Math.min(o.count,m.start+m.count);for(let d=g,u=M;d<u;d+=3){const v=o.getX(d),b=o.getX(d+1),y=o.getX(d+2);s=Dr(this,a,t,i,l,h,f,v,b,y),s&&(s.faceIndex=Math.floor(d/3),e.push(s))}}else if(c!==void 0)if(Array.isArray(a))for(let g=0,M=p.length;g<M;g++){const d=p[g],u=a[d.materialIndex],v=Math.max(d.start,m.start),b=Math.min(c.count,Math.min(d.start+d.count,m.start+m.count));for(let y=v,w=b;y<w;y+=3){const T=y,_=y+1,E=y+2;s=Dr(this,u,t,i,l,h,f,T,_,E),s&&(s.faceIndex=Math.floor(y/3),s.face.materialIndex=d.materialIndex,e.push(s))}}else{const g=Math.max(0,m.start),M=Math.min(c.count,m.start+m.count);for(let d=g,u=M;d<u;d+=3){const v=d,b=d+1,y=d+2;s=Dr(this,a,t,i,l,h,f,v,b,y),s&&(s.faceIndex=Math.floor(d/3),e.push(s))}}}}function df(n,t,e,i,s,r,a,o){let c;if(t.side===sn?c=i.intersectTriangle(a,r,s,!0,o):c=i.intersectTriangle(s,r,a,t.side===Hi,o),c===null)return null;Lr.copy(o),Lr.applyMatrix4(n.matrixWorld);const l=e.ray.origin.distanceTo(Lr);return l<e.near||l>e.far?null:{distance:l,point:Lr.clone(),object:n}}function Dr(n,t,e,i,s,r,a,o,c,l){n.getVertexPosition(o,Ar),n.getVertexPosition(c,Rr),n.getVertexPosition(l,Cr);const h=df(n,t,e,i,Ar,Rr,Cr,_c);if(h){const f=new N;Mn.getBarycoord(_c,Ar,Rr,Cr,f),s&&(h.uv=Mn.getInterpolatedAttribute(s,o,c,l,f,new At)),r&&(h.uv1=Mn.getInterpolatedAttribute(r,o,c,l,f,new At)),a&&(h.normal=Mn.getInterpolatedAttribute(a,o,c,l,f,new N),h.normal.dot(i.direction)>0&&h.normal.multiplyScalar(-1));const p={a:o,b:c,c:l,normal:new N,materialIndex:0};Mn.getNormal(Ar,Rr,Cr,p.normal),h.face=p,h.barycoord=f}return h}class ff extends We{constructor(t=null,e=1,i=1,s,r,a,o,c,l=ze,h=ze,f,p){super(null,a,o,c,l,h,s,r,f,p),this.isDataTexture=!0,this.image={data:t,width:e,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Ui=new da,pf=new At(.5,.5),Ir=new N;class ar{constructor(t=new Nn,e=new Nn,i=new Nn,s=new Nn,r=new Nn,a=new Nn){this.planes=[t,e,i,s,r,a]}set(t,e,i,s,r,a){const o=this.planes;return o[0].copy(t),o[1].copy(e),o[2].copy(i),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(t){const e=this.planes;for(let i=0;i<6;i++)e[i].copy(t.planes[i]);return this}setFromProjectionMatrix(t,e=An,i=!1){const s=this.planes,r=t.elements,a=r[0],o=r[1],c=r[2],l=r[3],h=r[4],f=r[5],p=r[6],m=r[7],g=r[8],M=r[9],d=r[10],u=r[11],v=r[12],b=r[13],y=r[14],w=r[15];if(s[0].setComponents(l-a,m-h,u-g,w-v).normalize(),s[1].setComponents(l+a,m+h,u+g,w+v).normalize(),s[2].setComponents(l+o,m+f,u+M,w+b).normalize(),s[3].setComponents(l-o,m-f,u-M,w-b).normalize(),i)s[4].setComponents(c,p,d,y).normalize(),s[5].setComponents(l-c,m-p,u-d,w-y).normalize();else if(s[4].setComponents(l-c,m-p,u-d,w-y).normalize(),e===An)s[5].setComponents(l+c,m+p,u+d,w+y).normalize();else if(e===ir)s[5].setComponents(c,p,d,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Ui.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Ui.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Ui)}intersectsSprite(t){Ui.center.set(0,0,0);const e=pf.distanceTo(t.center);return Ui.radius=.7071067811865476+e,Ui.applyMatrix4(t.matrixWorld),this.intersectsSphere(Ui)}intersectsSphere(t){const e=this.planes,i=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(i)<s)return!1;return!0}intersectsBox(t){const e=this.planes;for(let i=0;i<6;i++){const s=e[i];if(Ir.x=s.normal.x>0?t.max.x:t.min.x,Ir.y=s.normal.y>0?t.max.y:t.min.y,Ir.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(Ir)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let i=0;i<6;i++)if(e[i].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}const xc=new ue;class El{constructor(){this.coordinateSystem=An,this._frustums=[],this._count=0}setFromArrayCamera(t){const e=t.cameras,i=this._frustums;for(let s=0;s<e.length;s++){const r=e[s];xc.multiplyMatrices(r.projectionMatrix,r.matrixWorldInverse),i[s]===void 0&&(i[s]=new ar),i[s].setFromProjectionMatrix(xc,r.coordinateSystem,r.reversedDepth)}return this._count=e.length,this}getFrustum(t){return this._frustums[t]}intersectsObject(t){const e=this._frustums;for(let i=0;i<this._count;i++)if(e[i].intersectsObject(t))return!0;return!1}intersectsSprite(t){const e=this._frustums;for(let i=0;i<this._count;i++)if(e[i].intersectsSprite(t))return!0;return!1}intersectsSphere(t){const e=this._frustums;for(let i=0;i<this._count;i++)if(e[i].intersectsSphere(t))return!0;return!1}intersectsBox(t){const e=this._frustums;for(let i=0;i<this._count;i++)if(e[i].intersectsBox(t))return!0;return!1}containsPoint(t){const e=this._frustums;for(let i=0;i<this._count;i++)if(e[i].containsPoint(t))return!0;return!1}copy(t){this.coordinateSystem=t.coordinateSystem;const e=this._frustums,i=t._frustums;for(let s=0;s<t._count;s++)e[s]===void 0&&(e[s]=new ar),e[s].copy(i[s]);return this._count=t._count,this}clone(){return new El().copy(this)}}class Ss extends Ki{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Xt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}}const sa=new N,ra=new N,vc=new ue,ks=new fa,Nr=new da,Ka=new N,Mc=new N;class jh extends Ae{constructor(t=new ve,e=new Ss){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0?this.morphTargetInfluences=t.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,t.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){const t=this.geometry;if(t.index===null){const e=t.attributes.position,i=[0];for(let s=1,r=e.count;s<r;s++)sa.fromBufferAttribute(e,s-1),ra.fromBufferAttribute(e,s),i[s]=i[s-1],i[s]+=sa.distanceTo(ra);t.setAttribute("lineDistance",new ae(i,1))}else Nt("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){const i=this.geometry,s=this.matrixWorld,r=t.params.Line.threshold,a=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),Nr.copy(i.boundingSphere),Nr.applyMatrix4(s),Nr.radius+=r,t.ray.intersectsSphere(Nr)===!1)return;vc.copy(s).invert(),ks.copy(t.ray).applyMatrix4(vc);const o=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=this.isLineSegments?2:1,h=i.index,p=i.attributes.position;if(h!==null){const m=Math.max(0,a.start),g=Math.min(h.count,a.start+a.count);for(let M=m,d=g-1;M<d;M+=l){const u=h.getX(M),v=h.getX(M+1),b=Ur(this,t,ks,c,u,v,M);b&&e.push(b)}if(this.isLineLoop){const M=h.getX(g-1),d=h.getX(m),u=Ur(this,t,ks,c,M,d,g-1);u&&e.push(u)}}else{const m=Math.max(0,a.start),g=Math.min(p.count,a.start+a.count);for(let M=m,d=g-1;M<d;M+=l){const u=Ur(this,t,ks,c,M,M+1,M);u&&e.push(u)}if(this.isLineLoop){const M=Ur(this,t,ks,c,g-1,m,g-1);M&&e.push(M)}}}updateMorphTargets(){const e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){const s=e[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){const o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}}function Ur(n,t,e,i,s,r,a){const o=n.geometry.attributes.position;if(sa.fromBufferAttribute(o,s),ra.fromBufferAttribute(o,r),e.distanceSqToSegment(sa,ra,Ka,Mc)>i)return;Ka.applyMatrix4(n.matrixWorld);const l=t.ray.origin.distanceTo(Ka);if(!(l<t.near||l>t.far))return{distance:l,point:Mc.clone().applyMatrix4(n.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:n}}const Sc=new N,yc=new N;class qr extends jh{constructor(t,e){super(t,e),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const t=this.geometry;if(t.index===null){const e=t.attributes.position,i=[];for(let s=0,r=e.count;s<r;s+=2)Sc.fromBufferAttribute(e,s),yc.fromBufferAttribute(e,s+1),i[s]=s===0?0:i[s-1],i[s+1]=i[s]+Sc.distanceTo(yc);t.setAttribute("lineDistance",new ae(i,1))}else Nt("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class tu extends We{constructor(t=[],e=ys,i,s,r,a,o,c,l,h){super(t,e,i,s,r,a,o,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class mf extends We{constructor(t,e,i,s,r,a,o,c,l){super(t,e,i,s,r,a,o,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}}class bs extends We{constructor(t,e,i=Vn,s,r,a,o=ze,c=ze,l,h=Si,f=1){if(h!==Si&&h!==_i)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const p={width:t,height:e,depth:f};super(p,s,r,a,o,c,h,i,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new Ml(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}}class eu extends bs{constructor(t,e=Vn,i=ys,s,r,a=ze,o=ze,c,l=Si){const h={width:t,height:t,depth:1},f=[h,h,h,h,h,h];super(t,t,e,i,s,r,a,o,c,l),this.image=f,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}}class nu extends We{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}}class Hn extends ve{constructor(t=1,e=1,i=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:i,widthSegments:s,heightSegments:r,depthSegments:a};const o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);const c=[],l=[],h=[],f=[];let p=0,m=0;g("z","y","x",-1,-1,i,e,t,a,r,0),g("z","y","x",1,-1,i,e,-t,a,r,1),g("x","z","y",1,1,t,i,e,s,a,2),g("x","z","y",1,-1,t,i,-e,s,a,3),g("x","y","z",1,-1,t,e,i,s,r,4),g("x","y","z",-1,-1,t,e,-i,s,r,5),this.setIndex(c),this.setAttribute("position",new ae(l,3)),this.setAttribute("normal",new ae(h,3)),this.setAttribute("uv",new ae(f,2));function g(M,d,u,v,b,y,w,T,_,E,L){const R=y/_,I=w/E,F=y/2,z=w/2,C=T/2,H=_+1,$=E+1;let V=0,et=0;const U=new N;for(let X=0;X<$;X++){const J=X*I-z;for(let dt=0;dt<H;dt++){const Tt=dt*R-F;U[M]=Tt*v,U[d]=J*b,U[u]=C,l.push(U.x,U.y,U.z),U[M]=0,U[d]=0,U[u]=T>0?1:-1,h.push(U.x,U.y,U.z),f.push(dt/_),f.push(1-X/E),V+=1}}for(let X=0;X<E;X++)for(let J=0;J<_;J++){const dt=p+J+H*X,Tt=p+J+H*(X+1),K=p+(J+1)+H*(X+1),gt=p+(J+1)+H*X;c.push(dt,Tt,gt),c.push(Tt,K,gt),et+=6}o.addGroup(m,et,L),m+=et,p+=V}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Hn(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}class bl extends ve{constructor(t=1,e=1,i=4,s=8,r=1){super(),this.type="CapsuleGeometry",this.parameters={radius:t,height:e,capSegments:i,radialSegments:s,heightSegments:r},e=Math.max(0,e),i=Math.max(1,Math.floor(i)),s=Math.max(3,Math.floor(s)),r=Math.max(1,Math.floor(r));const a=[],o=[],c=[],l=[],h=e/2,f=Math.PI/2*t,p=e,m=2*f+p,g=i*2+r,M=s+1,d=new N,u=new N;for(let v=0;v<=g;v++){let b=0,y=0,w=0,T=0;if(v<=i){const L=v/i,R=L*Math.PI/2;y=-h-t*Math.cos(R),w=t*Math.sin(R),T=-t*Math.cos(R),b=L*f}else if(v<=i+r){const L=(v-i)/r;y=-h+L*e,w=t,T=0,b=f+L*p}else{const L=(v-i-r)/i,R=L*Math.PI/2;y=h+t*Math.sin(R),w=t*Math.cos(R),T=t*Math.sin(R),b=f+p+L*f}const _=Math.max(0,Math.min(1,b/m));let E=0;v===0?E=.5/s:v===g&&(E=-.5/s);for(let L=0;L<=s;L++){const R=L/s,I=R*Math.PI*2,F=Math.sin(I),z=Math.cos(I);u.x=-w*z,u.y=y,u.z=w*F,o.push(u.x,u.y,u.z),d.set(-w*z,T,w*F),d.normalize(),c.push(d.x,d.y,d.z),l.push(R+E,_)}if(v>0){const L=(v-1)*M;for(let R=0;R<s;R++){const I=L+R,F=L+R+1,z=v*M+R,C=v*M+R+1;a.push(I,F,z),a.push(F,C,z)}}}this.setIndex(a),this.setAttribute("position",new ae(o,3)),this.setAttribute("normal",new ae(c,3)),this.setAttribute("uv",new ae(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new bl(t.radius,t.height,t.capSegments,t.radialSegments,t.heightSegments)}}class Tl extends ve{constructor(t=1,e=32,i=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:i,thetaLength:s},e=Math.max(3,e);const r=[],a=[],o=[],c=[],l=new N,h=new At;a.push(0,0,0),o.push(0,0,1),c.push(.5,.5);for(let f=0,p=3;f<=e;f++,p+=3){const m=i+f/e*s;l.x=t*Math.cos(m),l.y=t*Math.sin(m),a.push(l.x,l.y,l.z),o.push(0,0,1),h.x=(a[p]/t+1)/2,h.y=(a[p+1]/t+1)/2,c.push(h.x,h.y)}for(let f=1;f<=e;f++)r.push(f,f+1,0);this.setIndex(r),this.setAttribute("position",new ae(a,3)),this.setAttribute("normal",new ae(o,3)),this.setAttribute("uv",new ae(c,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Tl(t.radius,t.segments,t.thetaStart,t.thetaLength)}}class Bi extends ve{constructor(t=1,e=1,i=1,s=32,r=1,a=!1,o=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:i,radialSegments:s,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:c};const l=this;s=Math.floor(s),r=Math.floor(r);const h=[],f=[],p=[],m=[];let g=0;const M=[],d=i/2;let u=0;v(),a===!1&&(t>0&&b(!0),e>0&&b(!1)),this.setIndex(h),this.setAttribute("position",new ae(f,3)),this.setAttribute("normal",new ae(p,3)),this.setAttribute("uv",new ae(m,2));function v(){const y=new N,w=new N;let T=0;const _=(e-t)/i;for(let E=0;E<=r;E++){const L=[],R=E/r,I=R*(e-t)+t;for(let F=0;F<=s;F++){const z=F/s,C=z*c+o,H=Math.sin(C),$=Math.cos(C);w.x=I*H,w.y=-R*i+d,w.z=I*$,f.push(w.x,w.y,w.z),y.set(H,_,$).normalize(),p.push(y.x,y.y,y.z),m.push(z,1-R),L.push(g++)}M.push(L)}for(let E=0;E<s;E++)for(let L=0;L<r;L++){const R=M[L][E],I=M[L+1][E],F=M[L+1][E+1],z=M[L][E+1];(t>0||L!==0)&&(h.push(R,I,z),T+=3),(e>0||L!==r-1)&&(h.push(I,F,z),T+=3)}l.addGroup(u,T,0),u+=T}function b(y){const w=g,T=new At,_=new N;let E=0;const L=y===!0?t:e,R=y===!0?1:-1;for(let F=1;F<=s;F++)f.push(0,d*R,0),p.push(0,R,0),m.push(.5,.5),g++;const I=g;for(let F=0;F<=s;F++){const C=F/s*c+o,H=Math.cos(C),$=Math.sin(C);_.x=L*$,_.y=d*R,_.z=L*H,f.push(_.x,_.y,_.z),p.push(0,R,0),T.x=H*.5+.5,T.y=$*.5*R+.5,m.push(T.x,T.y),g++}for(let F=0;F<s;F++){const z=w+F,C=I+F;y===!0?h.push(C,C+1,z):h.push(C+1,C,z),E+=3}l.addGroup(u,E,y===!0?1:2),u+=E}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Bi(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class wl extends Bi{constructor(t=1,e=1,i=32,s=1,r=!1,a=0,o=Math.PI*2){super(0,t,e,i,s,r,a,o),this.type="ConeGeometry",this.parameters={radius:t,height:e,radialSegments:i,heightSegments:s,openEnded:r,thetaStart:a,thetaLength:o}}static fromJSON(t){return new wl(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class Ts extends ve{constructor(t=1,e=1,i=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:i,heightSegments:s};const r=t/2,a=e/2,o=Math.floor(i),c=Math.floor(s),l=o+1,h=c+1,f=t/o,p=e/c,m=[],g=[],M=[],d=[];for(let u=0;u<h;u++){const v=u*p-a;for(let b=0;b<l;b++){const y=b*f-r;g.push(y,-v,0),M.push(0,0,1),d.push(b/o),d.push(1-u/c)}}for(let u=0;u<c;u++)for(let v=0;v<o;v++){const b=v+l*u,y=v+l*(u+1),w=v+1+l*(u+1),T=v+1+l*u;m.push(b,y,T),m.push(y,w,T)}this.setIndex(m),this.setAttribute("position",new ae(g,3)),this.setAttribute("normal",new ae(M,3)),this.setAttribute("uv",new ae(d,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ts(t.width,t.height,t.widthSegments,t.heightSegments)}}class aa extends ve{constructor(t=.5,e=1,i=32,s=1,r=0,a=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:t,outerRadius:e,thetaSegments:i,phiSegments:s,thetaStart:r,thetaLength:a},i=Math.max(3,i),s=Math.max(1,s);const o=[],c=[],l=[],h=[];let f=t;const p=(e-t)/s,m=new N,g=new At;for(let M=0;M<=s;M++){for(let d=0;d<=i;d++){const u=r+d/i*a;m.x=f*Math.cos(u),m.y=f*Math.sin(u),c.push(m.x,m.y,m.z),l.push(0,0,1),g.x=(m.x/e+1)/2,g.y=(m.y/e+1)/2,h.push(g.x,g.y)}f+=p}for(let M=0;M<s;M++){const d=M*(i+1);for(let u=0;u<i;u++){const v=u+d,b=v,y=v+i+1,w=v+i+2,T=v+1;o.push(b,y,T),o.push(y,w,T)}}this.setIndex(o),this.setAttribute("position",new ae(c,3)),this.setAttribute("normal",new ae(l,3)),this.setAttribute("uv",new ae(h,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new aa(t.innerRadius,t.outerRadius,t.thetaSegments,t.phiSegments,t.thetaStart,t.thetaLength)}}class Wi extends ve{constructor(t=1,e=32,i=16,s=0,r=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:i,phiStart:s,phiLength:r,thetaStart:a,thetaLength:o},e=Math.max(3,Math.floor(e)),i=Math.max(2,Math.floor(i));const c=Math.min(a+o,Math.PI);let l=0;const h=[],f=new N,p=new N,m=[],g=[],M=[],d=[];for(let u=0;u<=i;u++){const v=[],b=u/i,y=a+b*o,w=t*Math.cos(y),T=Math.sqrt(t*t-w*w);let _=0;u===0&&a===0?_=.5/e:u===i&&c===Math.PI&&(_=-.5/e);for(let E=0;E<=e;E++){const L=E/e,R=s+L*r;f.x=-T*Math.cos(R),f.y=w,f.z=T*Math.sin(R),g.push(f.x,f.y,f.z),p.copy(f).normalize(),M.push(p.x,p.y,p.z),d.push(L+_,1-b),v.push(l++)}h.push(v)}for(let u=0;u<i;u++)for(let v=0;v<e;v++){const b=h[u][v+1],y=h[u][v],w=h[u+1][v],T=h[u+1][v+1];(u!==0||a>0)&&m.push(b,y,T),(u!==i-1||c<Math.PI)&&m.push(y,w,T)}this.setIndex(m),this.setAttribute("position",new ae(g,3)),this.setAttribute("normal",new ae(M,3)),this.setAttribute("uv",new ae(d,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Wi(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}}function ws(n){const t={};for(const e in n){t[e]={};for(const i in n[e]){const s=n[e][i];if(Ec(s))s.isRenderTargetTexture?(Nt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][i]=null):t[e][i]=s.clone();else if(Array.isArray(s))if(Ec(s[0])){const r=[];for(let a=0,o=s.length;a<o;a++)r[a]=s[a].clone();t[e][i]=r}else t[e][i]=s.slice();else t[e][i]=s}}return t}function Ye(n){const t={};for(let e=0;e<n.length;e++){const i=ws(n[e]);for(const s in i)t[s]=i[s]}return t}function Ec(n){return n&&(n.isColor||n.isMatrix3||n.isMatrix4||n.isVector2||n.isVector3||n.isVector4||n.isTexture||n.isQuaternion)}function gf(n){const t=[];for(let e=0;e<n.length;e++)t.push(n[e].clone());return t}function iu(n){const t=n.getRenderTarget();return t===null?n.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Jt.workingColorSpace}const _f={clone:ws,merge:Ye};var xf=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,vf=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Xi extends Ki{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=xf,this.fragmentShader=vf,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=ws(t.uniforms),this.uniformsGroups=gf(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const s in this.uniforms){const a=this.uniforms[s].value;a&&a.isTexture?e.uniforms[s]={type:"t",value:a.toJSON(t).uuid}:a&&a.isColor?e.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?e.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?e.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?e.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?e.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?e.uniforms[s]={type:"m4",value:a.toArray()}:e.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const i={};for(const s in this.extensions)this.extensions[s]===!0&&(i[s]=!0);return Object.keys(i).length>0&&(e.extensions=i),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(const i in t.uniforms){const s=t.uniforms[i];switch(this.uniforms[i]={},s.type){case"t":this.uniforms[i].value=e[s.value]||null;break;case"c":this.uniforms[i].value=new Xt().setHex(s.value);break;case"v2":this.uniforms[i].value=new At().fromArray(s.value);break;case"v3":this.uniforms[i].value=new N().fromArray(s.value);break;case"v4":this.uniforms[i].value=new _e().fromArray(s.value);break;case"m3":this.uniforms[i].value=new Ot().fromArray(s.value);break;case"m4":this.uniforms[i].value=new ue().fromArray(s.value);break;default:this.uniforms[i].value=s.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(const i in t.extensions)this.extensions[i]=t.extensions[i];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}}class Mf extends Xi{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class pa extends Ki{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Xt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Xt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=qo,this.normalScale=new At(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Ei,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class Sf extends Ki{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=gd,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class yf extends Ki{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}class Ef extends Ss{constructor(t){super(),this.isLineDashedMaterial=!0,this.type="LineDashedMaterial",this.scale=1,this.dashSize=3,this.gapSize=1,this.setValues(t)}copy(t){return super.copy(t),this.scale=t.scale,this.dashSize=t.dashSize,this.gapSize=t.gapSize,this}}class su extends Ae{static registerNode(t){this.prototype._lightNode=t}constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Xt(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}}class bf extends su{constructor(t,e,i){super(t,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Ae.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Xt(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}toJSON(t){const e=super.toJSON(t);return e.object.groundColor=this.groundColor.getHex(),e}}const Za=new ue,bc=new N,Tc=new N;class Tf{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new At(512,512),this.mapType=dn,this.map=null,this.mapPass=null,this.matrix=new ue,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ar,this._frameExtents=new At(1,1),this._viewportCount=1,this._viewports=[new _e(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera;bc.setFromMatrixPosition(t.matrixWorld),e.position.copy(bc),Tc.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Tc),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,i,s){Za.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),i.setFromProjectionMatrix(Za,t.coordinateSystem,t.reversedDepth);const r=this._frameExtents,a=s?s.z/r.x:1,o=s?s.w/r.y:1,c=s?s.x/r.x:0,l=s?s.y/r.y:0;t.coordinateSystem===ir||t.reversedDepth?e.set(.5*a,0,0,.5*a+c,0,.5*o,0,.5*o+l,0,0,1,0,0,0,0,1):e.set(.5*a,0,0,.5*a+c,0,.5*o,0,.5*o+l,0,0,.5,.5,0,0,0,1),e.multiply(Za)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.mapType=t.mapType,this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.mapType=this.mapType,t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}const Fr=new N,Or=new yi,Ln=new N;class ru extends Ae{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ue,this.projectionMatrix=new ue,this.projectionMatrixInverse=new ue,this.coordinateSystem=An,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(Fr,Or,Ln),Ln.x===1&&Ln.y===1&&Ln.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Fr,Or,Ln.set(1,1,1)).invert()}updateWorldMatrix(t,e,i=!1){super.updateWorldMatrix(t,e,i),this.matrixWorld.decompose(Fr,Or,Ln),Ln.x===1&&Ln.y===1&&Ln.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Fr,Or,Ln.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const ui=new N,wc=new At,Ac=new At;class Ze extends ru{constructor(t=50,e=1,i=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=i,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=sr*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(qs*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return sr*2*Math.atan(Math.tan(qs*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,i){ui.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(ui.x,ui.y).multiplyScalar(-t/ui.z),ui.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(ui.x,ui.y).multiplyScalar(-t/ui.z)}getViewSize(t,e){return this.getViewBounds(t,wc,Ac),e.subVectors(Ac,wc)}setViewOffset(t,e,i,s,r,a){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(qs*.5*this.fov)/this.zoom,i=2*e,s=this.aspect*i,r=-.5*s;const a=this.view;if(this.view!==null&&this.view.enabled){const c=a.fullWidth,l=a.fullHeight;r+=a.offsetX*s/c,e-=a.offsetY*i/l,s*=a.width/c,i*=a.height/l}const o=this.filmOffset;o!==0&&(r+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-i,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}class au extends ru{constructor(t=-1,e=1,i=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=i,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,i,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let r=i-t,a=i+t,o=s+e,c=s-e;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,a=r+l*this.view.width,o-=h*this.view.offsetY,c=o-h*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}class wf extends Tf{constructor(){super(new au(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Af extends su{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Ae.DEFAULT_UP),this.updateMatrix(),this.target=new Ae,this.shadow=new wf}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){const e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}}const us=-90,ds=1;class Ko extends Ae{constructor(t,e,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new Ze(us,ds,t,e);s.layers=this.layers,this.add(s);const r=new Ze(us,ds,t,e);r.layers=this.layers,this.add(r);const a=new Ze(us,ds,t,e);a.layers=this.layers,this.add(a);const o=new Ze(us,ds,t,e);o.layers=this.layers,this.add(o);const c=new Ze(us,ds,t,e);c.layers=this.layers,this.add(c);const l=new Ze(us,ds,t,e);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[i,s,r,a,o,c]=e;for(const l of e)this.remove(l);if(t===An)i.up.set(0,1,0),i.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(t===ir)i.up.set(0,-1,0),i.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const l of e)this.add(l),l.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[r,a,o,c,l,h]=this.children,f=t.getRenderTarget(),p=t.getActiveCubeFace(),m=t.getActiveMipmapLevel(),g=t.xr.enabled;t.xr.enabled=!1;const M=i.texture.mipmapsAutoUpdate;i.texture.mipmapsAutoUpdate=!1;let d=!1;t.isWebGLRenderer===!0?d=t.state.buffers.depth.getReversed():d=t.reversedDepthBuffer,t.setRenderTarget(i,0,s),d&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(i,1,s),d&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(i,2,s),d&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(i,3,s),d&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),t.setRenderTarget(i,4,s),d&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),i.texture.mipmapsAutoUpdate=M,t.setRenderTarget(i,5,s),d&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(f,p,m),t.xr.enabled=g,i.texture.needsPMREMUpdate=!0}}class Rf extends Ze{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t,this.perCameraFrustumCulled=!1}}const Rc=new ue;class Cf{constructor(t,e,i=0,s=1/0){this.ray=new fa(t,e),this.near=i,this.far=s,this.camera=null,this.layers=new Sl,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,e.projectionMatrix.elements[14]).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):jt("Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return Rc.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Rc),this}intersectObject(t,e=!0,i=[]){return Zo(t,this,i,e),i.sort(Cc),i}intersectObjects(t,e=!0,i=[]){for(let s=0,r=t.length;s<r;s++)Zo(t[s],this,i,e);return i.sort(Cc),i}}function Cc(n,t){return n.distance-t.distance}function Zo(n,t,e,i){let s=!0;if(n.layers.test(t.layers)&&n.raycast(t,e)===!1&&(s=!1),s===!0&&i===!0){const r=n.children;for(let a=0,o=r.length;a<o;a++)Zo(r[a],t,e,!0)}}class Pc{constructor(t=1,e=0,i=0){this.radius=t,this.phi=e,this.theta=i}set(t,e,i){return this.radius=t,this.phi=e,this.theta=i,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=$t(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,i){return this.radius=Math.sqrt(t*t+e*e+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,i),this.phi=Math.acos($t(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}class Pf extends qr{constructor(t=10,e=10,i=4473924,s=8947848){i=new Xt(i),s=new Xt(s);const r=e/2,a=t/e,o=t/2,c=[],l=[];for(let p=0,m=0,g=-o;p<=e;p++,g+=a){c.push(-o,0,g,o,0,g),c.push(g,0,-o,g,0,o);const M=p===r?i:s;M.toArray(l,m),m+=3,M.toArray(l,m),m+=3,M.toArray(l,m),m+=3,M.toArray(l,m),m+=3}const h=new ve;h.setAttribute("position",new ae(c,3)),h.setAttribute("color",new ae(l,3));const f=new Ss({vertexColors:!0,toneMapped:!1});super(h,f),this.type="GridHelper"}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}}class Lf extends wi{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}}function Lc(n,t,e,i){const s=Df(i);switch(e){case zh:return n*t;case Bh:return n*t/s.components*s.byteLength;case pl:return n*t/s.components*s.byteLength;case Vi:return n*t*2/s.components*s.byteLength;case ml:return n*t*2/s.components*s.byteLength;case kh:return n*t*3/s.components*s.byteLength;case Bn:return n*t*4/s.components*s.byteLength;case gl:return n*t*4/s.components*s.byteLength;case Vr:case Wr:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case Xr:case $r:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case vo:case So:return Math.max(n,16)*Math.max(t,8)/4;case xo:case Mo:return Math.max(n,8)*Math.max(t,8)/2;case yo:case Eo:case To:case wo:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case bo:case Jr:case Ao:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case Ro:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case Co:return Math.floor((n+4)/5)*Math.floor((t+3)/4)*16;case Po:return Math.floor((n+4)/5)*Math.floor((t+4)/5)*16;case Lo:return Math.floor((n+5)/6)*Math.floor((t+4)/5)*16;case Do:return Math.floor((n+5)/6)*Math.floor((t+5)/6)*16;case Io:return Math.floor((n+7)/8)*Math.floor((t+4)/5)*16;case No:return Math.floor((n+7)/8)*Math.floor((t+5)/6)*16;case Uo:return Math.floor((n+7)/8)*Math.floor((t+7)/8)*16;case Fo:return Math.floor((n+9)/10)*Math.floor((t+4)/5)*16;case Oo:return Math.floor((n+9)/10)*Math.floor((t+5)/6)*16;case zo:return Math.floor((n+9)/10)*Math.floor((t+7)/8)*16;case ko:return Math.floor((n+9)/10)*Math.floor((t+9)/10)*16;case Bo:return Math.floor((n+11)/12)*Math.floor((t+9)/10)*16;case Go:return Math.floor((n+11)/12)*Math.floor((t+11)/12)*16;case Ho:case Vo:case Wo:return Math.ceil(n/4)*Math.ceil(t/4)*16;case Xo:case $o:return Math.ceil(n/4)*Math.ceil(t/4)*8;case Qr:case Yo:return Math.ceil(n/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function Df(n){switch(n){case dn:case Nh:return{byteLength:1,components:1};case nr:case Uh:case Wn:return{byteLength:2,components:1};case dl:case fl:return{byteLength:2,components:4};case Vn:case ul:case kn:return{byteLength:4,components:1};case Fh:case Oh:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:hl}}));typeof window<"u"&&(window.__THREE__?Nt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=hl);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function ou(){let n=null,t=!1,e=null,i=null;function s(r,a){i=n.requestAnimationFrame(s),e(r,a)}return{start:function(){t!==!0&&e!==null&&n!==null&&(i=n.requestAnimationFrame(s),t=!0)},stop:function(){n!==null&&n.cancelAnimationFrame(i),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){n=r}}}function If(n){const t=new WeakMap;function e(o,c){const l=o.array,h=o.usage,f=l.byteLength,p=n.createBuffer();n.bindBuffer(c,p),n.bufferData(c,l,h),o.onUploadCallback();let m;if(l instanceof Float32Array)m=n.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)m=n.HALF_FLOAT;else if(l instanceof Uint16Array)o.isFloat16BufferAttribute?m=n.HALF_FLOAT:m=n.UNSIGNED_SHORT;else if(l instanceof Int16Array)m=n.SHORT;else if(l instanceof Uint32Array)m=n.UNSIGNED_INT;else if(l instanceof Int32Array)m=n.INT;else if(l instanceof Int8Array)m=n.BYTE;else if(l instanceof Uint8Array)m=n.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)m=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:p,type:m,bytesPerElement:l.BYTES_PER_ELEMENT,version:o.version,size:f}}function i(o,c,l){const h=c.array,f=c.updateRanges;if(n.bindBuffer(l,o),f.length===0)n.bufferSubData(l,0,h);else{f.sort((m,g)=>m.start-g.start);let p=0;for(let m=1;m<f.length;m++){const g=f[p],M=f[m];M.start<=g.start+g.count+1?g.count=Math.max(g.count,M.start+M.count-g.start):(++p,f[p]=M)}f.length=p+1;for(let m=0,g=f.length;m<g;m++){const M=f[m];n.bufferSubData(l,M.start*h.BYTES_PER_ELEMENT,h,M.start,M.count)}c.clearUpdateRanges()}c.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),t.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);const c=t.get(o);c&&(n.deleteBuffer(c.buffer),t.delete(o))}function a(o,c){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const h=t.get(o);(!h||h.version<o.version)&&t.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const l=t.get(o);if(l===void 0)t.set(o,e(o,c));else if(l.version<o.version){if(l.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(l.buffer,o,c),l.version=o.version}}return{get:s,remove:r,update:a}}var Nf=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Uf=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Ff=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Of=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,zf=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,kf=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Bf=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Gf=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Hf=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,Vf=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Wf=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Xf=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,$f=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Yf=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,qf=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Kf=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Zf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Jf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Qf=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,jf=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,tp=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,ep=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,np=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,ip=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,sp=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,rp=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,ap=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,op=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,lp=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,cp="gl_FragColor = linearToOutputTexel( gl_FragColor );",hp=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,up=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,dp=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	uniform samplerCube envMap;
	#ifdef ENVMAP_TYPE_PMREM
		float roughnessToMip( const in float roughness ) {
			float r = clamp( roughness, 0.0, 1.0 );
			return ENVMAP_MAX_LOD * r * ( 2.0 - r );
		}
	#endif
#endif`,fp=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,pp=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,mp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,gp=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,_p=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,xp=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,vp=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Mp=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Sp=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,yp=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Ep=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,bp=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,Tp=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureLod( envMap, envMapRotation * retroVec, roughnessToMip( roughness ) );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_PMREM
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,wp=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Ap=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Rp=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Cp=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Pp=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.045 );
material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef USE_DIFFUSE_ROUGHNESS
	float diffuseRoughnessFactor = diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		diffuseRoughnessFactor *= texture2D( diffuseRoughnessMap, vDiffuseRoughnessMapUv ).r;
	#endif
	material.diffuseRoughness = saturate( diffuseRoughnessFactor );
#endif
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.045 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Lp=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float diffuseRoughness;
	#endif
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
#ifdef USE_DIFFUSE_ROUGHNESS
	const float EON_EPSILON = 1e-7;
	float FON_DirectionalAlbedo( const in float mu, const in float roughness, const in float A ) {
		float muComp = 1.0 - mu;
		float gOverPi = muComp * ( 0.0571085289 + muComp * ( 0.491881867 + muComp * ( - 0.332181442 + muComp * 0.0714429953 ) ) );
		return A * ( 1.0 + roughness * gOverPi );
	}
	vec3 BRDF_EON( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 diffuseColor, const in float roughness ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return BRDF_Lambert( rho );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float s = dot( lightDir, viewDir ) - dotNL * dotNV;
		float sOverT = ( s > 0.0 ) ? s / max( max( dotNL, dotNV ), EON_EPSILON ) : s;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		vec3 singleScatter = rho * RECIPROCAL_PI * A * ( 1.0 + roughness * sOverT );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		float albedoV = FON_DirectionalAlbedo( dotNV, roughness, A );
		float albedoL = FON_DirectionalAlbedo( dotNL, roughness, A );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		vec3 multiScatter = rhoMultiScatter * RECIPROCAL_PI
			* max( EON_EPSILON, 1.0 - albedoV )
			* max( EON_EPSILON, 1.0 - albedoL )
			/ max( EON_EPSILON, 1.0 - averageAlbedo );
		return singleScatter + multiScatter;
	}
	vec3 EON_DirectionalAlbedo( const in vec3 diffuseColor, const in float roughness, const in float dotNV ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return rho;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		float directionalAlbedo = FON_DirectionalAlbedo( dotNV, roughness, A );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		return rho * directionalAlbedo + rhoMultiScatter * ( 1.0 - directionalAlbedo );
	}
#endif
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = max( material.clearcoatRoughness, 0.045 );
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = max( material.roughness, 0.045 );
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float alphaT = max( material.alphaT, alpha );
		float V = V_GGX_SmithCorrelated_Anisotropic( alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		vec3 diffuseBRDF = BRDF_EON( directLight.direction, geometryViewDir, geometryNormal, material.diffuseColor, material.diffuseRoughness ) * ( 1.0 - material.metalness );
	#else
		vec3 diffuseBRDF = BRDF_Lambert( material.diffuseContribution );
	#endif
	reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuseAlbedo = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness );
		vec3 diffuse = irradiance * RECIPROCAL_PI * diffuseAlbedo * ( 1.0 - singleScattering - multiScattering );
	#else
		vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#endif
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuse = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness ) * ( 1.0 - totalScatteringDielectric );
	#else
		vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	#endif
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Dp=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_LIGHT_PROBE_GRIDS > 0
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		int probeGrid = - 1;
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( isInsideLightProbeGrid( probeWorldPos, probeWorldNormal, probesMin[ i ], probesMax[ i ], probesResolution[ i ] ) ) probeGrid = UNROLLED_LOOP_INDEX;
		}
		#pragma unroll_loop_end
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( probeGrid == UNROLLED_LOOP_INDEX ) irradiance += getLightProbeGridIrradiance( probesSH[ i ], probesMin[ i ], probesMax[ i ], probesResolution[ i ], probeWorldPos, probeWorldNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Ip=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_PMREM )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Np=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Up=`#if NUM_LIGHT_PROBE_GRIDS > 0
uniform highp sampler3D probesSH[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMin[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMax[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesResolution[ NUM_LIGHT_PROBE_GRIDS ];
bool isInsideLightProbeGrid( vec3 worldPos, vec3 worldNormal, vec3 probesMin, vec3 probesMax, vec3 probesResolution ) {
	vec3 spacing = ( probesMax - probesMin ) / probesResolution;
	vec3 samplePos = worldPos + worldNormal * spacing * 0.5;
	vec3 margin = spacing * 0.01;
	return all( greaterThanEqual( samplePos, probesMin - margin ) ) && all( lessThanEqual( samplePos, probesMax + margin ) );
}
vec3 getLightProbeGridIrradiance( highp sampler3D probesSH, vec3 probesMin, vec3 probesMax, vec3 probesResolution, vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 probeSpacing = gridRange / res;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.5 / res, 1.0 - 0.5 / res );
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,Fp=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Op=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,zp=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,kp=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Bp=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Gp=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Hp=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Vp=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Wp=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Xp=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,$p=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Yp=`#if defined( USE_MORPHCOLORS )
	#if defined( USE_COLOR_ALPHA )
		vColor *= morphTargetBaseInfluence;
	#elif defined( USE_COLOR )
		vColor.rgb *= morphTargetBaseInfluence;
	#endif
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor.rgb += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,qp=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Kp=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Zp=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Jp=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Qp=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,jp=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,tm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,em=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,nm=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,im=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,sm=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,rm=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,am=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,om=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,lm=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,cm=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,hm=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,um=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dm=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,fm=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,pm=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,mm=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				vec2 radius = shadowRadius * texelSize;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float lightDistance = length( lightToPosition );
			float depthRange = shadowCameraFar - shadowCameraNear;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float depthA = - shadowCameraNear / depthRange - shadowBias;
				float depthB = shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#else
				float depthA = shadowCameraFar / depthRange + shadowBias;
				float depthB = - shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			shadow = 0.0;
			for ( int i = 0; i < 5; i ++ ) {
				vec2 offset = vogelDiskSample( i, 5, phi );
				vec3 direction = bd3D + ( tangent * offset.x + bitangent * offset.y ) * texelSize;
				vec3 absDirection = abs( direction );
				float dp = depthA + depthB / max( max( absDirection.x, absDirection.y ), absDirection.z );
				shadow += texture( shadowMap, vec4( direction, dp ) );
			}
			shadow *= 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,gm=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,_m=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,xm=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,vm=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Mm=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Sm=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,ym=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Em=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,bm=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Tm=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,wm=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Am=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Rm=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Cm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Pm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	uniform mat3 diffuseRoughnessMapTransform;
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Lm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	vDiffuseRoughnessMapUv = ( diffuseRoughnessMapTransform * vec3( DIFFUSE_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Dm=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Im=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Nm=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Um=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Fm=`uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <envmap_common_pars_fragment>
void main() {
	#ifdef ENVMAP_TYPE_PMREM
		vec4 texColor = textureLod( envMap, backgroundRotation * vWorldDirection, roughnessToMip( backgroundBlurriness ) );
	#else
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Om=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,zm=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,km=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Bm=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,Gm=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Hm=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,Vm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Wm=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Xm=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,$m=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Ym=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,qm=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Km=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Zm=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Jm=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Qm=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,jm=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,t0=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,e0=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,n0=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,i0=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,s0=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DIFFUSE_ROUGHNESS
	uniform float diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		uniform sampler2D diffuseRoughnessMap;
	#endif
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,r0=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,a0=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,o0=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,l0=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,c0=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,h0=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,u0=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,d0=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Wt={alphahash_fragment:Nf,alphahash_pars_fragment:Uf,alphamap_fragment:Ff,alphamap_pars_fragment:Of,alphatest_fragment:zf,alphatest_pars_fragment:kf,aomap_fragment:Bf,aomap_pars_fragment:Gf,batching_pars_vertex:Hf,batching_vertex:Vf,begin_vertex:Wf,beginnormal_vertex:Xf,bsdfs:$f,iridescence_fragment:Yf,bumpmap_pars_fragment:qf,clipping_planes_fragment:Kf,clipping_planes_pars_fragment:Zf,clipping_planes_pars_vertex:Jf,clipping_planes_vertex:Qf,color_fragment:jf,color_pars_fragment:tp,color_pars_vertex:ep,color_vertex:np,common:ip,defaultnormal_vertex:sp,displacementmap_pars_vertex:rp,displacementmap_vertex:ap,emissivemap_fragment:op,emissivemap_pars_fragment:lp,colorspace_fragment:cp,colorspace_pars_fragment:hp,envmap_fragment:up,envmap_common_pars_fragment:dp,envmap_pars_fragment:fp,envmap_pars_vertex:pp,envmap_physical_pars_fragment:Tp,envmap_vertex:mp,fog_vertex:gp,fog_pars_vertex:_p,fog_fragment:xp,fog_pars_fragment:vp,gradientmap_pars_fragment:Mp,lightmap_pars_fragment:Sp,lights_lambert_fragment:yp,lights_lambert_pars_fragment:Ep,lights_pars_begin:bp,lights_toon_fragment:wp,lights_toon_pars_fragment:Ap,lights_phong_fragment:Rp,lights_phong_pars_fragment:Cp,lights_physical_fragment:Pp,lights_physical_pars_fragment:Lp,lights_fragment_begin:Dp,lights_fragment_maps:Ip,lights_fragment_end:Np,lightprobes_pars_fragment:Up,logdepthbuf_fragment:Fp,logdepthbuf_pars_fragment:Op,logdepthbuf_pars_vertex:zp,logdepthbuf_vertex:kp,map_fragment:Bp,map_pars_fragment:Gp,map_particle_fragment:Hp,map_particle_pars_fragment:Vp,metalnessmap_fragment:Wp,metalnessmap_pars_fragment:Xp,morphinstance_vertex:$p,morphcolor_vertex:Yp,morphnormal_vertex:qp,morphtarget_pars_vertex:Kp,morphtarget_vertex:Zp,normal_fragment_begin:Jp,normal_fragment_maps:Qp,normal_pars_fragment:jp,normal_pars_vertex:tm,normal_vertex:em,normalmap_pars_fragment:nm,clearcoat_normal_fragment_begin:im,clearcoat_normal_fragment_maps:sm,clearcoat_pars_fragment:rm,iridescence_pars_fragment:am,opaque_fragment:om,packing:lm,premultiplied_alpha_fragment:cm,project_vertex:hm,dithering_fragment:um,dithering_pars_fragment:dm,roughnessmap_fragment:fm,roughnessmap_pars_fragment:pm,shadowmap_pars_fragment:mm,shadowmap_pars_vertex:gm,shadowmap_vertex:_m,shadowmask_pars_fragment:xm,skinbase_vertex:vm,skinning_pars_vertex:Mm,skinning_vertex:Sm,skinnormal_vertex:ym,specularmap_fragment:Em,specularmap_pars_fragment:bm,tonemapping_fragment:Tm,tonemapping_pars_fragment:wm,transmission_fragment:Am,transmission_pars_fragment:Rm,uv_pars_fragment:Cm,uv_pars_vertex:Pm,uv_vertex:Lm,worldpos_vertex:Dm,background_vert:Im,background_frag:Nm,backgroundCube_vert:Um,backgroundCube_frag:Fm,cube_vert:Om,cube_frag:zm,depth_vert:km,depth_frag:Bm,distance_vert:Gm,distance_frag:Hm,equirect_vert:Vm,equirect_frag:Wm,linedashed_vert:Xm,linedashed_frag:$m,meshbasic_vert:Ym,meshbasic_frag:qm,meshlambert_vert:Km,meshlambert_frag:Zm,meshmatcap_vert:Jm,meshmatcap_frag:Qm,meshnormal_vert:jm,meshnormal_frag:t0,meshphong_vert:e0,meshphong_frag:n0,meshphysical_vert:i0,meshphysical_frag:s0,meshtoon_vert:r0,meshtoon_frag:a0,points_vert:o0,points_frag:l0,shadow_vert:c0,shadow_frag:h0,sprite_vert:u0,sprite_frag:d0},mt={common:{diffuse:{value:new Xt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ot},alphaMap:{value:null},alphaMapTransform:{value:new Ot},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ot}},envmap:{envMap:{value:null},envMapRotation:{value:new Ot},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ot}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ot}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ot},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ot},normalScale:{value:new At(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ot},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ot}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ot}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ot}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Xt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:[]},probesMin:{value:[]},probesMax:{value:[]},probesResolution:{value:[]}},points:{diffuse:{value:new Xt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ot},alphaTest:{value:0},uvTransform:{value:new Ot}},sprite:{diffuse:{value:new Xt(16777215)},opacity:{value:1},center:{value:new At(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ot},alphaMap:{value:null},alphaMapTransform:{value:new Ot},alphaTest:{value:0}}},Un={basic:{uniforms:Ye([mt.common,mt.specularmap,mt.envmap,mt.aomap,mt.lightmap,mt.fog]),vertexShader:Wt.meshbasic_vert,fragmentShader:Wt.meshbasic_frag},lambert:{uniforms:Ye([mt.common,mt.specularmap,mt.envmap,mt.aomap,mt.lightmap,mt.emissivemap,mt.bumpmap,mt.normalmap,mt.displacementmap,mt.fog,mt.lights,{emissive:{value:new Xt(0)},envMapIntensity:{value:1}}]),vertexShader:Wt.meshlambert_vert,fragmentShader:Wt.meshlambert_frag},phong:{uniforms:Ye([mt.common,mt.specularmap,mt.envmap,mt.aomap,mt.lightmap,mt.emissivemap,mt.bumpmap,mt.normalmap,mt.displacementmap,mt.fog,mt.lights,{emissive:{value:new Xt(0)},specular:{value:new Xt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Wt.meshphong_vert,fragmentShader:Wt.meshphong_frag},standard:{uniforms:Ye([mt.common,mt.envmap,mt.aomap,mt.lightmap,mt.emissivemap,mt.bumpmap,mt.normalmap,mt.displacementmap,mt.roughnessmap,mt.metalnessmap,mt.fog,mt.lights,{emissive:{value:new Xt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Wt.meshphysical_vert,fragmentShader:Wt.meshphysical_frag},toon:{uniforms:Ye([mt.common,mt.aomap,mt.lightmap,mt.emissivemap,mt.bumpmap,mt.normalmap,mt.displacementmap,mt.gradientmap,mt.fog,mt.lights,{emissive:{value:new Xt(0)}}]),vertexShader:Wt.meshtoon_vert,fragmentShader:Wt.meshtoon_frag},matcap:{uniforms:Ye([mt.common,mt.bumpmap,mt.normalmap,mt.displacementmap,mt.fog,{matcap:{value:null}}]),vertexShader:Wt.meshmatcap_vert,fragmentShader:Wt.meshmatcap_frag},points:{uniforms:Ye([mt.points,mt.fog]),vertexShader:Wt.points_vert,fragmentShader:Wt.points_frag},dashed:{uniforms:Ye([mt.common,mt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Wt.linedashed_vert,fragmentShader:Wt.linedashed_frag},depth:{uniforms:Ye([mt.common,mt.displacementmap]),vertexShader:Wt.depth_vert,fragmentShader:Wt.depth_frag},normal:{uniforms:Ye([mt.common,mt.bumpmap,mt.normalmap,mt.displacementmap,{opacity:{value:1}}]),vertexShader:Wt.meshnormal_vert,fragmentShader:Wt.meshnormal_frag},sprite:{uniforms:Ye([mt.sprite,mt.fog]),vertexShader:Wt.sprite_vert,fragmentShader:Wt.sprite_frag},background:{uniforms:{uvTransform:{value:new Ot},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Wt.background_vert,fragmentShader:Wt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ot}},vertexShader:Wt.backgroundCube_vert,fragmentShader:Wt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Wt.cube_vert,fragmentShader:Wt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Wt.equirect_vert,fragmentShader:Wt.equirect_frag},distance:{uniforms:Ye([mt.common,mt.displacementmap,{referencePosition:{value:new N},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Wt.distance_vert,fragmentShader:Wt.distance_frag},shadow:{uniforms:Ye([mt.lights,mt.fog,{color:{value:new Xt(0)},opacity:{value:1}}]),vertexShader:Wt.shadow_vert,fragmentShader:Wt.shadow_frag}};Un.physical={uniforms:Ye([Un.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ot},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ot},clearcoatNormalScale:{value:new At(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ot},diffuseRoughness:{value:0},diffuseRoughnessMap:{value:null},diffuseRoughnessMapTransform:{value:new Ot},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ot},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ot},sheen:{value:0},sheenColor:{value:new Xt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ot},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ot},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ot},transmissionSamplerSize:{value:new At},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ot},attenuationDistance:{value:0},attenuationColor:{value:new Xt(0)},specularColor:{value:new Xt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ot},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ot},anisotropyVector:{value:new At},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ot}}]),vertexShader:Wt.meshphysical_vert,fragmentShader:Wt.meshphysical_frag};const zr={r:0,b:0,g:0},f0=new ue,lu=new Ot;lu.set(-1,0,0,0,1,0,0,0,1);function p0(n,t,e,i,s,r){const a=new Xt(0);let o=s===!0?0:1,c,l,h=null,f=0,p=null;function m(v){let b=v.isScene===!0?v.background:null;if(b&&b.isTexture){const y=v.backgroundBlurriness>0;b=t.get(b,y)}return b}function g(v){let b=!1;const y=m(v);y===null?d(a,o):y&&y.isColor&&(d(y,1),b=!0);const w=n.xr.getEnvironmentBlendMode();w==="additive"?e.buffers.color.setClear(0,0,0,1,r):w==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(n.autoClear||b)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function M(v,b){const y=m(b);y&&y.isCubeTexture?(l===void 0&&(l=new Oe(new Hn(1,1,1),new Xi({name:"BackgroundCubeMaterial",uniforms:ws(Un.backgroundCube.uniforms),vertexShader:Un.backgroundCube.vertexShader,fragmentShader:Un.backgroundCube.fragmentShader,side:sn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),l.geometry.deleteAttribute("uv"),l.onBeforeRender=function(w,T,_){this.matrixWorld.copyPosition(_.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(l)),l.material.uniforms.envMap.value=y,l.material.uniforms.backgroundBlurriness.value=b.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=b.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(f0.makeRotationFromEuler(b.backgroundRotation)).transpose(),y.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(lu),l.material.toneMapped=Jt.getTransfer(y.colorSpace)!==re,(h!==y||f!==y.version||p!==n.toneMapping)&&(l.material.needsUpdate=!0,h=y,f=y.version,p=n.toneMapping),l.layers.enableAll(),v.unshift(l,l.geometry,l.material,0,0,null)):y&&y.isTexture&&(c===void 0&&(c=new Oe(new Ts(2,2),new Xi({name:"BackgroundMaterial",uniforms:ws(Un.background.uniforms),vertexShader:Un.background.vertexShader,fragmentShader:Un.background.fragmentShader,side:Hi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(c)),c.material.uniforms.t2D.value=y,c.material.uniforms.backgroundIntensity.value=b.backgroundIntensity,c.material.toneMapped=Jt.getTransfer(y.colorSpace)!==re,y.matrixAutoUpdate===!0&&y.updateMatrix(),c.material.uniforms.uvTransform.value.copy(y.matrix),(h!==y||f!==y.version||p!==n.toneMapping)&&(c.material.needsUpdate=!0,h=y,f=y.version,p=n.toneMapping),c.layers.enableAll(),v.unshift(c,c.geometry,c.material,0,0,null))}function d(v,b){v.getRGB(zr,iu(n)),e.buffers.color.setClear(zr.r,zr.g,zr.b,b,r)}function u(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(v,b=1){a.set(v),o=b,d(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(v){o=v,d(a,o)},render:g,addToRenderList:M,dispose:u}}function m0(n,t){const e=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},s=p(null);let r=s,a=!1;function o(I,F,z,C,H){let $=!1;const V=f(I,C,z,F);r!==V&&(r=V,l(r.object)),$=m(I,C,z,H),$&&g(I,C,z,H),H!==null&&t.update(H,n.ELEMENT_ARRAY_BUFFER),($||a)&&(a=!1,y(I,F,z,C),H!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,t.get(H).buffer))}function c(){return n.createVertexArray()}function l(I){return n.bindVertexArray(I)}function h(I){return n.deleteVertexArray(I)}function f(I,F,z,C){const H=C.wireframe===!0;let $=i[F.id];$===void 0&&($={},i[F.id]=$);const V=I.isInstancedMesh===!0?I.id:0;let et=$[V];et===void 0&&(et={},$[V]=et);let U=et[z.id];U===void 0&&(U={},et[z.id]=U);let X=U[H];return X===void 0&&(X=p(c()),U[H]=X),X}function p(I){const F=[],z=[],C=[];for(let H=0;H<e;H++)F[H]=0,z[H]=0,C[H]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:F,enabledAttributes:z,attributeDivisors:C,object:I,attributes:{},index:null}}function m(I,F,z,C){const H=r.attributes,$=F.attributes;let V=0;const et=z.getAttributes();for(const U in et)if(et[U].location>=0){const J=H[U];let dt=$[U];if(dt===void 0&&(U==="instanceMatrix"&&I.instanceMatrix&&(dt=I.instanceMatrix),U==="instanceColor"&&I.instanceColor&&(dt=I.instanceColor)),J===void 0||J.attribute!==dt||dt&&J.data!==dt.data)return!0;V++}return r.attributesNum!==V||r.index!==C}function g(I,F,z,C){const H={},$=F.attributes;let V=0;const et=z.getAttributes();for(const U in et)if(et[U].location>=0){let J=$[U];J===void 0&&(U==="instanceMatrix"&&I.instanceMatrix&&(J=I.instanceMatrix),U==="instanceColor"&&I.instanceColor&&(J=I.instanceColor));const dt={};dt.attribute=J,J&&J.data&&(dt.data=J.data),H[U]=dt,V++}r.attributes=H,r.attributesNum=V,r.index=C}function M(){const I=r.newAttributes;for(let F=0,z=I.length;F<z;F++)I[F]=0}function d(I){u(I,0)}function u(I,F){const z=r.newAttributes,C=r.enabledAttributes,H=r.attributeDivisors;z[I]=1,C[I]===0&&(n.enableVertexAttribArray(I),C[I]=1),H[I]!==F&&(n.vertexAttribDivisor(I,F),H[I]=F)}function v(){const I=r.newAttributes,F=r.enabledAttributes;for(let z=0,C=F.length;z<C;z++)F[z]!==I[z]&&(n.disableVertexAttribArray(z),F[z]=0)}function b(I,F,z,C,H,$,V){V===!0?n.vertexAttribIPointer(I,F,z,H,$):n.vertexAttribPointer(I,F,z,C,H,$)}function y(I,F,z,C){M();const H=C.attributes,$=z.getAttributes(),V=F.defaultAttributeValues;for(const et in $){const U=$[et];if(U.location>=0){let X=H[et];if(X===void 0&&(et==="instanceMatrix"&&I.instanceMatrix&&(X=I.instanceMatrix),et==="instanceColor"&&I.instanceColor&&(X=I.instanceColor)),X!==void 0){const J=X.normalized,dt=X.itemSize,Tt=t.get(X);if(Tt===void 0)continue;const K=Tt.buffer,gt=Tt.type,Mt=Tt.bytesPerElement,Ct=gt===n.INT||gt===n.UNSIGNED_INT||X.gpuType===ul;if(X.isInterleavedBufferAttribute){const _t=X.data,kt=_t.isInterleavedBuffer===!0?_t.stride:_t.itemSize,Me=X.offset;if(_t.isInstancedInterleavedBuffer||_t.isInstancedBufferAttribute){for(let It=0;It<U.locationSize;It++)u(U.location+It,_t.meshPerAttribute);I.isInstancedMesh!==!0&&C._maxInstanceCount===void 0&&(C._maxInstanceCount=_t.meshPerAttribute*_t.count)}else for(let It=0;It<U.locationSize;It++)d(U.location+It);n.bindBuffer(n.ARRAY_BUFFER,K);for(let It=0;It<U.locationSize;It++)b(U.location+It,dt/U.locationSize,gt,J,kt*Mt,(Me+dt/U.locationSize*It)*Mt,Ct)}else{if(X.isInstancedBufferAttribute){for(let _t=0;_t<U.locationSize;_t++)u(U.location+_t,X.meshPerAttribute);I.isInstancedMesh!==!0&&C._maxInstanceCount===void 0&&(C._maxInstanceCount=X.meshPerAttribute*X.count)}else for(let _t=0;_t<U.locationSize;_t++)d(U.location+_t);n.bindBuffer(n.ARRAY_BUFFER,K);for(let _t=0;_t<U.locationSize;_t++)b(U.location+_t,dt/U.locationSize,gt,J,dt*Mt,dt/U.locationSize*_t*Mt,Ct)}}else if(V!==void 0){const J=V[et];if(J!==void 0)switch(J.length){case 2:n.vertexAttrib2fv(U.location,J);break;case 3:n.vertexAttrib3fv(U.location,J);break;case 4:n.vertexAttrib4fv(U.location,J);break;default:n.vertexAttrib1fv(U.location,J)}}}}v()}function w(){L();for(const I in i){const F=i[I];for(const z in F){const C=F[z];for(const H in C){const $=C[H];for(const V in $)h($[V].object),delete $[V];delete C[H]}}delete i[I]}}function T(I){if(i[I.id]===void 0)return;const F=i[I.id];for(const z in F){const C=F[z];for(const H in C){const $=C[H];for(const V in $)h($[V].object),delete $[V];delete C[H]}}delete i[I.id]}function _(I){for(const F in i){const z=i[F];for(const C in z){const H=z[C];if(H[I.id]===void 0)continue;const $=H[I.id];for(const V in $)h($[V].object),delete $[V];delete H[I.id]}}}function E(I){for(const F in i){const z=i[F],C=I.isInstancedMesh===!0?I.id:0,H=z[C];if(H!==void 0){for(const $ in H){const V=H[$];for(const et in V)h(V[et].object),delete V[et];delete H[$]}delete z[C],Object.keys(z).length===0&&delete i[F]}}}function L(){R(),a=!0,r!==s&&(r=s,l(r.object))}function R(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:L,resetDefaultState:R,dispose:w,releaseStatesOfGeometry:T,releaseStatesOfObject:E,releaseStatesOfProgram:_,initAttributes:M,enableAttribute:d,disableUnusedAttributes:v}}function g0(n,t,e){let i;function s(c){i=c}function r(c,l){n.drawArrays(i,c,l),e.update(l,i,1)}function a(c,l,h){h!==0&&(n.drawArraysInstanced(i,c,l,h),e.update(l,i,h))}function o(c,l,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,c,0,l,0,h);let p=0;for(let m=0;m<h;m++)p+=l[m];e.update(p,i,1)}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o}function _0(n,t,e,i){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){const _=t.get("EXT_texture_filter_anisotropic");s=n.getParameter(_.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(_){return!(_!==Bn&&i.convert(_)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(_){const E=_===Wn&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(_!==dn&&_!==kn&&!E&&i.convert(_)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE))}function c(_){if(_==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";_="mediump"}return _==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=e.precision!==void 0?e.precision:"highp";const h=c(l);h!==l&&(Nt("WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);const f=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control"),p=e.logarithmicDepthBuffer===!0&&f===!1;e.reversedDepthBuffer===!0&&f===!1&&Nt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer."),e.logarithmicDepthBuffer===!0&&f===!0&&Nt("WebGLRenderer: Logarithmic depth buffer is ignored when reversed depth buffer is enabled.");const m=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),g=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),M=n.getParameter(n.MAX_TEXTURE_SIZE),d=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),u=n.getParameter(n.MAX_VERTEX_ATTRIBS),v=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),b=n.getParameter(n.MAX_VARYING_VECTORS),y=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),w=n.getParameter(n.MAX_SAMPLES),T=n.getParameter(n.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:c,textureFormatReadable:a,textureTypeReadable:o,precision:l,logarithmicDepthBuffer:p,reversedDepthBuffer:f,maxTextures:m,maxVertexTextures:g,maxTextureSize:M,maxCubemapSize:d,maxAttributes:u,maxVertexUniforms:v,maxVaryings:b,maxFragmentUniforms:y,maxSamples:w,samples:T}}function x0(n){const t=this;let e=null,i=0,s=!1,r=!1;const a=new Nn,o=new Ot,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(f,p){const m=f.length!==0||p||i!==0||s;return s=p,i=f.length,m},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(f,p){e=h(f,p,0)},this.setState=function(f,p,m){const g=f.clippingPlanes,M=f.clipIntersection,d=f.clipShadows,u=n.get(f);if(!s||g===null||g.length===0||r&&!d)r?h(null):l();else{const v=r?0:i,b=v*4;let y=u.clippingState||null;c.value=y,y=h(g,p,b,m);for(let w=0;w!==b;++w)y[w]=e[w];u.clippingState=y,this.numIntersection=M?this.numPlanes:0,this.numPlanes+=v}};function l(){c.value!==e&&(c.value=e,c.needsUpdate=i>0),t.numPlanes=i,t.numIntersection=0}function h(f,p,m,g){const M=f!==null?f.length:0;let d=null;if(M!==0){if(d=c.value,g!==!0||d===null){const u=m+M*4,v=p.matrixWorldInverse;o.getNormalMatrix(v),(d===null||d.length<u)&&(d=new Float32Array(u));for(let b=0,y=m;b!==M;++b,y+=4)a.copy(f[b]).applyMatrix4(v,o),a.normal.toArray(d,y),d[y+3]=a.constant}c.value=d,c.needsUpdate=!0}return t.numPlanes=M,t.numIntersection=0,d}}class Al extends Gn{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const i={width:t,height:t,depth:1},s=[i,i,i,i,i,i];this.texture=new tu(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new Hn(5,5,5),r=new Xi({name:"CubemapFromEquirect",uniforms:ws(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:sn,blending:vs});r.uniforms.tEquirect.value=e;const a=new Oe(s,r),o=e.minFilter;return e.minFilter===gi&&(e.minFilter=en),new Ko(1,10,this).update(t,a),e.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(t,e=!0,i=!0,s=!0){const r=t.getRenderTarget();for(let a=0;a<6;a++)t.setRenderTarget(this,a),t.clear(e,i,s);t.setRenderTarget(r)}}const Dc=256,v0=3,M0=20,cu=256,hu=16,S0=3,y0=new N,E0=new Xt;class oa{constructor(t){this._renderer=t,this._cubeSize=0,this._sourceTarget=null,this._cubeCamera=new Ko(1,10,null),this._boxMesh=new Oe(new Hn(5,5,5),null),this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null,this._integrationMaterial=null}fromScene(t,e=0,i=.1,s=100,r={}){const{size:a=256,position:o=y0}=r,c=this._renderer;this._setSize(a);const l=this._allocateTarget(),h=this._getSourceTarget(!0);e>0&&(h.texture.mipmapsAutoUpdate=!1);const f=c.autoClear,p=c.autoClearColor,m=c.autoClearDepth,g=c.autoClearStencil,M=t.background;c.autoClear=!0,c.autoClearColor=!0,c.autoClearDepth=!0,c.autoClearStencil=!0,M===null&&(t.background=c.getClearColor(E0));const d=new Ko(i,s,h);return d.position.copy(o),d.update(c,t),c.autoClear=f,c.autoClearColor=p,c.autoClearDepth=m,c.autoClearStencil=g,t.background=M,e>0&&(h.texture.mipmapsAutoUpdate=!0,this._blur(l,e)),this._applyPMREM(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Uc(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Nc(),this._compileMaterial(this._equirectMaterial))}dispose(){this._sourceTarget!==null&&this._sourceTarget.dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._integrationMaterial!==null&&this._integrationMaterial.dispose(),this._boxMesh.geometry.dispose()}static lodToRoughness(t,e){return e>0?1-Math.sqrt(1-t/e):0}_setSize(t){this._cubeSize=Math.max(Dc,$h(t))}_fromTexture(t,e){t.mapping===ys||t.mapping===er?this._setSize(t.image.length===0?Dc:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4);const i=e||this._allocateTarget();return this._textureToCubemap(t),this._applyPMREM(i),i}_allocateTarget(){const t=this._cubeSize,e=Ic(t,!1,!1),i=Math.log2(t)-v0;for(let s=0;s<=i;s++)e.texture.mipmaps.push({width:t>>s,height:t>>s});return e.texture.name="PMREM",e.texture.isPMREMTexture=!0,e}_getSourceTarget(t=!1){const e=this._cubeSize,i=this._sourceTarget;return(i===null||i.width!==e||t&&i.depthBuffer===!1)&&(i!==null&&i.dispose(),this._sourceTarget=Ic(e,!0,t)),this._sourceTarget}_compileMaterial(t){this._boxMesh.material=t,this._renderer.compile(this._boxMesh,this._cubeCamera.children[0])}_renderCube(t,e,i){const s=this._boxMesh,r=this._cubeCamera;s.material=i,r.renderTarget=t,r.activeMipmapLevel=e;const a=t.width>>e;t.viewport.set(0,0,a,a),r.update(this._renderer,s),t.viewport.set(0,0,t.width,t.height)}_textureToCubemap(t){let e;t.mapping===ys||t.mapping===er?(this._cubemapMaterial===null&&(this._cubemapMaterial=Uc()),e=this._cubemapMaterial,e.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):(this._equirectMaterial===null&&(this._equirectMaterial=Nc()),e=this._equirectMaterial),e.uniforms.envMap.value=t,this._renderCube(this._getSourceTarget(),0,e)}_applyPMREM(t){this._ggxMaterial===null&&(this._ggxMaterial=b0(),this._integrationMaterial=T0());const e=this._cubeSize,i=t.texture.mipmaps.length-1,s=this._ggxMaterial.uniforms;s.envMap.value=this._sourceTarget.texture;const r=this._integrationMaterial.uniforms;r.envMap.value=this._sourceTarget.texture,r.sourceLod.value=Math.log2(e/hu);for(let a=0;a<=i;a++){const o=oa.lodToRoughness(a,i);if(a>i-S0)r.roughness.value=o,this._renderCube(t,a,this._integrationMaterial);else{const c=o>0?Math.log2(e)+.5*Math.log2(6/(cu*Math.pow(o,4)))+.5:0;s.roughness.value=o,s.lodBias.value=c,this._renderCube(t,a,this._ggxMaterial)}}}_blur(t,e){this._blurMaterial===null&&(this._blurMaterial=w0());const i=this._blurMaterial,s=i.uniforms,r=this._sourceTarget;s.sigma.value=Math.min(e,Math.PI)/Math.SQRT2,s.envMap.value=r.texture,this._renderCube(t,0,i),s.envMap.value=t.texture,this._renderCube(r,0,i)}}function Ic(n,t,e){return new Al(n,{minFilter:gi,generateMipmaps:t,type:Wn,colorSpace:jr,depthBuffer:e})}function lr(n,t,e){return new Xi({name:n,uniforms:t,vertexShader:Wt.cube_vert,fragmentShader:e,side:sn,blending:vs,depthTest:!1,depthWrite:!1})}function b0(){return lr("PMREMGGXConvolution",{envMap:{value:null},roughness:{value:0},lodBias:{value:0}},`

		#define GGX_SAMPLES ${cu}u

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float lodBias;

		#include <common>

		// Van der Corput radical inverse
		float radicalInverse_VdC( uint bits ) {

			bits = ( bits << 16u ) | ( bits >> 16u );
			bits = ( ( bits & 0x55555555u ) << 1u ) | ( ( bits & 0xAAAAAAAAu ) >> 1u );
			bits = ( ( bits & 0x33333333u ) << 2u ) | ( ( bits & 0xCCCCCCCCu ) >> 2u );
			bits = ( ( bits & 0x0F0F0F0Fu ) << 4u ) | ( ( bits & 0xF0F0F0F0u ) >> 4u );
			bits = ( ( bits & 0x00FF00FFu ) << 8u ) | ( ( bits & 0xFF00FF00u ) >> 8u );
			return float( bits ) * 2.3283064365386963e-10; // / 0x100000000

		}

		// Hammersley sequence
		vec2 hammersley( uint i, uint N ) {

			return vec2( float( i ) / float( N ), radicalInverse_VdC( i ) );

		}

		void main() {

			vec3 N = normalize( vWorldDirection );

			// For very low roughness, just sample the environment directly
			if ( roughness < 0.001 ) {

				gl_FragColor = vec4( textureLod( envMap, N, 0.0 ).rgb, 1.0 );
				return;

			}

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			// Tangent space basis for VNDF sampling
			vec3 up = abs( N.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, N ) );
			vec3 bitangent = cross( N, tangent );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			for ( uint i = 0u; i < GGX_SAMPLES; i ++ ) {

				vec2 Xi = hammersley( i, GGX_SAMPLES );

				// With V = N, sample the reflected direction directly.
				float invQ = 1.0 / ( 1.0 - Xi.x + alpha2 * Xi.x );
				float NdotL = ( 1.0 - Xi.x - alpha2 * Xi.x ) * invQ;

				if ( NdotL > 0.0 ) {

					float phi = 2.0 * PI * Xi.y;
					float sinTheta = 2.0 * alpha * sqrt( Xi.x * ( 1.0 - Xi.x ) ) * invQ;
					vec3 L = N * NdotL + ( tangent * cos( phi ) + bitangent * sin( phi ) ) * sinTheta;

					// Match the source mip to the sample's solid angle. The terms
					// independent of the sample are precomputed in lodBias.
					float d = alpha2 * invQ;
					float lod = max( log2( d ) + lodBias, 0.0 );

					// Weight by NdotL for the split-sum approximation
					prefilteredColor += textureLod( envMap, L, lod ).rgb * NdotL;
					totalWeight += NdotL;

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function T0(){return lr("PMREMGGXIntegration",{envMap:{value:null},roughness:{value:0},sourceLod:{value:0},sourceSize:{value:hu}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float sourceLod;
		uniform int sourceSize;

		void main() {

			vec3 N = normalize( vWorldDirection );

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			float texelSize = 2.0 / float( sourceSize );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			// Pair opposite texels: only the one in N's hemisphere contributes.
			for ( int face = 0; face < 3; face ++ ) {

				for ( int y = 0; y < sourceSize; y ++ ) {

					for ( int x = 0; x < sourceSize; x ++ ) {

						vec2 uv = ( vec2( x, y ) + 0.5 ) * texelSize - 1.0;
						vec3 texelDirection = face == 0 ? vec3( 1.0, uv ) : ( face == 1 ? vec3( uv.x, 1.0, uv.y ) : vec3( uv, 1.0 ) );

						float invDistance = inversesqrt( 1.0 + dot( uv, uv ) );
						float NdotL = dot( N, texelDirection );
						texelDirection *= NdotL < 0.0 ? - 1.0 : 1.0;
						NdotL = abs( NdotL ) * invDistance;

						// With V = N, NdotH squared is ( 1 + NdotL ) / 2. Common factors
						// in the GGX distribution and texel solid angle cancel when normalized.
						float d = 1.0 + alpha2 + ( alpha2 - 1.0 ) * NdotL;
						float weight = NdotL * invDistance * invDistance * invDistance / ( d * d );

						prefilteredColor += textureLod( envMap, texelDirection, sourceLod ).rgb * weight;
						totalWeight += weight;

					}

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function w0(){return lr("PMREMSphericalGaussianBlur",{envMap:{value:null},sigma:{value:0}},`

		#define SAMPLES ${M0}
		#define GOLDEN_ANGLE 2.39996322973

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float sigma;

		#include <common>

		void main() {

			vec3 outputDirection = normalize( vWorldDirection );

			vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, outputDirection ) );
			vec3 bitangent = cross( outputDirection, tangent );

			// Truncate the kernel at three standard deviations or at the antipode.
			float thetaMax = min( 3.0 * sigma, PI );
			float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

			vec3 accumColor = vec3( 0.0 );
			float accumWeight = 0.0;

			for ( int i = 0; i < SAMPLES; i ++ ) {

				// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
				float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
				float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
				float phi = float( i ) * GOLDEN_ANGLE;

				vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
				vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

				// Correct the planar sample density to solid angle.
				float weight = sin( theta ) / theta;

				accumColor += weight * textureLod( envMap, sampleDirection, 0.0 ).rgb;
				accumWeight += weight;

			}

			gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

		}
	`)}function Nc(){return lr("PMREMEquirectangularToCubemap",{envMap:{value:null}},`

		varying vec3 vWorldDirection;

		uniform sampler2D envMap;

		#include <common>

		void main() {

			// Average four subpixel samples to preserve small, bright features.
			vec3 direction = normalize( vWorldDirection );
			vec3 dx = dFdx( direction ) * 0.25;
			vec3 dy = dFdy( direction ) * 0.25;

			vec3 color = textureLod( envMap, equirectUv( normalize( direction - dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction - dx + dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx + dy ) ), 0.0 ).rgb;
			gl_FragColor = vec4( color * 0.25, 1.0 );

		}
	`)}function Uc(){return lr("PMREMCubemapToCubemap",{envMap:{value:null},flipEnvMap:{value:-1}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float flipEnvMap;

		void main() {

			gl_FragColor = vec4( textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) ).rgb, 1.0 );

		}
	`)}function A0(n){let t=new WeakMap,e=new WeakMap,i=null;function s(p,m=!1){return p==null?null:m?a(p):r(p)}function r(p){if(p&&p.isTexture){const m=p.mapping;if(m===ba||m===Ta)if(t.has(p)){const g=t.get(p).texture;return o(g,p.mapping)}else{const g=p.image;if(g&&g.height>0){const M=new Al(g.height);return M.fromEquirectangularTexture(n,p),t.set(p,M),p.addEventListener("dispose",l),o(M.texture,p.mapping)}else return null}}return p}function a(p){if(p&&p.isTexture&&p.isPMREMTexture!==!0){const m=p.mapping,g=m===ba||m===Ta,M=m===ys||m===er;if(g||M){let d=e.get(p);const u=d!==void 0?d.texture.pmremVersion:0;if(p.isRenderTargetTexture&&p.pmremVersion!==u)return i===null&&(i=new oa(n)),d=g?i.fromEquirectangular(p,d):i.fromCubemap(p,d),d.texture.pmremVersion=p.pmremVersion,e.set(p,d),d.texture;if(d!==void 0)return d.texture;{const v=p.image;return g&&v&&v.height>0||M&&v&&c(v)?(i===null&&(i=new oa(n)),d=g?i.fromEquirectangular(p):i.fromCubemap(p),d.texture.pmremVersion=p.pmremVersion,e.set(p,d),p.addEventListener("dispose",h),d.texture):null}}}return p}function o(p,m){return m===ba?p.mapping=ys:m===Ta&&(p.mapping=er),p}function c(p){let m=0;const g=6;for(let M=0;M<g;M++)p[M]!==void 0&&m++;return m===g}function l(p){const m=p.target;m.removeEventListener("dispose",l);const g=t.get(m);g!==void 0&&(t.delete(m),g.dispose())}function h(p){const m=p.target;m.removeEventListener("dispose",h);const g=e.get(m);g!==void 0&&(e.delete(m),g.dispose())}function f(){t=new WeakMap,e=new WeakMap,i!==null&&(i.dispose(),i=null)}return{get:s,dispose:f}}function R0(n){const t={};function e(i){if(t[i]!==void 0)return t[i];const s=n.getExtension(i);return t[i]=s,s}return{has:function(i){return e(i)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(i){const s=e(i);return s===null&&Yr("WebGLRenderer: "+i+" extension not supported."),s}}}function C0(n,t,e,i){const s={},r=new WeakMap,a=new FinalizationRegistry(g=>delete s[g]);function o(g){c(g.target)}function c(g){g.index!==null&&t.remove(g.index);for(const d in g.attributes)t.remove(g.attributes[d]);g.removeEventListener("dispose",o),delete s[g.id],a.unregister(g);const M=r.get(g);M&&(t.remove(M),r.delete(g)),i.releaseStatesOfGeometry(g),g.isInstancedBufferGeometry===!0&&delete g._maxInstanceCount,e.memory.geometries--}function l(g,M){return s[M.id]!==void 0||(M.addEventListener("dispose",o),s[M.id]=new WeakRef(M),a.register(M,M.id,M),e.memory.geometries++),M}function h(g){const M=g.attributes;for(const d in M)t.update(M[d],n.ARRAY_BUFFER)}function f(g){const M=g.index,d=g.attributes.position;let u=0;if(d===void 0)return;const v=M!==null?M.array.length:d.array.length/3-1,b=d.count>=65535?Zh:Kh,y=new b(Math.ceil(v/3)*6,1),w=y.array;if(M!==null){const _=M.array;u=M.version;for(let E=0,L=0;E<v;E+=3){const R=_[E+0],I=_[E+1],F=_[E+2];w[L++]=R,w[L++]=I,w[L++]=I,w[L++]=F,w[L++]=F,w[L++]=R}}else{u=d.version;for(let _=0,E=0;_<v;_+=3){const L=_+0,R=_+1,I=_+2;w[E++]=L,w[E++]=R,w[E++]=R,w[E++]=I,w[E++]=I,w[E++]=L}}y.version=u;const T=r.get(g);T&&t.remove(T),r.set(g,y)}function p(g){const M=r.get(g);if(M){const d=g.index;d!==null&&M.version<d.version&&f(g)}else f(g);return r.get(g)}function m(){for(const g in s){const M=s[g].deref();M!==void 0&&c(M)}}return{get:l,update:h,getWireframeAttribute:p,dispose:m}}function P0(n,t,e){let i;function s(f){i=f}let r,a;function o(f){r=f.type,a=f.bytesPerElement}function c(f,p){n.drawElements(i,p,r,f*a),e.update(p,i,1)}function l(f,p,m){m!==0&&(n.drawElementsInstanced(i,p,r,f*a,m),e.update(p,i,m))}function h(f,p,m){if(m===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,p,0,r,f,0,m);let M=0;for(let d=0;d<m;d++)M+=p[d];e.update(M,i,1)}this.setMode=s,this.setIndex=o,this.render=c,this.renderInstances=l,this.renderMultiDraw=h}function L0(n){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function i(r,a,o){switch(e.calls++,a){case n.TRIANGLES:e.triangles+=o*(r/3);break;case n.LINES:e.lines+=o*(r/2);break;case n.LINE_STRIP:e.lines+=o*(r-1);break;case n.LINE_LOOP:e.lines+=o*r;break;case n.POINTS:e.points+=o*r;break;default:jt("WebGLInfo: Unknown draw mode:",a);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:i}}function D0(n,t,e){const i=new WeakMap,s=new _e;function r(a,o,c){const l=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,f=h!==void 0?h.length:0;let p=i.get(o);if(p===void 0||p.count!==f){let L=function(){_.dispose(),i.delete(o),o.removeEventListener("dispose",L)};p!==void 0&&p.texture.dispose();const m=o.morphAttributes.position!==void 0,g=o.morphAttributes.normal!==void 0,M=o.morphAttributes.color!==void 0,d=o.morphAttributes.position||[],u=o.morphAttributes.normal||[],v=o.morphAttributes.color||[];let b=0;m===!0&&(b=1),g===!0&&(b=2),M===!0&&(b=3);let y=o.attributes.position.count*b,w=1;y>t.maxTextureSize&&(w=Math.ceil(y/t.maxTextureSize),y=t.maxTextureSize);const T=new Float32Array(y*w*4*f),_=new Yh(T,y,w,f);_.type=kn,_.needsUpdate=!0;const E=b*4;for(let R=0;R<f;R++){const I=d[R],F=u[R],z=v[R],C=y*w*4*R;for(let H=0;H<I.count;H++){const $=H*E;m===!0&&(s.fromBufferAttribute(I,H),T[C+$+0]=s.x,T[C+$+1]=s.y,T[C+$+2]=s.z,T[C+$+3]=0),g===!0&&(s.fromBufferAttribute(F,H),T[C+$+4]=s.x,T[C+$+5]=s.y,T[C+$+6]=s.z,T[C+$+7]=0),M===!0&&(s.fromBufferAttribute(z,H),T[C+$+8]=s.x,T[C+$+9]=s.y,T[C+$+10]=s.z,T[C+$+11]=z.itemSize===4?s.w:1)}}p={count:f,texture:_,size:new At(y,w)},i.set(o,p),o.addEventListener("dispose",L)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)c.getUniforms().setValue(n,"morphTexture",a.morphTexture,e);else{let m=0;for(let M=0;M<l.length;M++)m+=l[M];const g=o.morphTargetsRelative?1:1-m;c.getUniforms().setValue(n,"morphTargetBaseInfluence",g),c.getUniforms().setValue(n,"morphTargetInfluences",l)}c.getUniforms().setValue(n,"morphTargetsTexture",p.texture,e),c.getUniforms().setValue(n,"morphTargetsTextureSize",p.size)}return{update:r}}function I0(n,t,e,i,s){let r=new WeakMap;function a(l){const h=s.render.frame,f=l.geometry,p=t.get(l,f);if(r.get(p)!==h&&(t.update(p),r.set(p,h)),l.isInstancedMesh&&(l.hasEventListener("dispose",c)===!1&&l.addEventListener("dispose",c),r.get(l)!==h&&(e.update(l.instanceMatrix,n.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,n.ARRAY_BUFFER),r.set(l,h))),l.isSkinnedMesh){const m=l.skeleton;r.get(m)!==h&&(m.update(),r.set(m,h))}return p}function o(){r=new WeakMap}function c(l){const h=l.target;h.removeEventListener("dispose",c),i.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:a,dispose:o}}const N0={[wh]:"LINEAR_TONE_MAPPING",[Ah]:"REINHARD_TONE_MAPPING",[Rh]:"CINEON_TONE_MAPPING",[Ch]:"ACES_FILMIC_TONE_MAPPING",[Lh]:"AGX_TONE_MAPPING",[Dh]:"NEUTRAL_TONE_MAPPING",[Ph]:"CUSTOM_TONE_MAPPING"};function U0(n,t,e,i,s,r){const a=new Gn(t,e,{type:n,depthBuffer:s,stencilBuffer:r,samples:i?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1});let o=null,c=null,l=null;const h=new ve;h.setAttribute("position",new ae([-1,3,0,-1,-1,0,3,-1,0],3)),h.setAttribute("uv",new ae([0,2,0,0,2,0],2));const f=new Mf({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),p=new Oe(h,f),m=new au(-1,1,1,-1,0,1);let g=null,M=null,d=!1,u,v=null,b=[],y=!1;this.setSize=function(w,T){a.setSize(w,T),o!==null&&o.setSize(w,T),c!==null&&c.setSize(w,T);for(let _=0;_<b.length;_++){const E=b[_];E.setSize&&E.setSize(w,T)}},this.setEffects=function(w){b=w,y=b.length>0&&b[0].isRenderPass===!0;const T=a.width,_=a.height;b.length>0&&o===null&&(o=new Gn(T,_,{type:Wn,depthBuffer:!1,stencilBuffer:!1}),c=new Gn(T,_,{type:Wn,depthBuffer:!1,stencilBuffer:!1}));const E=s===!0&&b.some(L=>L.needsDepthTexture===!0);E!==(a.depthTexture!==null)&&(E===!0&&l===null&&(l=new bs(T,_),r===!0&&(l.format=_i,l.type=Es)),a.dispose(),a.depthTexture=E?l:null,a.resolveDepthBuffer=E,a.storeMultisampledDepthBuffer=E);for(let L=0;L<b.length;L++){const R=b[L];R.setSize&&R.setSize(T,_),E&&R.needsDepthTexture===!0&&R.setDepthTexture&&R.setDepthTexture(l)}},this.begin=function(w,T){if(d||w.toneMapping===ni&&b.length===0)return!1;if(v=T,T!==null){const _=T.width,E=T.height;(a.width!==_||a.height!==E)&&this.setSize(_,E)}return y===!1&&w.setRenderTarget(a),u=w.toneMapping,w.toneMapping=ni,!0},this.hasRenderPass=function(){return y},this.end=function(w,T){w.toneMapping=u,d=!0;let _=a,E=o;for(let L=0;L<b.length;L++){const R=b[L];R.enabled!==!1&&(R.render(w,E,_,T),R.needsSwap!==!1&&(_=E,E=E===o?c:o))}if(g!==w.outputColorSpace||M!==w.toneMapping){g=w.outputColorSpace,M=w.toneMapping,f.defines={},Jt.getTransfer(g)===re&&(f.defines.SRGB_TRANSFER="");const L=N0[M];L&&(f.defines[L]=""),f.needsUpdate=!0}f.uniforms.tDiffuse.value=_.texture,w.setRenderTarget(v),w.render(p,m),v=null,d=!1},this.isCompositing=function(){return d},this.dispose=function(){a.dispose(),o!==null&&o.dispose(),c!==null&&c.dispose(),h.dispose(),f.dispose()}}const uu=new We,du=new bs(1,1),fu=new eu(1),pu=new Yh,mu=new qd,gu=new tu,Fc=[],Oc=[],zc=new Float32Array(16),kc=new Float32Array(9),Bc=new Float32Array(4);function Ps(n,t,e){const i=n[0];if(i<=0||i>0)return n;const s=t*e;let r=Fc[s];if(r===void 0&&(r=new Float32Array(s),Fc[s]=r),t!==0){i.toArray(r,0);for(let a=1,o=0;a!==t;++a)o+=e,n[a].toArray(r,o)}return r}function Re(n,t){if(n.length!==t.length)return!1;for(let e=0,i=n.length;e<i;e++)if(n[e]!==t[e])return!1;return!0}function Ce(n,t){for(let e=0,i=t.length;e<i;e++)n[e]=t[e]}function ma(n,t){let e=Oc[t];e===void 0&&(e=new Int32Array(t),Oc[t]=e);for(let i=0;i!==t;++i)e[i]=n.allocateTextureUnit();return e}function F0(n,t){const e=this.cache;e[0]!==t&&(n.uniform1f(this.addr,t),e[0]=t)}function O0(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Re(e,t))return;n.uniform2fv(this.addr,t),Ce(e,t)}}function z0(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(n.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(Re(e,t))return;n.uniform3fv(this.addr,t),Ce(e,t)}}function k0(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Re(e,t))return;n.uniform4fv(this.addr,t),Ce(e,t)}}function B0(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(Re(e,t))return;n.uniformMatrix2fv(this.addr,!1,t),Ce(e,t)}else{if(Re(e,i))return;Bc.set(i),n.uniformMatrix2fv(this.addr,!1,Bc),Ce(e,i)}}function G0(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(Re(e,t))return;n.uniformMatrix3fv(this.addr,!1,t),Ce(e,t)}else{if(Re(e,i))return;kc.set(i),n.uniformMatrix3fv(this.addr,!1,kc),Ce(e,i)}}function H0(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(Re(e,t))return;n.uniformMatrix4fv(this.addr,!1,t),Ce(e,t)}else{if(Re(e,i))return;zc.set(i),n.uniformMatrix4fv(this.addr,!1,zc),Ce(e,i)}}function V0(n,t){const e=this.cache;e[0]!==t&&(n.uniform1i(this.addr,t),e[0]=t)}function W0(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Re(e,t))return;n.uniform2iv(this.addr,t),Ce(e,t)}}function X0(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Re(e,t))return;n.uniform3iv(this.addr,t),Ce(e,t)}}function $0(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Re(e,t))return;n.uniform4iv(this.addr,t),Ce(e,t)}}function Y0(n,t){const e=this.cache;e[0]!==t&&(n.uniform1ui(this.addr,t),e[0]=t)}function q0(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Re(e,t))return;n.uniform2uiv(this.addr,t),Ce(e,t)}}function K0(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Re(e,t))return;n.uniform3uiv(this.addr,t),Ce(e,t)}}function Z0(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Re(e,t))return;n.uniform4uiv(this.addr,t),Ce(e,t)}}function ga(n){return n.version===0&&(n.compareFunction=Vh,n.needsUpdate=!0),n}function J0(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s);let r;this.type===n.SAMPLER_2D_SHADOW?r=ga(du):r=uu,e.setTexture2D(t||r,s)}function Q0(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTexture3D(t||mu,s)}function j0(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s);let r;this.type===n.SAMPLER_CUBE_SHADOW?r=ga(fu):r=gu,e.setTextureCube(t||r,s)}function tg(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTexture2DArray(t||pu,s)}function eg(n){switch(n){case 5126:return F0;case 35664:return O0;case 35665:return z0;case 35666:return k0;case 35674:return B0;case 35675:return G0;case 35676:return H0;case 5124:case 35670:return V0;case 35667:case 35671:return W0;case 35668:case 35672:return X0;case 35669:case 35673:return $0;case 5125:return Y0;case 36294:return q0;case 36295:return K0;case 36296:return Z0;case 35678:case 36198:case 36298:case 36306:case 35682:return J0;case 35679:case 36299:case 36307:return Q0;case 35680:case 36300:case 36308:case 36293:return j0;case 36289:case 36303:case 36311:case 36292:return tg}}function ng(n,t){n.uniform1fv(this.addr,t)}function ig(n,t){const e=Ps(t,this.size,2);n.uniform2fv(this.addr,e)}function sg(n,t){const e=Ps(t,this.size,3);n.uniform3fv(this.addr,e)}function rg(n,t){const e=Ps(t,this.size,4);n.uniform4fv(this.addr,e)}function ag(n,t){const e=Ps(t,this.size,4);n.uniformMatrix2fv(this.addr,!1,e)}function og(n,t){const e=Ps(t,this.size,9);n.uniformMatrix3fv(this.addr,!1,e)}function lg(n,t){const e=Ps(t,this.size,16);n.uniformMatrix4fv(this.addr,!1,e)}function cg(n,t){n.uniform1iv(this.addr,t)}function hg(n,t){n.uniform2iv(this.addr,t)}function ug(n,t){n.uniform3iv(this.addr,t)}function dg(n,t){n.uniform4iv(this.addr,t)}function fg(n,t){n.uniform1uiv(this.addr,t)}function pg(n,t){n.uniform2uiv(this.addr,t)}function mg(n,t){n.uniform3uiv(this.addr,t)}function gg(n,t){n.uniform4uiv(this.addr,t)}function _g(n,t,e){const i=this.cache,s=t.length,r=ma(e,s);Re(i,r)||(n.uniform1iv(this.addr,r),Ce(i,r));let a;this.type===n.SAMPLER_2D_SHADOW?a=ga(du):a=uu;for(let o=0;o!==s;++o)e.setTexture2D(t[o]||a,r[o])}function xg(n,t,e){const i=this.cache,s=t.length,r=ma(e,s);Re(i,r)||(n.uniform1iv(this.addr,r),Ce(i,r));for(let a=0;a!==s;++a)e.setTexture3D(t[a]||mu,r[a])}function vg(n,t,e){const i=this.cache,s=t.length,r=ma(e,s);Re(i,r)||(n.uniform1iv(this.addr,r),Ce(i,r));let a;this.type===n.SAMPLER_CUBE_SHADOW?a=ga(fu):a=gu;for(let o=0;o!==s;++o)e.setTextureCube(t[o]||a,r[o])}function Mg(n,t,e){const i=this.cache,s=t.length,r=ma(e,s);Re(i,r)||(n.uniform1iv(this.addr,r),Ce(i,r));for(let a=0;a!==s;++a)e.setTexture2DArray(t[a]||pu,r[a])}function Sg(n){switch(n){case 5126:return ng;case 35664:return ig;case 35665:return sg;case 35666:return rg;case 35674:return ag;case 35675:return og;case 35676:return lg;case 5124:case 35670:return cg;case 35667:case 35671:return hg;case 35668:case 35672:return ug;case 35669:case 35673:return dg;case 5125:return fg;case 36294:return pg;case 36295:return mg;case 36296:return gg;case 35678:case 36198:case 36298:case 36306:case 35682:return _g;case 35679:case 36299:case 36307:return xg;case 35680:case 36300:case 36308:case 36293:return vg;case 36289:case 36303:case 36311:case 36292:return Mg}}class yg{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.setValue=eg(e.type)}}class Eg{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=Sg(e.type)}}class bg{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,i){const s=this.seq;for(let r=0,a=s.length;r!==a;++r){const o=s[r];o.setValue(t,e[o.id],i)}}}const Ja=/(\w+)(\])?(\[|\.)?/g;function Gc(n,t){n.seq.push(t),n.map[t.id]=t}function Tg(n,t,e){const i=n.name,s=i.length;for(Ja.lastIndex=0;;){const r=Ja.exec(i),a=Ja.lastIndex;let o=r[1];const c=r[2]==="]",l=r[3];if(c&&(o=o|0),l===void 0||l==="["&&a+2===s){Gc(e,l===void 0?new yg(o,n,t):new Eg(o,n,t));break}else{let f=e.map[o];f===void 0&&(f=new bg(o),Gc(e,f)),e=f}}}class Kr{constructor(t,e){this.seq=[],this.map={};const i=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let a=0;a<i;++a){const o=t.getActiveUniform(e,a),c=t.getUniformLocation(e,o.name);Tg(o,c,this)}const s=[],r=[];for(const a of this.seq)a.type===t.SAMPLER_2D_SHADOW||a.type===t.SAMPLER_CUBE_SHADOW||a.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(a):r.push(a);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,i,s){const r=this.map[e];r!==void 0&&r.setValue(t,i,s)}setOptional(t,e,i){const s=e[i];s!==void 0&&this.setValue(t,i,s)}static upload(t,e,i,s){for(let r=0,a=e.length;r!==a;++r){const o=e[r],c=i[o.id];c.needsUpdate!==!1&&o.setValue(t,c.value,s)}}static seqWithValue(t,e){const i=[];for(let s=0,r=t.length;s!==r;++s){const a=t[s];a.id in e&&i.push(a)}return i}}function Hc(n,t,e){const i=n.createShader(t);return n.shaderSource(i,e),n.compileShader(i),i}const wg=37297;let Ag=0;function Rg(n,t){const e=n.split(`
`),i=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let a=s;a<r;a++){const o=a+1;i.push(`${o===t?">":" "} ${o}: ${e[a]}`)}return i.join(`
`)}const Vc=new Ot;function Cg(n){Jt._getMatrix(Vc,Jt.workingColorSpace,n);const t=`mat3( ${Vc.elements.map(e=>e.toFixed(4))} )`;switch(Jt.getTransfer(n)){case ta:return[t,"LinearTransferOETF"];case re:return[t,"sRGBTransferOETF"];default:return Nt("WebGLProgram: Unsupported color space: ",n),[t,"LinearTransferOETF"]}}function Wc(n,t,e){const i=n.getShaderParameter(t,n.COMPILE_STATUS),r=(n.getShaderInfoLog(t)||"").trim();if(i&&r==="")return"";const a=/ERROR: 0:(\d+)/.exec(r);if(a){const o=parseInt(a[1]);return e.toUpperCase()+`

`+r+`

`+Rg(n.getShaderSource(t),o)}else return r}function Pg(n,t){const e=Cg(t);return[`vec4 ${n}( vec4 value ) {`,`	return ${e[1]}( vec4( ${e[0]} * value.rgb, value.a ) );`,"}"].join(`
`)}const Lg={[wh]:"Linear",[Ah]:"Reinhard",[Rh]:"Cineon",[Ch]:"ACESFilmic",[Lh]:"AgX",[Dh]:"Neutral",[Ph]:"Custom"};function Dg(n,t){const e=Lg[t];return e===void 0?(Nt("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+n+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+n+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const kr=new N;function Ig(){Jt.getLuminanceCoefficients(kr);const n=kr.x.toFixed(4),t=kr.y.toFixed(4),e=kr.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Ng(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ws).join(`
`)}function Ug(n){const t=[];for(const e in n){const i=n[e];i!==!1&&t.push("#define "+e+" "+i)}return t.join(`
`)}function Fg(n,t){const e={},i=n.getProgramParameter(t,n.ACTIVE_ATTRIBUTES);for(let s=0;s<i;s++){const r=n.getActiveAttrib(t,s),a=r.name;let o=1;r.type===n.FLOAT_MAT2&&(o=2),r.type===n.FLOAT_MAT3&&(o=3),r.type===n.FLOAT_MAT4&&(o=4),e[a]={type:r.type,location:n.getAttribLocation(t,a),locationSize:o}}return e}function Ws(n){return n!==""}function Xc(n,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return n.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows).replace(/NUM_LIGHT_PROBE_GRIDS/g,t.numLightProbeGrids)}function $c(n,t){return n.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const Og=/^[ \t]*#include +<([\w\d./]+)>/gm;function Jo(n){return n.replace(Og,zg)}function zg(n,t){const e=Wt[t];if(e===void 0)throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">");return Jo(e)}const kg=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Yc(n){return n.replace(kg,Bg)}function Bg(n,t,e,i){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=i.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function qc(n){let t=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?t+=`
#define HIGH_PRECISION`:n.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}const Gg={[xs]:"SHADOWMAP_TYPE_PCF",[Vs]:"SHADOWMAP_TYPE_VSM"};function Hg(n){return Gg[n.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const Vg={[er]:"ENVMAP_MODE_REFRACTION"};function Wg(n){return n.envMap===!1?"ENVMAP_MODE_REFLECTION":Vg[n.envMapMode]||"ENVMAP_MODE_REFLECTION"}const Xg={[Th]:"ENVMAP_BLENDING_MULTIPLY",[fd]:"ENVMAP_BLENDING_MIX",[pd]:"ENVMAP_BLENDING_ADD"};function $g(n){return n.envMap===!1?"ENVMAP_BLENDING_NONE":Xg[n.combine]||"ENVMAP_BLENDING_NONE"}function Yg(n,t,e,i){const s=n.getContext(),r=e.defines;let a=e.vertexShader,o=e.fragmentShader;const c=Hg(e),l=e.envMapPMREM===!0?"ENVMAP_TYPE_PMREM":"ENVMAP_TYPE_CUBE",h=Wg(e),f=$g(e),p=Ng(e),m=Ug(r),g=s.createProgram();let M,d,u=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(M=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,m].filter(Ws).join(`
`),M.length>0&&(M+=`
`),d=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,m].filter(Ws).join(`
`),d.length>0&&(d+=`
`)):(M=[qc(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,m,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.diffuseRoughnessMap?"#define USE_DIFFUSE_ROUGHNESSMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.diffuseRoughnessMapUv?"#define DIFFUSE_ROUGHNESSMAP_UV "+e.diffuseRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ws).join(`
`),d=[qc(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,m,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+l:"",e.envMap?"#define "+h:"",e.envMap?"#define "+f:"",e.envMapPMREM?"#define ENVMAP_MAX_LOD "+e.envMapMaxLod+".0":"",e.envMapPMREM?"#define ENVMAP_SIZE "+e.envMapSize+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.diffuseRoughness?"#define USE_DIFFUSE_ROUGHNESS":"",e.diffuseRoughnessMap?"#define USE_DIFFUSE_ROUGHNESSMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==ni?"#define TONE_MAPPING":"",e.toneMapping!==ni?Wt.tonemapping_pars_fragment:"",e.toneMapping!==ni?Dg("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Wt.colorspace_pars_fragment,Pg("linearToOutputTexel",e.outputColorSpace),Ig(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(Ws).join(`
`)),a=Jo(a),a=Xc(a,e),a=$c(a,e),o=Jo(o),o=Xc(o,e),o=$c(o,e),a=Yc(a),o=Yc(o),e.isRawShaderMaterial!==!0&&(u=`#version 300 es
`,M=[p,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+M,d=["#define varying in",e.glslVersion===Ql?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Ql?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+d);const v=u+M+a,b=u+d+o,y=Hc(s,s.VERTEX_SHADER,v),w=Hc(s,s.FRAGMENT_SHADER,b);s.attachShader(g,y),s.attachShader(g,w),e.index0AttributeName!==void 0?s.bindAttribLocation(g,0,e.index0AttributeName):e.hasPositionAttribute===!0&&s.bindAttribLocation(g,0,"position"),s.linkProgram(g);function T(R){if(n.debug.checkShaderErrors){const I=s.getProgramInfoLog(g)||"",F=s.getShaderInfoLog(y)||"",z=s.getShaderInfoLog(w)||"",C=I.trim(),H=F.trim(),$=z.trim();let V=!0,et=!0;if(s.getProgramParameter(g,s.LINK_STATUS)===!1)if(V=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(s,g,y,w);else{const U=Wc(s,y,"vertex"),X=Wc(s,w,"fragment");jt("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(g,s.VALIDATE_STATUS)+`

Material Name: `+R.name+`
Material Type: `+R.type+`

Program Info Log: `+C+`
`+U+`
`+X)}else C!==""?Nt("WebGLProgram: Program Info Log:",C):(H===""||$==="")&&(et=!1);et&&(R.diagnostics={runnable:V,programLog:C,vertexShader:{log:H,prefix:M},fragmentShader:{log:$,prefix:d}})}s.deleteShader(y),s.deleteShader(w),_=new Kr(s,g),E=Fg(s,g)}let _;this.getUniforms=function(){return _===void 0&&T(this),_};let E;this.getAttributes=function(){return E===void 0&&T(this),E};let L=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return L===!1&&(L=s.getProgramParameter(g,wg)),L},this.destroy=function(){i.releaseStatesOfProgram(this),s.deleteProgram(g),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=Ag++,this.cacheKey=t,this.usedTimes=1,this.program=g,this.vertexShader=y,this.fragmentShader=w,this}let qg=0;class Kg{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,i){const s=this._getShaderCacheForMaterial(t);return s.has(e)===!1&&(s.add(e),e.usedTimes++),s.has(i)===!1&&(s.add(i),i.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const i of e)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let i=e.get(t);return i===void 0&&(i=new Set,e.set(t,i)),i}_getShaderStage(t){const e=this.shaderCache;let i=e.get(t);return i===void 0&&(i=new Zg(t),e.set(t,i)),i}}class Zg{constructor(t){this.id=qg++,this.code=t,this.usedTimes=0}}function Jg(n){return n===Vi||n===Jr||n===Qr}function Qg(n,t,e,i,s,r){const a=new Sl,o=new Kg,c=new Set,l=[],h=new Map,f=i.logarithmicDepthBuffer,p={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function m(_){return c.add(_),_===0?"uv":`uv${_}`}function g(_,E,L,R,I,F){const z=R.fog,C=I.geometry,H=_.isMeshStandardMaterial||_.isMeshLambertMaterial||_.isMeshPhongMaterial?R.environment:null,$=_.isMeshStandardMaterial||_.isMeshLambertMaterial&&!_.envMap||_.isMeshPhongMaterial&&!_.envMap,V=t.get(_.envMap||H,$),et=p[_.type];let U=i.precision;_.precision!==null&&(U=i.getMaxPrecision(_.precision),U!==_.precision&&Nt("WebGLProgram.getParameters:",_.precision,"not supported, using",U,"instead."));const X=C.morphAttributes.position||C.morphAttributes.normal||C.morphAttributes.color,J=X!==void 0?X.length:0;let dt=0;C.morphAttributes.position!==void 0&&(dt=1),C.morphAttributes.normal!==void 0&&(dt=2),C.morphAttributes.color!==void 0&&(dt=3);let Tt,K,gt,Mt;if(et){const pt=Un[et];Tt=pt.vertexShader,K=pt.fragmentShader}else{Tt=_.vertexShader,K=_.fragmentShader;const pt=o.getVertexShaderStage(_),ie=o.getFragmentShaderStage(_);o.update(_,pt,ie),gt=pt.id,Mt=ie.id}const Ct=n.getRenderTarget(),_t=n.state.buffers.depth.getReversed(),kt=I.isInstancedMesh===!0,Me=I.isBatchedMesh===!0,It=!!_.map,ne=!!_.matcap,oe=!!V,qt=oe&&V.isPMREMTexture===!0,Ue=!!_.aoMap,Ee=!!_.lightMap,Qe=!!_.bumpMap&&_.wireframe===!1,me=!!_.normalMap,Pn=!!_.displacementMap,Pe=!!_.emissiveMap,fn=!!_.metalnessMap,pn=!!_.roughnessMap,mn=_.anisotropy>0,O=_.clearcoat>0,gn=_.diffuseRoughness>0,de=_.dispersion>0,fe=_.retroreflectivity>0,ft=_.iridescence>0,be=_.sheen>0,Pt=_.transmission>0,Ft=mn&&!!_.anisotropyMap,A=O&&!!_.clearcoatMap,x=O&&!!_.clearcoatNormalMap,B=O&&!!_.clearcoatRoughnessMap,nt=gn&&!!_.diffuseRoughnessMap,j=ft&&!!_.iridescenceMap,rt=ft&&!!_.iridescenceThicknessMap,ht=be&&!!_.sheenColorMap,q=be&&!!_.sheenRoughnessMap,Z=!!_.specularMap,ot=!!_.specularColorMap,P=!!_.specularIntensityMap,Q=Pt&&!!_.transmissionMap,Y=Pt&&!!_.thicknessMap,lt=!!_.gradientMap,st=!!_.alphaMap,at=_.alphaTest>0,bt=!!_.alphaHash,Vt=!!_.extensions;let it=ni;_.toneMapped&&(Ct===null||Ct.isXRRenderTarget===!0)&&(it=n.toneMapping);const Rt=qt?V.isCompressedCubeTexture?V.image[0].mipmaps:V.mipmaps:null,Ht={shaderID:et,shaderType:_.type,shaderName:_.name,vertexShader:Tt,fragmentShader:K,defines:_.defines,customVertexShaderID:gt,customFragmentShaderID:Mt,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:U,batching:Me,batchingColor:Me&&I._colorsTexture!==null,instancing:kt,instancingColor:kt&&I.instanceColor!==null,instancingMorph:kt&&I.morphTexture!==null,outputColorSpace:Ct===null?n.outputColorSpace:Ct.isXRRenderTarget===!0?Ct.texture.colorSpace:Jt.workingColorSpace,alphaToCoverage:!!_.alphaToCoverage,map:It,matcap:ne,envMap:oe,envMapMode:oe&&V.mapping,envMapPMREM:qt,envMapMaxLod:qt?Rt.length-1:null,envMapSize:qt?Rt[0].width:null,aoMap:Ue,lightMap:Ee,bumpMap:Qe,normalMap:me,displacementMap:Pn,emissiveMap:Pe,normalMapObjectSpace:me&&_.normalMapType===_d,normalMapTangentSpace:me&&_.normalMapType===qo,packedNormalMap:me&&_.normalMapType===qo&&Jg(_.normalMap.format),metalnessMap:fn,roughnessMap:pn,anisotropy:mn,anisotropyMap:Ft,clearcoat:O,clearcoatMap:A,clearcoatNormalMap:x,clearcoatRoughnessMap:B,diffuseRoughness:gn,diffuseRoughnessMap:nt,dispersion:de,retroreflection:fe,iridescence:ft,iridescenceMap:j,iridescenceThicknessMap:rt,sheen:be,sheenColorMap:ht,sheenRoughnessMap:q,specularMap:Z,specularColorMap:ot,specularIntensityMap:P,transmission:Pt,transmissionMap:Q,thicknessMap:Y,gradientMap:lt,opaque:_.transparent===!1&&_.blending===Ys&&_.alphaToCoverage===!1,alphaMap:st,alphaTest:at,alphaHash:bt,combine:_.combine,mapUv:It&&m(_.map.channel),aoMapUv:Ue&&m(_.aoMap.channel),lightMapUv:Ee&&m(_.lightMap.channel),bumpMapUv:Qe&&m(_.bumpMap.channel),normalMapUv:me&&m(_.normalMap.channel),displacementMapUv:Pn&&m(_.displacementMap.channel),emissiveMapUv:Pe&&m(_.emissiveMap.channel),metalnessMapUv:fn&&m(_.metalnessMap.channel),roughnessMapUv:pn&&m(_.roughnessMap.channel),anisotropyMapUv:Ft&&m(_.anisotropyMap.channel),clearcoatMapUv:A&&m(_.clearcoatMap.channel),clearcoatNormalMapUv:x&&m(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:B&&m(_.clearcoatRoughnessMap.channel),diffuseRoughnessMapUv:nt&&m(_.diffuseRoughnessMap.channel),iridescenceMapUv:j&&m(_.iridescenceMap.channel),iridescenceThicknessMapUv:rt&&m(_.iridescenceThicknessMap.channel),sheenColorMapUv:ht&&m(_.sheenColorMap.channel),sheenRoughnessMapUv:q&&m(_.sheenRoughnessMap.channel),specularMapUv:Z&&m(_.specularMap.channel),specularColorMapUv:ot&&m(_.specularColorMap.channel),specularIntensityMapUv:P&&m(_.specularIntensityMap.channel),transmissionMapUv:Q&&m(_.transmissionMap.channel),thicknessMapUv:Y&&m(_.thicknessMap.channel),alphaMapUv:st&&m(_.alphaMap.channel),vertexTangents:!!C.attributes.tangent&&(me||mn),vertexNormals:!!C.attributes.normal,vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!C.attributes.color&&C.attributes.color.itemSize===4,pointsUvs:I.isPoints===!0&&!!C.attributes.uv&&(It||st),fog:!!z,useFog:_.fog===!0,fogExp2:!!z&&z.isFogExp2,flatShading:_.wireframe===!1&&(_.flatShading===!0||C.attributes.normal===void 0&&me===!1&&(_.isMeshLambertMaterial||_.isMeshPhongMaterial||_.isMeshStandardMaterial||_.isMeshPhysicalMaterial)),sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:f,reversedDepthBuffer:_t,skinning:I.isSkinnedMesh===!0,hasPositionAttribute:C.attributes.position!==void 0,morphTargets:C.morphAttributes.position!==void 0,morphNormals:C.morphAttributes.normal!==void 0,morphColors:C.morphAttributes.color!==void 0,morphTargetsCount:J,morphTextureStride:dt,numSunLights:E.sun.length,numDirLights:E.directional.length,numPointLights:E.point.length,numSpotLights:E.spot.length,numSpotLightMaps:E.spotLightMap.length,numRectAreaLights:E.rectArea.length,numHemiLights:E.hemi.length,numSunLightShadows:E.sunShadowMap.length,numDirLightShadows:E.directionalShadowMap.length,numPointLightShadows:E.pointShadowMap.length,numSpotLightShadows:E.spotShadowMap.length,numSpotLightShadowsWithMaps:E.numSpotLightShadowsWithMaps,numLightProbes:E.numLightProbes,numLightProbeGrids:F.filter(pt=>pt.texture!==null).length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:_.dithering,shadowMapEnabled:n.shadowMap.enabled&&L.length>0,shadowMapType:n.shadowMap.type,toneMapping:it,decodeVideoTexture:It&&_.map.isVideoTexture===!0&&Jt.getTransfer(_.map.colorSpace)===re,decodeVideoTextureEmissive:Pe&&_.emissiveMap.isVideoTexture===!0&&Jt.getTransfer(_.emissiveMap.colorSpace)===re,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===jn,flipSided:_.side===sn,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionClipCullDistance:Vt&&_.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Vt&&_.extensions.multiDraw===!0||Me)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()};return Ht.vertexUv1s=c.has(1),Ht.vertexUv2s=c.has(2),Ht.vertexUv3s=c.has(3),c.clear(),Ht}function M(_){const E=[];if(_.shaderID?E.push(_.shaderID):(E.push(_.customVertexShaderID),E.push(_.customFragmentShaderID)),_.defines!==void 0)for(const L in _.defines)E.push(L),E.push(_.defines[L]);return _.isRawShaderMaterial===!1&&(d(E,_),u(E,_),E.push(n.outputColorSpace)),E.push(_.customProgramCacheKey),E.join()}function d(_,E){_.push(E.precision),_.push(E.outputColorSpace),_.push(E.envMapMode),_.push(E.envMapPMREM),_.push(E.envMapMaxLod),_.push(E.envMapSize),_.push(E.mapUv),_.push(E.alphaMapUv),_.push(E.lightMapUv),_.push(E.aoMapUv),_.push(E.bumpMapUv),_.push(E.normalMapUv),_.push(E.displacementMapUv),_.push(E.emissiveMapUv),_.push(E.metalnessMapUv),_.push(E.roughnessMapUv),_.push(E.anisotropyMapUv),_.push(E.clearcoatMapUv),_.push(E.clearcoatNormalMapUv),_.push(E.clearcoatRoughnessMapUv),_.push(E.diffuseRoughnessMapUv),_.push(E.iridescenceMapUv),_.push(E.iridescenceThicknessMapUv),_.push(E.sheenColorMapUv),_.push(E.sheenRoughnessMapUv),_.push(E.specularMapUv),_.push(E.specularColorMapUv),_.push(E.specularIntensityMapUv),_.push(E.transmissionMapUv),_.push(E.thicknessMapUv),_.push(E.combine),_.push(E.fogExp2),_.push(E.sizeAttenuation),_.push(E.morphTargetsCount),_.push(E.numSunLights),_.push(E.numDirLights),_.push(E.numPointLights),_.push(E.numSpotLights),_.push(E.numSpotLightMaps),_.push(E.numHemiLights),_.push(E.numRectAreaLights),_.push(E.numSunLightShadows),_.push(E.numDirLightShadows),_.push(E.numPointLightShadows),_.push(E.numSpotLightShadows),_.push(E.numSpotLightShadowsWithMaps),_.push(E.numLightProbes),_.push(E.numLightProbeGrids),_.push(E.shadowMapType),_.push(E.toneMapping),_.push(E.numClippingPlanes),_.push(E.numClipIntersection),_.push(E.depthPacking)}function u(_,E){a.disableAll(),E.instancing&&a.enable(0),E.instancingColor&&a.enable(1),E.instancingMorph&&a.enable(2),E.matcap&&a.enable(3),E.envMap&&a.enable(4),E.normalMapObjectSpace&&a.enable(5),E.normalMapTangentSpace&&a.enable(6),E.clearcoat&&a.enable(7),E.iridescence&&a.enable(8),E.alphaTest&&a.enable(9),E.vertexColors&&a.enable(10),E.vertexAlphas&&a.enable(11),E.vertexUv1s&&a.enable(12),E.vertexUv2s&&a.enable(13),E.vertexUv3s&&a.enable(14),E.vertexTangents&&a.enable(15),E.anisotropy&&a.enable(16),E.alphaHash&&a.enable(17),E.batching&&a.enable(18),E.dispersion&&a.enable(19),E.retroreflection&&a.enable(24),E.diffuseRoughness&&a.enable(25),E.batchingColor&&a.enable(20),E.gradientMap&&a.enable(21),E.packedNormalMap&&a.enable(22),E.vertexNormals&&a.enable(23),_.push(a.mask),a.disableAll(),E.fog&&a.enable(0),E.useFog&&a.enable(1),E.flatShading&&a.enable(2),E.logarithmicDepthBuffer&&a.enable(3),E.reversedDepthBuffer&&a.enable(4),E.skinning&&a.enable(5),E.morphTargets&&a.enable(6),E.morphNormals&&a.enable(7),E.morphColors&&a.enable(8),E.premultipliedAlpha&&a.enable(9),E.shadowMapEnabled&&a.enable(10),E.doubleSided&&a.enable(11),E.flipSided&&a.enable(12),E.useDepthPacking&&a.enable(13),E.dithering&&a.enable(14),E.transmission&&a.enable(15),E.sheen&&a.enable(16),E.opaque&&a.enable(17),E.pointsUvs&&a.enable(18),E.decodeVideoTexture&&a.enable(19),E.decodeVideoTextureEmissive&&a.enable(20),E.alphaToCoverage&&a.enable(21),E.numLightProbeGrids>0&&a.enable(22),E.hasPositionAttribute&&a.enable(23),_.push(a.mask)}function v(_){const E=p[_.type];let L;if(E){const R=Un[E];L=_f.clone(R.uniforms)}else L=_.uniforms;return L}function b(_,E){let L=h.get(E);return L!==void 0?++L.usedTimes:(L=new Yg(n,E,_,s),l.push(L),h.set(E,L)),L}function y(_){if(--_.usedTimes===0){const E=l.indexOf(_);l[E]=l[l.length-1],l.pop(),h.delete(_.cacheKey),_.destroy()}}function w(_){o.remove(_)}function T(){o.dispose()}return{getParameters:g,getProgramCacheKey:M,getUniforms:v,acquireProgram:b,releaseProgram:y,releaseShaderCache:w,programs:l,dispose:T}}function jg(){let n=new WeakMap;function t(a){return n.has(a)}function e(a){let o=n.get(a);return o===void 0&&(o={},n.set(a,o)),o}function i(a){n.delete(a)}function s(a,o,c){n.get(a)[o]=c}function r(){n=new WeakMap}return{has:t,get:e,remove:i,update:s,dispose:r}}function t_(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.material.id!==t.material.id?n.material.id-t.material.id:n.materialVariant!==t.materialVariant?n.materialVariant-t.materialVariant:n.z!==t.z?n.z-t.z:n.id-t.id}function Kc(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.z!==t.z?t.z-n.z:n.id-t.id}function Zc(){const n=[];let t=0;const e=[],i=[],s=[];function r(){t=0,e.length=0,i.length=0,s.length=0}function a(p){let m=0;return p.isInstancedMesh&&(m+=2),p.isSkinnedMesh&&(m+=1),m}function o(p,m,g,M,d,u){let v=n[t];return v===void 0?(v={id:p.id,object:p,geometry:m,material:g,materialVariant:a(p),groupOrder:M,renderOrder:p.renderOrder,z:d,group:u},n[t]=v):(v.id=p.id,v.object=p,v.geometry=m,v.material=g,v.materialVariant=a(p),v.groupOrder=M,v.renderOrder=p.renderOrder,v.z=d,v.group=u),t++,v}function c(p,m,g,M,d,u,v){v.reversedDepth===!0&&(d=-d);const b=o(p,m,g,M,d,u);g.transmission>0?i.push(b):g.transparent===!0?s.push(b):e.push(b)}function l(p,m,g,M,d,u){const v=o(p,m,g,M,d,u);g.transmission>0?i.unshift(v):g.transparent===!0?s.unshift(v):e.unshift(v)}function h(p,m){e.length>1&&e.sort(p||t_),i.length>1&&i.sort(m||Kc),s.length>1&&s.sort(m||Kc)}function f(){for(let p=t,m=n.length;p<m;p++){const g=n[p];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:e,transmissive:i,transparent:s,init:r,push:c,unshift:l,finish:f,sort:h}}function e_(){let n=new WeakMap;function t(i,s){const r=n.get(i);let a;return r===void 0?(a=new Zc,n.set(i,[a])):s>=r.length?(a=new Zc,r.push(a)):a=r[s],a}function e(){n=new WeakMap}return{get:t,dispose:e}}function n_(){const n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new N,color:new Xt};break;case"SpotLight":e={position:new N,direction:new N,color:new Xt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new N,color:new Xt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new N,skyColor:new Xt,groundColor:new Xt};break;case"RectAreaLight":e={color:new Xt,position:new N,halfWidth:new N,halfHeight:new N};break}return n[t.id]=e,e}}}function i_(){const n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new At};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new At};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new At,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[t.id]=e,e}}}let s_=0;function r_(n,t){return(t.castShadow?2:0)-(n.castShadow?2:0)+(t.map?1:0)-(n.map?1:0)}function a_(n){const t=new n_,e=i_(),i={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)i.probe.push(new N);const s=new N,r=new ue,a=new ue;function o(l){let h=0,f=0,p=0;for(let F=0;F<9;F++)i.probe[F].set(0,0,0);let m=0,g=0,M=0,d=0,u=0,v=0,b=0,y=0,w=0,T=0,_=0,E=0,L=0,R=0;l.sort(r_);for(let F=0,z=l.length;F<z;F++){const C=l[F],H=C.color,$=C.intensity,V=C.distance;let et=null;if(C.shadow&&C.shadow.map&&(C.shadow.map.texture.format===Vi?et=C.shadow.map.texture:et=C.shadow.map.depthTexture||C.shadow.map.texture),C.isAmbientLight)h+=H.r*$,f+=H.g*$,p+=H.b*$;else if(C.isLightProbe){for(let U=0;U<9;U++)i.probe[U].addScaledVector(C.sh.coefficients[U],$);R++}else if(C.isSunLight){const U=t.get(C);if(U.color.copy(C.color).multiplyScalar(C.intensity),C.castShadow){const X=C.shadow,J=e.get(C);J.shadowIntensity=X.intensity,J.shadowBias=X.bias,J.shadowNormalBias=X.normalBias,J.shadowRadius=X.radius,J.shadowMapSize.copy(X.mapSize).multiply(X.getFrameExtents()),i.sunShadow[g]=J,i.sunShadowMap[g]=et;const dt=X.getViewportCount();for(let Tt=0;Tt<dt;Tt++)i.sunShadowMatrix[M+Tt]=X.getMatrix(Tt),i.sunShadowCascade[M+Tt]=X._cascadeData[Tt];M+=dt,g++}i.sun[m]=U,m++}else if(C.isDirectionalLight){const U=t.get(C);if(U.color.copy(C.color).multiplyScalar(C.intensity),C.castShadow){const X=C.shadow,J=e.get(C);J.shadowIntensity=X.intensity,J.shadowBias=X.bias,J.shadowNormalBias=X.normalBias,J.shadowRadius=X.radius,J.shadowMapSize=X.mapSize,i.directionalShadow[d]=J,i.directionalShadowMap[d]=et,i.directionalShadowMatrix[d]=C.shadow.matrix,w++}i.directional[d]=U,d++}else if(C.isSpotLight){const U=t.get(C);U.position.setFromMatrixPosition(C.matrixWorld),U.color.copy(H).multiplyScalar($),U.distance=V,U.coneCos=Math.cos(C.angle),U.penumbraCos=Math.cos(C.angle*(1-C.penumbra)),U.decay=C.decay,i.spot[v]=U;const X=C.shadow;if(C.map&&(i.spotLightMap[E]=C.map,E++,X.updateMatrices(C),C.castShadow&&L++),i.spotLightMatrix[v]=X.matrix,C.castShadow){const J=e.get(C);J.shadowIntensity=X.intensity,J.shadowBias=X.bias,J.shadowNormalBias=X.normalBias,J.shadowRadius=X.radius,J.shadowMapSize=X.mapSize,i.spotShadow[v]=J,i.spotShadowMap[v]=et,_++}v++}else if(C.isRectAreaLight){const U=t.get(C);U.color.copy(H).multiplyScalar($),U.halfWidth.set(C.width*.5,0,0),U.halfHeight.set(0,C.height*.5,0),i.rectArea[b]=U,b++}else if(C.isPointLight){const U=t.get(C);if(U.color.copy(C.color).multiplyScalar(C.intensity),U.distance=C.distance,U.decay=C.decay,C.castShadow){const X=C.shadow,J=e.get(C);J.shadowIntensity=X.intensity,J.shadowBias=X.bias,J.shadowNormalBias=X.normalBias,J.shadowRadius=X.radius,J.shadowMapSize=X.mapSize,J.shadowCameraNear=X.camera.near,J.shadowCameraFar=X.camera.far,i.pointShadow[u]=J,i.pointShadowMap[u]=et,i.pointShadowMatrix[u]=C.shadow.matrix,T++}i.point[u]=U,u++}else if(C.isHemisphereLight){const U=t.get(C);U.skyColor.copy(C.color).multiplyScalar($),U.groundColor.copy(C.groundColor).multiplyScalar($),i.hemi[y]=U,y++}}b>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=mt.LTC_FLOAT_1,i.rectAreaLTC2=mt.LTC_FLOAT_2):(i.rectAreaLTC1=mt.LTC_HALF_1,i.rectAreaLTC2=mt.LTC_HALF_2)),i.ambient[0]=h,i.ambient[1]=f,i.ambient[2]=p;const I=i.hash;(I.sunLength!==m||I.directionalLength!==d||I.pointLength!==u||I.spotLength!==v||I.rectAreaLength!==b||I.hemiLength!==y||I.numSunShadows!==g||I.numDirectionalShadows!==w||I.numPointShadows!==T||I.numSpotShadows!==_||I.numSpotMaps!==E||I.numLightProbes!==R)&&(i.sun.length=m,i.directional.length=d,i.spot.length=v,i.rectArea.length=b,i.point.length=u,i.hemi.length=y,i.sunShadow.length=g,i.sunShadowMap.length=g,i.sunShadowMatrix.length=M,i.sunShadowCascade.length=M,i.directionalShadow.length=w,i.directionalShadowMap.length=w,i.directionalShadowMatrix.length=w,i.pointShadow.length=T,i.pointShadowMap.length=T,i.pointShadowMatrix.length=T,i.spotShadow.length=_,i.spotShadowMap.length=_,i.spotLightMatrix.length=_+E-L,i.spotLightMap.length=E,i.numSpotLightShadowsWithMaps=L,i.numLightProbes=R,I.sunLength=m,I.directionalLength=d,I.pointLength=u,I.spotLength=v,I.rectAreaLength=b,I.hemiLength=y,I.numSunShadows=g,I.numDirectionalShadows=w,I.numPointShadows=T,I.numSpotShadows=_,I.numSpotMaps=E,I.numLightProbes=R,i.version=s_++)}function c(l,h){let f=0,p=0,m=0,g=0,M=0,d=0;const u=h.matrixWorldInverse;for(let v=0,b=l.length;v<b;v++){const y=l[v];if(y.isSunLight){const w=i.sun[f];w.direction.setFromMatrixPosition(y.matrixWorld),w.direction.transformDirection(u),f++}else if(y.isDirectionalLight){const w=i.directional[p];w.direction.setFromMatrixPosition(y.matrixWorld),s.setFromMatrixPosition(y.target.matrixWorld),w.direction.sub(s),w.direction.transformDirection(u),p++}else if(y.isSpotLight){const w=i.spot[g];w.position.setFromMatrixPosition(y.matrixWorld),w.position.applyMatrix4(u),w.direction.setFromMatrixPosition(y.matrixWorld),s.setFromMatrixPosition(y.target.matrixWorld),w.direction.sub(s),w.direction.transformDirection(u),g++}else if(y.isRectAreaLight){const w=i.rectArea[M];w.position.setFromMatrixPosition(y.matrixWorld),w.position.applyMatrix4(u),a.identity(),r.copy(y.matrixWorld),r.premultiply(u),a.extractRotation(r),w.halfWidth.set(y.width*.5,0,0),w.halfHeight.set(0,y.height*.5,0),w.halfWidth.applyMatrix4(a),w.halfHeight.applyMatrix4(a),M++}else if(y.isPointLight){const w=i.point[m];w.position.setFromMatrixPosition(y.matrixWorld),w.position.applyMatrix4(u),m++}else if(y.isHemisphereLight){const w=i.hemi[d];w.direction.setFromMatrixPosition(y.matrixWorld),w.direction.transformDirection(u),d++}}}return{setup:o,setupView:c,state:i}}function Jc(n){const t=new a_(n),e=[],i=[],s=[];function r(f){h.camera=f,e.length=0,i.length=0,s.length=0}function a(f){f.isLightProbeGrid?s.push(f):e.push(f)}function o(f){i.push(f)}function c(){t.setup(e),s.sort((f,p)=>f.priority-p.priority||f.id-p.id)}function l(f){t.setupView(e,f)}const h={lightsArray:e,shadowsArray:i,lightProbeGridArray:s,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:h,setupLights:c,setupLightsView:l,pushLight:a,pushShadow:o}}function o_(n){let t=new WeakMap;function e(s,r=0){const a=t.get(s);let o;return a===void 0?(o=new Jc(n),t.set(s,[o])):r>=a.length?(o=new Jc(n),a.push(o)):o=a[r],o}function i(){t=new WeakMap}return{get:e,dispose:i}}const l_=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,c_=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,h_=[new N(1,0,0),new N(-1,0,0),new N(0,1,0),new N(0,-1,0),new N(0,0,1),new N(0,0,-1)],u_=[new N(0,-1,0),new N(0,-1,0),new N(0,0,1),new N(0,0,-1),new N(0,-1,0),new N(0,-1,0)],Qc=new ue,Bs=new N,Qa=new N;function d_(n,t,e){let i=new ar;const s=new At,r=new At,a=new _e,o=new Sf,c=new yf,l={},h=e.maxTextureSize,f={[Hi]:sn,[sn]:Hi,[jn]:jn},p=new Xi({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new At},radius:{value:4}},vertexShader:l_,fragmentShader:c_}),m=p.clone();m.defines.HORIZONTAL_PASS=1;const g=new ve;g.setAttribute("position",new Mi(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const M=new Oe(g,p),d=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=xs;let u=this.type;this.render=function(T,_,E){if(d.enabled===!1||d.autoUpdate===!1&&d.needsUpdate===!1||T.length===0)return;this.type===qu&&(Nt("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=xs);const L=n.getRenderTarget(),R=n.getActiveCubeFace(),I=n.getActiveMipmapLevel(),F=n.state;F.setBlending(vs),F.buffers.depth.getReversed()===!0?F.buffers.color.setClear(0,0,0,0):F.buffers.color.setClear(1,1,1,1),F.buffers.depth.setTest(!0),F.setScissorTest(!1);const z=u!==this.type;z&&_.traverse(function(C){C.material&&(Array.isArray(C.material)?C.material.forEach(H=>H.needsUpdate=!0):C.material.needsUpdate=!0)});for(let C=0,H=T.length;C<H;C++){const $=T[C],V=$.shadow;if(V===void 0){Nt("WebGLShadowMap:",$,"has no shadow.");continue}if(V.autoUpdate===!1&&V.needsUpdate===!1)continue;s.copy(V.mapSize);const et=V.getFrameExtents();s.multiply(et),r.copy(V.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/et.x),s.x=r.x*et.x,V.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/et.y),s.y=r.y*et.y,V.mapSize.y=r.y));const U=n.state.buffers.depth.getReversed();if(V.camera._reversedDepth=U,V.map===null||z===!0){if(V.map!==null&&(V.map.depthTexture!==null&&(V.map.depthTexture.dispose(),V.map.depthTexture=null),V.map.dispose()),this.type===Vs){if($.isPointLight){Nt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}V.map=new Gn(s.x,s.y,{format:Vi,type:Wn,minFilter:en,magFilter:en,generateMipmaps:!1}),V.map.texture.name=$.name+".shadowMap",V.map.depthTexture=new bs(s.x,s.y,kn),V.map.depthTexture.name=$.name+".shadowMapDepth",V.map.depthTexture.format=Si,V.map.depthTexture.compareFunction=null,V.map.depthTexture.minFilter=ze,V.map.depthTexture.magFilter=ze}else $.isPointLight?(V.map=new Al(s.x),V.map.depthTexture=new eu(s.x,Vn)):(V.map=new Gn(s.x,s.y),V.map.depthTexture=new bs(s.x,s.y,Vn)),V.map.depthTexture.name=$.name+".shadowMap",V.map.depthTexture.format=Si,this.type===xs?(V.map.depthTexture.compareFunction=U?Hh:Gh,V.map.depthTexture.minFilter=en,V.map.depthTexture.magFilter=en):(V.map.depthTexture.compareFunction=null,V.map.depthTexture.minFilter=ze,V.map.depthTexture.magFilter=ze);V.camera.updateProjectionMatrix()}V.map.isWebGLCubeRenderTarget!==!0&&(V.map.width!==s.x||V.map.height!==s.y)&&V.map.setSize(s.x,s.y);const X=V.map.isWebGLCubeRenderTarget?6:V.getViewportCount();$.isPointLight!==!0&&V.updateMatrices($,E);const J=V.camera.layers.mask&4294967294?V.camera.layers:E.layers;for(let dt=0;dt<X;dt++){const Tt=V.getCamera(dt);if($.isPointLight){const K=V.camera,gt=V.matrix,Mt=$.distance||K.far;Mt!==K.far&&(K.far=Mt,K.updateProjectionMatrix()),Bs.setFromMatrixPosition($.matrixWorld),K.position.copy(Bs),Qa.copy(K.position),Qa.add(h_[dt]),K.up.copy(u_[dt]),K.lookAt(Qa),K.updateMatrixWorld(),gt.makeTranslation(-Bs.x,-Bs.y,-Bs.z),Qc.multiplyMatrices(K.projectionMatrix,K.matrixWorldInverse),V._frustum.setFromProjectionMatrix(Qc,K.coordinateSystem,K.reversedDepth)}if(V.map.isWebGLCubeRenderTarget)n.setRenderTarget(V.map,dt),n.clear();else{dt===0&&(n.setRenderTarget(V.map),n.clear());const K=V.getViewport(dt);a.set(r.x*K.x,r.y*K.y,r.x*K.z,r.y*K.w),F.viewport(a)}i=V.getFrustum(dt),y(_,E,Tt,$,J,this.type)}V.isPointLightShadow!==!0&&this.type===Vs&&v(V,E),V.needsUpdate=!1}u=this.type,d.needsUpdate=!1,n.setRenderTarget(L,R,I)};function v(T,_){const E=t.update(M);p.defines.VSM_SAMPLES!==T.blurSamples&&(p.defines.VSM_SAMPLES=T.blurSamples,m.defines.VSM_SAMPLES=T.blurSamples,p.needsUpdate=!0,m.needsUpdate=!0),T.mapPass===null?T.mapPass=new Gn(s.x,s.y,{format:Vi,type:Wn}):(T.mapPass.width!==T.map.width||T.mapPass.height!==T.map.height)&&T.mapPass.setSize(T.map.width,T.map.height),p.uniforms.shadow_pass.value=T.map.depthTexture,p.uniforms.resolution.value.set(T.map.width,T.map.height),p.uniforms.radius.value=T.radius,n.setRenderTarget(T.mapPass),n.clear(),n.renderBufferDirect(_,null,E,p,M,null),m.uniforms.shadow_pass.value=T.mapPass.texture,m.uniforms.resolution.value.set(T.map.width,T.map.height),m.uniforms.radius.value=T.radius,n.setRenderTarget(T.map),n.clear(),n.renderBufferDirect(_,null,E,m,M,null)}function b(T,_,E,L){let R=null;const I=E.isPointLight===!0?T.customDistanceMaterial:T.customDepthMaterial;if(I!==void 0)R=I;else if(R=E.isPointLight===!0?c:o,n.localClippingEnabled&&_.clipShadows===!0&&Array.isArray(_.clippingPlanes)&&_.clippingPlanes.length!==0||_.displacementMap&&_.displacementScale!==0||_.alphaMap&&_.alphaTest>0||_.map&&_.alphaTest>0||_.alphaToCoverage===!0){const F=R.uuid,z=_.uuid;let C=l[F];C===void 0&&(C={},l[F]=C);let H=C[z];H===void 0&&(H=R.clone(),C[z]=H,_.addEventListener("dispose",w)),R=H}if(R.visible=_.visible,R.wireframe=_.wireframe,L===Vs?R.side=_.shadowSide!==null?_.shadowSide:_.side:R.side=_.shadowSide!==null?_.shadowSide:f[_.side],R.alphaMap=_.alphaMap,R.alphaTest=_.alphaToCoverage===!0?.5:_.alphaTest,R.map=_.map,R.clipShadows=_.clipShadows,R.clippingPlanes=_.clippingPlanes,R.clipIntersection=_.clipIntersection,R.displacementMap=_.displacementMap,R.displacementScale=_.displacementScale,R.displacementBias=_.displacementBias,R.wireframeLinewidth=_.wireframeLinewidth,R.linewidth=_.linewidth,E.isPointLight===!0&&R.isMeshDistanceMaterial===!0){const F=n.properties.get(R);F.light=E}return R}function y(T,_,E,L,R,I){if(T.visible===!1)return;if(T.layers.test(R)&&(T.isMesh||T.isLine||T.isPoints)&&(T.castShadow||T.receiveShadow&&I===Vs)&&(!T.frustumCulled||T.intersectsFrustum(i))){T.modelViewMatrix.multiplyMatrices(E.matrixWorldInverse,T.matrixWorld);const C=t.update(T),H=T.material;if(Array.isArray(H)){const $=C.groups;for(let V=0,et=$.length;V<et;V++){const U=$[V],X=H[U.materialIndex];if(X&&X.visible){const J=b(T,X,L,I);T.onBeforeShadow(n,T,_,E,C,J,U),n.renderBufferDirect(E,null,C,J,T,U),T.onAfterShadow(n,T,_,E,C,J,U)}}}else if(H.visible){const $=b(T,H,L,I);T.onBeforeShadow(n,T,_,E,C,$,null),n.renderBufferDirect(E,null,C,$,T,null),T.onAfterShadow(n,T,_,E,C,$,null)}}const z=T.children;for(let C=0,H=z.length;C<H;C++)y(z[C],_,E,L,R,I)}function w(T){T.target.removeEventListener("dispose",w);for(const E in l){const L=l[E],R=T.target.uuid;R in L&&(L[R].dispose(),delete L[R])}}}function f_(n,t){function e(){let P=!1;const Q=new _e;let Y=null;const lt=new _e(0,0,0,0);return{setMask:function(st){Y!==st&&!P&&(n.colorMask(st,st,st,st),Y=st)},setLocked:function(st){P=st},setClear:function(st,at,bt,Vt,it){it===!0&&(st*=Vt,at*=Vt,bt*=Vt),Q.set(st,at,bt,Vt),lt.equals(Q)===!1&&(n.clearColor(st,at,bt,Vt),lt.copy(Q))},reset:function(){P=!1,Y=null,lt.set(-1,0,0,0)}}}function i(){let P=!1,Q=!1,Y=null,lt=null,st=null;return{setReversed:function(at){if(Q!==at){const bt=t.get("EXT_clip_control");at?bt.clipControlEXT(bt.LOWER_LEFT_EXT,bt.ZERO_TO_ONE_EXT):bt.clipControlEXT(bt.LOWER_LEFT_EXT,bt.NEGATIVE_ONE_TO_ONE_EXT),Q=at;const Vt=st;st=null,this.setClear(Vt)}},getReversed:function(){return Q},setTest:function(at){at?_t(n.DEPTH_TEST):kt(n.DEPTH_TEST)},setMask:function(at){Y!==at&&!P&&(n.depthMask(at),Y=at)},setFunc:function(at){if(Q&&(at=Ad[at]),lt!==at){switch(at){case lo:n.depthFunc(n.NEVER);break;case co:n.depthFunc(n.ALWAYS);break;case ho:n.depthFunc(n.LESS);break;case tr:n.depthFunc(n.LEQUAL);break;case uo:n.depthFunc(n.EQUAL);break;case fo:n.depthFunc(n.GEQUAL);break;case po:n.depthFunc(n.GREATER);break;case mo:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}lt=at}},setLocked:function(at){P=at},setClear:function(at){st!==at&&(st=at,Q&&(at=1-at),n.clearDepth(at))},reset:function(){P=!1,Y=null,lt=null,st=null,Q=!1}}}function s(){let P=!1,Q=null,Y=null,lt=null,st=null,at=null,bt=null,Vt=null,it=null;return{setTest:function(Rt){P||(Rt?_t(n.STENCIL_TEST):kt(n.STENCIL_TEST))},setMask:function(Rt){Q!==Rt&&!P&&(n.stencilMask(Rt),Q=Rt)},setFunc:function(Rt,Ht,pt){(Y!==Rt||lt!==Ht||st!==pt)&&(n.stencilFunc(Rt,Ht,pt),Y=Rt,lt=Ht,st=pt)},setOp:function(Rt,Ht,pt){(at!==Rt||bt!==Ht||Vt!==pt)&&(n.stencilOp(Rt,Ht,pt),at=Rt,bt=Ht,Vt=pt)},setLocked:function(Rt){P=Rt},setClear:function(Rt){it!==Rt&&(n.clearStencil(Rt),it=Rt)},reset:function(){P=!1,Q=null,Y=null,lt=null,st=null,at=null,bt=null,Vt=null,it=null}}}const r=new e,a=new i,o=new s;let c={};const l=new WeakMap;let h={},f={},p={},m=new WeakMap,g=[],M=null,d=!1,u=null,v=null,b=null,y=null,w=null,T=null,_=null,E=new Xt(0,0,0),L=0,R=!1,I=null,F=null,z=null,C=null,H=null;const $=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let V=!1,et=0;const U=n.getParameter(n.VERSION);U.indexOf("WebGL")!==-1?(et=parseFloat(/^WebGL (\d)/.exec(U)[1]),V=et>=1):U.indexOf("OpenGL ES")!==-1&&(et=parseFloat(/^OpenGL ES (\d)/.exec(U)[1]),V=et>=2);let X=null,J={};const dt=n.getParameter(n.SCISSOR_BOX),Tt=n.getParameter(n.VIEWPORT),K=new _e().fromArray(dt),gt=new _e().fromArray(Tt);function Mt(P,Q,Y,lt){const st=new Uint8Array(4),at=n.createTexture();n.bindTexture(P,at),n.texParameteri(P,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(P,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let bt=0;bt<Y;bt++)P===n.TEXTURE_3D||P===n.TEXTURE_2D_ARRAY?n.texImage3D(Q,0,n.RGBA,1,1,lt,0,n.RGBA,n.UNSIGNED_BYTE,st):n.texImage2D(Q+bt,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,st);return at}const Ct={};Ct[n.TEXTURE_2D]=Mt(n.TEXTURE_2D,n.TEXTURE_2D,1),Ct[n.TEXTURE_CUBE_MAP]=Mt(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),Ct[n.TEXTURE_2D_ARRAY]=Mt(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),Ct[n.TEXTURE_3D]=Mt(n.TEXTURE_3D,n.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),_t(n.DEPTH_TEST),a.setFunc(tr),Qe(!1),me(ql),_t(n.CULL_FACE),Ue(vs);function _t(P){h[P]!==!0&&(n.enable(P),h[P]=!0)}function kt(P){h[P]!==!1&&(n.disable(P),h[P]=!1)}function Me(P,Q){return p[P]!==Q?(n.bindFramebuffer(P,Q),p[P]=Q,P===n.DRAW_FRAMEBUFFER&&(p[n.FRAMEBUFFER]=Q),P===n.FRAMEBUFFER&&(p[n.DRAW_FRAMEBUFFER]=Q),!0):!1}function It(P,Q){let Y=g,lt=!1;if(P){Y=m.get(Q),Y===void 0&&(Y=[],m.set(Q,Y));const st=P.textures;if(Y.length!==st.length||Y[0]!==n.COLOR_ATTACHMENT0){for(let at=0,bt=st.length;at<bt;at++)Y[at]=n.COLOR_ATTACHMENT0+at;Y.length=st.length,lt=!0}}else Y[0]!==n.BACK&&(Y[0]=n.BACK,lt=!0);lt&&n.drawBuffers(Y)}function ne(P){return M!==P?(n.useProgram(P),M=P,!0):!1}const oe={[fs]:n.FUNC_ADD,[Zu]:n.FUNC_SUBTRACT,[Ju]:n.FUNC_REVERSE_SUBTRACT};oe[Qu]=n.MIN,oe[ju]=n.MAX;const qt={[td]:n.ZERO,[ed]:n.ONE,[nd]:n.SRC_COLOR,[Eh]:n.SRC_ALPHA,[ld]:n.SRC_ALPHA_SATURATE,[ad]:n.DST_COLOR,[sd]:n.DST_ALPHA,[id]:n.ONE_MINUS_SRC_COLOR,[bh]:n.ONE_MINUS_SRC_ALPHA,[od]:n.ONE_MINUS_DST_COLOR,[rd]:n.ONE_MINUS_DST_ALPHA,[cd]:n.CONSTANT_COLOR,[hd]:n.ONE_MINUS_CONSTANT_COLOR,[ud]:n.CONSTANT_ALPHA,[dd]:n.ONE_MINUS_CONSTANT_ALPHA};function Ue(P,Q,Y,lt,st,at,bt,Vt,it,Rt){if(P===vs){d===!0&&(kt(n.BLEND),d=!1);return}if(d===!1&&(_t(n.BLEND),d=!0),P!==Ku){if(P!==u||Rt!==R){if((v!==fs||w!==fs)&&(n.blendEquation(n.FUNC_ADD),v=fs,w=fs),Rt)switch(P){case Ys:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Kl:n.blendFunc(n.ONE,n.ONE);break;case Zl:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case Jl:n.blendFuncSeparate(n.DST_COLOR,n.ONE_MINUS_SRC_ALPHA,n.ZERO,n.ONE);break;default:jt("WebGLState: Invalid blending: ",P);break}else switch(P){case Ys:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Kl:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE);break;case Zl:jt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Jl:jt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:jt("WebGLState: Invalid blending: ",P);break}b=null,y=null,T=null,_=null,E.set(0,0,0),L=0,u=P,R=Rt}return}st=st||Q,at=at||Y,bt=bt||lt,(Q!==v||st!==w)&&(n.blendEquationSeparate(oe[Q],oe[st]),v=Q,w=st),(Y!==b||lt!==y||at!==T||bt!==_)&&(n.blendFuncSeparate(qt[Y],qt[lt],qt[at],qt[bt]),b=Y,y=lt,T=at,_=bt),(Vt.equals(E)===!1||it!==L)&&(n.blendColor(Vt.r,Vt.g,Vt.b,it),E.copy(Vt),L=it),u=P,R=!1}function Ee(P,Q){P.side===jn?kt(n.CULL_FACE):_t(n.CULL_FACE);let Y=P.side===sn;Q&&(Y=!Y),Qe(Y),P.blending===Ys&&P.transparent===!1?Ue(vs):Ue(P.blending,P.blendEquation,P.blendSrc,P.blendDst,P.blendEquationAlpha,P.blendSrcAlpha,P.blendDstAlpha,P.blendColor,P.blendAlpha,P.premultipliedAlpha),a.setFunc(P.depthFunc),a.setTest(P.depthTest),a.setMask(P.depthWrite),r.setMask(P.colorWrite);const lt=P.stencilWrite;o.setTest(lt),lt&&(o.setMask(P.stencilWriteMask),o.setFunc(P.stencilFunc,P.stencilRef,P.stencilFuncMask),o.setOp(P.stencilFail,P.stencilZFail,P.stencilZPass)),Pe(P.polygonOffset,P.polygonOffsetFactor,P.polygonOffsetUnits),P.alphaToCoverage===!0?_t(n.SAMPLE_ALPHA_TO_COVERAGE):kt(n.SAMPLE_ALPHA_TO_COVERAGE)}function Qe(P){I!==P&&(P?n.frontFace(n.CW):n.frontFace(n.CCW),I=P)}function me(P){P!==$u?(_t(n.CULL_FACE),P!==F&&(P===ql?n.cullFace(n.BACK):P===Yu?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):kt(n.CULL_FACE),F=P}function Pn(P){P!==z&&(V&&n.lineWidth(P),z=P)}function Pe(P,Q,Y){P?(_t(n.POLYGON_OFFSET_FILL),(C!==Q||H!==Y)&&(C=Q,H=Y,a.getReversed()&&(Q=-Q,Y=-Y),n.polygonOffset(Q,Y))):kt(n.POLYGON_OFFSET_FILL)}function fn(P){P?_t(n.SCISSOR_TEST):kt(n.SCISSOR_TEST)}function pn(P){P===void 0&&(P=n.TEXTURE0+$-1),X!==P&&(n.activeTexture(P),X=P)}function mn(P,Q,Y){Y===void 0&&(X===null?Y=n.TEXTURE0+$-1:Y=X);let lt=J[Y];lt===void 0&&(lt={type:void 0,texture:void 0},J[Y]=lt),(lt.type!==P||lt.texture!==Q)&&(X!==Y&&(n.activeTexture(Y),X=Y),n.bindTexture(P,Q||Ct[P]),lt.type=P,lt.texture=Q)}function O(){const P=J[X];P!==void 0&&P.type!==void 0&&(n.bindTexture(P.type,null),P.type=void 0,P.texture=void 0)}function gn(){try{n.compressedTexImage2D(...arguments)}catch(P){jt("WebGLState:",P)}}function de(){try{n.compressedTexImage3D(...arguments)}catch(P){jt("WebGLState:",P)}}function fe(){try{n.texSubImage2D(...arguments)}catch(P){jt("WebGLState:",P)}}function ft(){try{n.texSubImage3D(...arguments)}catch(P){jt("WebGLState:",P)}}function be(){try{n.compressedTexSubImage2D(...arguments)}catch(P){jt("WebGLState:",P)}}function Pt(){try{n.compressedTexSubImage3D(...arguments)}catch(P){jt("WebGLState:",P)}}function Ft(){try{n.texStorage2D(...arguments)}catch(P){jt("WebGLState:",P)}}function A(){try{n.texStorage3D(...arguments)}catch(P){jt("WebGLState:",P)}}function x(){try{n.texImage2D(...arguments)}catch(P){jt("WebGLState:",P)}}function B(){try{n.texImage3D(...arguments)}catch(P){jt("WebGLState:",P)}}function nt(P){return f[P]!==void 0?f[P]:n.getParameter(P)}function j(P,Q){f[P]!==Q&&(n.pixelStorei(P,Q),f[P]=Q)}function rt(P){K.equals(P)===!1&&(n.scissor(P.x,P.y,P.z,P.w),K.copy(P))}function ht(P){gt.equals(P)===!1&&(n.viewport(P.x,P.y,P.z,P.w),gt.copy(P))}function q(P,Q){let Y=l.get(Q);Y===void 0&&(Y=new WeakMap,l.set(Q,Y));let lt=Y.get(P);lt===void 0&&(lt=n.getUniformBlockIndex(Q,P.name),n.uniformBlockBinding(Q,lt,lt),Y.set(P,lt))}function Z(P,Q,Y){const st=l.get(Q).get(P);c[st]!==Y&&(n.bindBufferBase(n.UNIFORM_BUFFER,st,Y),c[st]=Y)}function ot(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),a.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),n.pixelStorei(n.PACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,!1),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,n.BROWSER_DEFAULT_WEBGL),n.pixelStorei(n.PACK_ROW_LENGTH,0),n.pixelStorei(n.PACK_SKIP_PIXELS,0),n.pixelStorei(n.PACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_ROW_LENGTH,0),n.pixelStorei(n.UNPACK_IMAGE_HEIGHT,0),n.pixelStorei(n.UNPACK_SKIP_PIXELS,0),n.pixelStorei(n.UNPACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_SKIP_IMAGES,0),h={},f={},X=null,J={},p={},c={},m=new WeakMap,g=[],M=null,d=!1,u=null,v=null,b=null,y=null,w=null,T=null,_=null,E=new Xt(0,0,0),L=0,R=!1,I=null,F=null,z=null,C=null,H=null,K.set(0,0,n.canvas.width,n.canvas.height),gt.set(0,0,n.canvas.width,n.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:_t,disable:kt,bindFramebuffer:Me,drawBuffers:It,useProgram:ne,setBlending:Ue,setMaterial:Ee,setFlipSided:Qe,setCullFace:me,setLineWidth:Pn,setPolygonOffset:Pe,setScissorTest:fn,activeTexture:pn,bindTexture:mn,unbindTexture:O,compressedTexImage2D:gn,compressedTexImage3D:de,texImage2D:x,texImage3D:B,pixelStorei:j,getParameter:nt,updateUBOMapping:q,uniformBlockBinding:Z,texStorage2D:Ft,texStorage3D:A,texSubImage2D:fe,texSubImage3D:ft,compressedTexSubImage2D:be,compressedTexSubImage3D:Pt,scissor:rt,viewport:ht,reset:ot}}function p_(n,t,e,i,s,r,a){const o=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new At,h=new WeakMap,f=new Set;let p;const m=new WeakMap,g=new Set,M=new FinalizationRegistry(A=>g.delete(A));let d=!1;try{d=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function u(A,x){return d?new OffscreenCanvas(A,x):ea("canvas")}function v(A,x,B){let nt=1;const j=Ft(A);if((j.width>B||j.height>B)&&(nt=B/Math.max(j.width,j.height)),nt<1)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap||typeof VideoFrame<"u"&&A instanceof VideoFrame){const rt=Math.floor(nt*j.width),ht=Math.floor(nt*j.height);p===void 0&&(p=u(rt,ht));const q=x?u(rt,ht):p;return q.width=rt,q.height=ht,q.getContext("2d").drawImage(A,0,0,rt,ht),Nt("WebGLRenderer: Texture has been resized from ("+j.width+"x"+j.height+") to ("+rt+"x"+ht+")."),q}else return"data"in A&&Nt("WebGLRenderer: Image in DataTexture is too big ("+j.width+"x"+j.height+")."),A;return A}function b(A){return A.generateMipmaps}function y(A){n.generateMipmap(A)}function w(A){return A.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:A.isWebGL3DRenderTarget?n.TEXTURE_3D:A.isWebGLArrayRenderTarget||A.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function T(A,x,B,nt,j,rt=!1){if(A!==null){if(n[A]!==void 0)return n[A];Nt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let ht;nt&&(ht=t.get("EXT_texture_norm16"),ht||Nt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let q=x;if(x===n.RED&&(B===n.FLOAT&&(q=n.R32F),B===n.HALF_FLOAT&&(q=n.R16F),B===n.UNSIGNED_BYTE&&(q=n.R8),B===n.UNSIGNED_SHORT&&ht&&(q=ht.R16_EXT),B===n.SHORT&&ht&&(q=ht.R16_SNORM_EXT)),x===n.RED_INTEGER&&(B===n.UNSIGNED_BYTE&&(q=n.R8UI),B===n.UNSIGNED_SHORT&&(q=n.R16UI),B===n.UNSIGNED_INT&&(q=n.R32UI),B===n.BYTE&&(q=n.R8I),B===n.SHORT&&(q=n.R16I),B===n.INT&&(q=n.R32I)),x===n.RG&&(B===n.FLOAT&&(q=n.RG32F),B===n.HALF_FLOAT&&(q=n.RG16F),B===n.UNSIGNED_BYTE&&(q=n.RG8),B===n.UNSIGNED_SHORT&&ht&&(q=ht.RG16_EXT),B===n.SHORT&&ht&&(q=ht.RG16_SNORM_EXT)),x===n.RG_INTEGER&&(B===n.UNSIGNED_BYTE&&(q=n.RG8UI),B===n.UNSIGNED_SHORT&&(q=n.RG16UI),B===n.UNSIGNED_INT&&(q=n.RG32UI),B===n.BYTE&&(q=n.RG8I),B===n.SHORT&&(q=n.RG16I),B===n.INT&&(q=n.RG32I)),x===n.RGB_INTEGER&&(B===n.UNSIGNED_BYTE&&(q=n.RGB8UI),B===n.UNSIGNED_SHORT&&(q=n.RGB16UI),B===n.UNSIGNED_INT&&(q=n.RGB32UI),B===n.BYTE&&(q=n.RGB8I),B===n.SHORT&&(q=n.RGB16I),B===n.INT&&(q=n.RGB32I)),x===n.RGBA_INTEGER&&(B===n.UNSIGNED_BYTE&&(q=n.RGBA8UI),B===n.UNSIGNED_SHORT&&(q=n.RGBA16UI),B===n.UNSIGNED_INT&&(q=n.RGBA32UI),B===n.BYTE&&(q=n.RGBA8I),B===n.SHORT&&(q=n.RGBA16I),B===n.INT&&(q=n.RGBA32I)),x===n.RGB&&(B===n.UNSIGNED_SHORT&&ht&&(q=ht.RGB16_EXT),B===n.SHORT&&ht&&(q=ht.RGB16_SNORM_EXT),B===n.UNSIGNED_INT_5_9_9_9_REV&&(q=n.RGB9_E5),B===n.UNSIGNED_INT_10F_11F_11F_REV&&(q=n.R11F_G11F_B10F)),x===n.RGBA){const Z=rt?ta:Jt.getTransfer(j);B===n.FLOAT&&(q=n.RGBA32F),B===n.HALF_FLOAT&&(q=n.RGBA16F),B===n.UNSIGNED_BYTE&&(q=Z===re?n.SRGB8_ALPHA8:n.RGBA8),B===n.UNSIGNED_SHORT&&ht&&(q=ht.RGBA16_EXT),B===n.SHORT&&ht&&(q=ht.RGBA16_SNORM_EXT),B===n.UNSIGNED_SHORT_4_4_4_4&&(q=n.RGBA4),B===n.UNSIGNED_SHORT_5_5_5_1&&(q=n.RGB5_A1)}return(q===n.R16F||q===n.R32F||q===n.RG16F||q===n.RG32F||q===n.RGBA16F||q===n.RGBA32F)&&t.get("EXT_color_buffer_float"),q}function _(A,x){let B;return A?x===null||x===Vn||x===Es?B=n.DEPTH24_STENCIL8:x===kn?B=n.DEPTH32F_STENCIL8:x===nr&&(B=n.DEPTH24_STENCIL8,Nt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):x===null||x===Vn||x===Es?B=n.DEPTH_COMPONENT24:x===kn?B=n.DEPTH_COMPONENT32F:x===nr&&(B=n.DEPTH_COMPONENT16),B}function E(A,x){return b(A)===!0||A.isFramebufferTexture&&A.minFilter!==ze&&A.minFilter!==en?Math.log2(Math.max(x.width,x.height))+1:A.mipmaps.length>0?A.mipmaps.length:A.isCompressedTexture&&Array.isArray(A.image)?x.mipmaps.length:1}function L(A){const x=new WeakRef(A);i.get(A).__ref=x,g.add(x),M.register(A,x,x)}function R(A){const x=i.get(A).__ref;x!==void 0&&(g.delete(x),M.unregister(x))}function I(A){z(A.target)}function F(A){C(A.target)}function z(A){A.removeEventListener("dispose",I),R(A),$(A),A.isVideoTexture&&h.delete(A),A.isHTMLTexture&&f.delete(A)}function C(A){A.removeEventListener("dispose",F),R(A),et(A)}function H(){for(const A of g){const x=A.deref();x!==void 0&&(x.isRenderTarget===!0?C(x):z(x))}g.clear(),f.clear()}function $(A){const x=i.get(A);if(x.__webglInit===void 0)return;const B=A.source,nt=m.get(B);if(nt){const j=nt[x.__cacheKey];j.usedTimes--,j.usedTimes===0&&V(A),Object.keys(nt).length===0&&m.delete(B)}i.remove(A)}function V(A){const x=i.get(A);n.deleteTexture(x.__webglTexture);const B=A.source,nt=m.get(B);delete nt[x.__cacheKey],a.memory.textures--}function et(A){const x=i.get(A);x.__depthDisposeCallback&&x.__depthDisposeCallback();const B=A.depthTexture;if(B&&B.renderTarget===A&&z(B),A.isWebGLCubeRenderTarget)for(let j=0;j<6;j++){if(Array.isArray(x.__webglFramebuffer[j]))for(let rt=0;rt<x.__webglFramebuffer[j].length;rt++)n.deleteFramebuffer(x.__webglFramebuffer[j][rt]);else n.deleteFramebuffer(x.__webglFramebuffer[j]);x.__webglDepthbuffer&&n.deleteRenderbuffer(x.__webglDepthbuffer[j])}else{if(Array.isArray(x.__webglFramebuffer))for(let j=0;j<x.__webglFramebuffer.length;j++)n.deleteFramebuffer(x.__webglFramebuffer[j]);else n.deleteFramebuffer(x.__webglFramebuffer);if(x.__webglDepthbuffer&&n.deleteRenderbuffer(x.__webglDepthbuffer),x.__webglMultisampledFramebuffer&&n.deleteFramebuffer(x.__webglMultisampledFramebuffer),x.__webglColorRenderbuffer)for(let j=0;j<x.__webglColorRenderbuffer.length;j++)x.__webglColorRenderbuffer[j]&&n.deleteRenderbuffer(x.__webglColorRenderbuffer[j]);x.__webglDepthRenderbuffer&&n.deleteRenderbuffer(x.__webglDepthRenderbuffer)}const nt=A.textures;for(let j=0,rt=nt.length;j<rt;j++){const ht=i.get(nt[j]);ht.__webglTexture&&(n.deleteTexture(ht.__webglTexture),a.memory.textures--),i.remove(nt[j])}i.remove(A)}let U=0;function X(){U=0}function J(){return U}function dt(A){U=A}function Tt(){const A=U;return A>=s.maxTextures&&Nt("WebGLTextures: Trying to use "+(A+1)+" texture units while this GPU supports only "+s.maxTextures),U+=1,A}function K(A){const x=[];return x.push(A.wrapS),x.push(A.wrapT),x.push(A.wrapR||0),x.push(A.magFilter),x.push(A.minFilter),x.push(A.anisotropy),x.push(A.internalFormat),x.push(A.format),x.push(A.type),x.push(A.generateMipmaps),x.push(A.mipmapsAutoUpdate),x.push(A.premultiplyAlpha),x.push(A.flipY),x.push(A.unpackAlignment),x.push(A.colorSpace),x.join()}function gt(A,x){const B=i.get(A);if(A.isVideoTexture&&be(A),A.isRenderTargetTexture===!1&&A.isExternalTexture!==!0&&A.version>0&&B.__version!==A.version){const nt=A.image;if(nt===null)Nt("WebGLRenderer: Texture marked for update but no image data found.");else if(nt.complete===!1)Nt("WebGLRenderer: Texture marked for update but image is incomplete");else{Ee(B,A,x);return}}else A.isExternalTexture&&(B.__webglTexture=A.sourceTexture?A.sourceTexture:null);e.bindTexture(n.TEXTURE_2D,B.__webglTexture,n.TEXTURE0+x)}function Mt(A,x){const B=i.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&B.__version!==A.version){Ee(B,A,x);return}else A.isExternalTexture&&(B.__webglTexture=A.sourceTexture?A.sourceTexture:null);e.bindTexture(n.TEXTURE_2D_ARRAY,B.__webglTexture,n.TEXTURE0+x)}function Ct(A,x){const B=i.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&B.__version!==A.version){Ee(B,A,x);return}e.bindTexture(n.TEXTURE_3D,B.__webglTexture,n.TEXTURE0+x)}function _t(A,x){const B=i.get(A);if(A.version>0&&B.__version!==A.version){Qe(B,A,x);return}e.bindTexture(n.TEXTURE_CUBE_MAP,B.__webglTexture,n.TEXTURE0+x)}const kt={[go]:n.REPEAT,[ti]:n.CLAMP_TO_EDGE,[_o]:n.MIRRORED_REPEAT},Me={[ze]:n.NEAREST,[md]:n.NEAREST_MIPMAP_NEAREST,[fr]:n.NEAREST_MIPMAP_LINEAR,[en]:n.LINEAR,[wa]:n.LINEAR_MIPMAP_NEAREST,[gi]:n.LINEAR_MIPMAP_LINEAR},It={[vd]:n.NEVER,[Vh]:n.ALWAYS,[Md]:n.LESS,[Gh]:n.LEQUAL,[Sd]:n.EQUAL,[Hh]:n.GEQUAL,[yd]:n.GREATER,[Ed]:n.NOTEQUAL};function ne(A,x){if(x.type===kn&&t.has("OES_texture_float_linear")===!1&&(x.magFilter===en||x.magFilter===wa||x.magFilter===fr||x.magFilter===gi||x.minFilter===en||x.minFilter===wa||x.minFilter===fr||x.minFilter===gi)&&Nt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(A,n.TEXTURE_WRAP_S,kt[x.wrapS]),n.texParameteri(A,n.TEXTURE_WRAP_T,kt[x.wrapT]),(A===n.TEXTURE_3D||A===n.TEXTURE_2D_ARRAY)&&n.texParameteri(A,n.TEXTURE_WRAP_R,kt[x.wrapR]),n.texParameteri(A,n.TEXTURE_MAG_FILTER,Me[x.magFilter]),n.texParameteri(A,n.TEXTURE_MIN_FILTER,Me[x.minFilter]),x.compareFunction&&(n.texParameteri(A,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(A,n.TEXTURE_COMPARE_FUNC,It[x.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(x.magFilter===ze||x.minFilter!==fr&&x.minFilter!==gi||x.type===kn&&t.has("OES_texture_float_linear")===!1)return;if(x.anisotropy>1||i.get(x).__currentAnisotropy){const B=t.get("EXT_texture_filter_anisotropic");n.texParameterf(A,B.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(x.anisotropy,s.getMaxAnisotropy())),i.get(x).__currentAnisotropy=x.anisotropy}}}function oe(A,x){let B=!1;A.__webglInit===void 0&&(A.__webglInit=!0,x.addEventListener("dispose",I),L(x));const nt=x.source;let j=m.get(nt);j===void 0&&(j={},m.set(nt,j));const rt=K(x);if(rt!==A.__cacheKey){j[rt]===void 0&&(j[rt]={texture:n.createTexture(),usedTimes:0},a.memory.textures++,B=!0),j[rt].usedTimes++;const ht=j[A.__cacheKey];ht!==void 0&&(j[A.__cacheKey].usedTimes--,ht.usedTimes===0&&V(x)),A.__cacheKey=rt,A.__webglTexture=j[rt].texture}return B}function qt(A,x,B){return Math.floor(Math.floor(A/B)/x)}function Ue(A,x,B,nt){const rt=A.updateRanges;if(rt.length===0)e.texSubImage2D(n.TEXTURE_2D,0,0,0,x.width,x.height,B,nt,x.data);else{rt.sort((P,Q)=>P.start-Q.start);let ht=0;for(let P=1;P<rt.length;P++){const Q=rt[ht],Y=rt[P],lt=Q.start+Q.count,st=qt(Y.start,x.width,4),at=qt(Q.start,x.width,4);Y.start<=lt+1&&st===at&&qt(Y.start+Y.count-1,x.width,4)===st?Q.count=Math.max(Q.count,Y.start+Y.count-Q.start):(++ht,rt[ht]=Y)}rt.length=ht+1;const q=e.getParameter(n.UNPACK_ROW_LENGTH),Z=e.getParameter(n.UNPACK_SKIP_PIXELS),ot=e.getParameter(n.UNPACK_SKIP_ROWS);e.pixelStorei(n.UNPACK_ROW_LENGTH,x.width);for(let P=0,Q=rt.length;P<Q;P++){const Y=rt[P],lt=Math.floor(Y.start/4),st=Math.ceil(Y.count/4),at=lt%x.width,bt=Math.floor(lt/x.width),Vt=st,it=1;e.pixelStorei(n.UNPACK_SKIP_PIXELS,at),e.pixelStorei(n.UNPACK_SKIP_ROWS,bt),e.texSubImage2D(n.TEXTURE_2D,0,at,bt,Vt,it,B,nt,x.data)}A.clearUpdateRanges(),e.pixelStorei(n.UNPACK_ROW_LENGTH,q),e.pixelStorei(n.UNPACK_SKIP_PIXELS,Z),e.pixelStorei(n.UNPACK_SKIP_ROWS,ot)}}function Ee(A,x,B){let nt=n.TEXTURE_2D;(x.isDataArrayTexture||x.isCompressedArrayTexture)&&(nt=n.TEXTURE_2D_ARRAY),x.isData3DTexture&&(nt=n.TEXTURE_3D);const j=oe(A,x),rt=x.source;e.bindTexture(nt,A.__webglTexture,n.TEXTURE0+B);const ht=i.get(rt);if(rt.version!==ht.__version||j===!0){if(e.activeTexture(n.TEXTURE0+B),(typeof ImageBitmap<"u"&&x.image instanceof ImageBitmap)===!1){const it=Jt.getPrimaries(Jt.workingColorSpace),Rt=x.colorSpace===pi?null:Jt.getPrimaries(x.colorSpace),Ht=x.colorSpace===pi||it===Rt?n.NONE:n.BROWSER_DEFAULT_WEBGL;e.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,x.flipY),e.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),e.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ht)}e.pixelStorei(n.UNPACK_ALIGNMENT,x.unpackAlignment);let Z=v(x.image,!1,s.maxTextureSize);Z=Pt(x,Z);const ot=r.convert(x.format,x.colorSpace),P=r.convert(x.type);let Q=T(x.internalFormat,ot,P,x.normalized,x.colorSpace,x.isVideoTexture);ne(nt,x);let Y;const lt=x.mipmaps,st=x.isVideoTexture!==!0,at=ht.__version===void 0||j===!0,bt=rt.dataReady,Vt=E(x,Z);if(x.isDepthTexture)Q=_(x.format===_i,x.type),at&&(st?e.texStorage2D(n.TEXTURE_2D,1,Q,Z.width,Z.height):e.texImage2D(n.TEXTURE_2D,0,Q,Z.width,Z.height,0,ot,P,null));else if(x.isDataTexture)if(lt.length>0){st&&at&&e.texStorage2D(n.TEXTURE_2D,Vt,Q,lt[0].width,lt[0].height);for(let it=0,Rt=lt.length;it<Rt;it++)Y=lt[it],st?bt&&e.texSubImage2D(n.TEXTURE_2D,it,0,0,Y.width,Y.height,ot,P,Y.data):e.texImage2D(n.TEXTURE_2D,it,Q,Y.width,Y.height,0,ot,P,Y.data);x.generateMipmaps=!1}else st?(at&&e.texStorage2D(n.TEXTURE_2D,Vt,Q,Z.width,Z.height),bt&&Ue(x,Z,ot,P)):e.texImage2D(n.TEXTURE_2D,0,Q,Z.width,Z.height,0,ot,P,Z.data);else if(x.isCompressedTexture)if(x.isCompressedArrayTexture){st&&at&&e.texStorage3D(n.TEXTURE_2D_ARRAY,Vt,Q,lt[0].width,lt[0].height,Z.depth);for(let it=0,Rt=lt.length;it<Rt;it++)if(Y=lt[it],x.format!==Bn)if(ot!==null)if(st){if(bt)if(x.layerUpdates.size>0){const Ht=Lc(Y.width,Y.height,x.format,x.type);for(const pt of x.layerUpdates){const ie=Y.data.subarray(pt*Ht/Y.data.BYTES_PER_ELEMENT,(pt+1)*Ht/Y.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,it,0,0,pt,Y.width,Y.height,1,ot,ie)}}else e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,it,0,0,0,Y.width,Y.height,Z.depth,ot,Y.data)}else e.compressedTexImage3D(n.TEXTURE_2D_ARRAY,it,Q,Y.width,Y.height,Z.depth,0,Y.data,0,0);else Nt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else st?bt&&e.texSubImage3D(n.TEXTURE_2D_ARRAY,it,0,0,0,Y.width,Y.height,Z.depth,ot,P,Y.data):e.texImage3D(n.TEXTURE_2D_ARRAY,it,Q,Y.width,Y.height,Z.depth,0,ot,P,Y.data);x.layerUpdates.size>0&&x.clearLayerUpdates()}else{st&&at&&e.texStorage2D(n.TEXTURE_2D,Vt,Q,lt[0].width,lt[0].height);for(let it=0,Rt=lt.length;it<Rt;it++)Y=lt[it],x.format!==Bn?ot!==null?st?bt&&e.compressedTexSubImage2D(n.TEXTURE_2D,it,0,0,Y.width,Y.height,ot,Y.data):e.compressedTexImage2D(n.TEXTURE_2D,it,Q,Y.width,Y.height,0,Y.data):Nt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):st?bt&&e.texSubImage2D(n.TEXTURE_2D,it,0,0,Y.width,Y.height,ot,P,Y.data):e.texImage2D(n.TEXTURE_2D,it,Q,Y.width,Y.height,0,ot,P,Y.data)}else if(x.isDataArrayTexture)if(st){if(at&&e.texStorage3D(n.TEXTURE_2D_ARRAY,Vt,Q,Z.width,Z.height,Z.depth),bt)if(x.layerUpdates.size>0){const it=Lc(Z.width,Z.height,x.format,x.type);for(const Rt of x.layerUpdates){const Ht=Z.data.subarray(Rt*it/Z.data.BYTES_PER_ELEMENT,(Rt+1)*it/Z.data.BYTES_PER_ELEMENT);e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,Rt,Z.width,Z.height,1,ot,P,Ht)}x.clearLayerUpdates()}else e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,Z.width,Z.height,Z.depth,ot,P,Z.data)}else e.texImage3D(n.TEXTURE_2D_ARRAY,0,Q,Z.width,Z.height,Z.depth,0,ot,P,Z.data);else if(x.isData3DTexture)st?(at&&e.texStorage3D(n.TEXTURE_3D,Vt,Q,Z.width,Z.height,Z.depth),bt&&e.texSubImage3D(n.TEXTURE_3D,0,0,0,0,Z.width,Z.height,Z.depth,ot,P,Z.data)):e.texImage3D(n.TEXTURE_3D,0,Q,Z.width,Z.height,Z.depth,0,ot,P,Z.data);else if(x.isFramebufferTexture){if(at)if(st)e.texStorage2D(n.TEXTURE_2D,Vt,Q,Z.width,Z.height);else{let it=Z.width,Rt=Z.height;for(let Ht=0;Ht<Vt;Ht++)e.texImage2D(n.TEXTURE_2D,Ht,Q,it,Rt,0,ot,P,null),it>>=1,Rt>>=1}}else if(x.isHTMLTexture){if("texElementImage2D"in n){const it=n.canvas;if(it.hasAttribute("layoutsubtree")||it.setAttribute("layoutsubtree","true"),Z.parentNode!==it){it.appendChild(Z),f.add(x),it.onpaint=Rt=>{const Ht=Rt.changedElements;for(const pt of f)Ht.includes(pt.image)&&(pt.needsUpdate=!0)},it.requestPaint();return}if(n.texElementImage2D.length===3)n.texElementImage2D(n.TEXTURE_2D,n.RGBA8,Z);else{const Ht=n.RGBA,pt=n.RGBA,ie=n.UNSIGNED_BYTE;n.texElementImage2D(n.TEXTURE_2D,0,Ht,pt,ie,Z)}n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE)}}else if(lt.length>0){if(st&&at){const it=Ft(lt[0]);e.texStorage2D(n.TEXTURE_2D,Vt,Q,it.width,it.height)}for(let it=0,Rt=lt.length;it<Rt;it++)Y=lt[it],st?bt&&e.texSubImage2D(n.TEXTURE_2D,it,0,0,ot,P,Y):e.texImage2D(n.TEXTURE_2D,it,Q,ot,P,Y);x.generateMipmaps=!1}else if(st){if(at){const it=Ft(Z);e.texStorage2D(n.TEXTURE_2D,Vt,Q,it.width,it.height)}bt&&e.texSubImage2D(n.TEXTURE_2D,0,0,0,ot,P,Z)}else e.texImage2D(n.TEXTURE_2D,0,Q,ot,P,Z);b(x)&&x.mipmapsAutoUpdate===!0&&y(nt),ht.__version=rt.version,x.onUpdate&&x.onUpdate(x)}A.__version=x.version}function Qe(A,x,B){if(x.image.length!==6)return;const nt=oe(A,x),j=x.source;e.bindTexture(n.TEXTURE_CUBE_MAP,A.__webglTexture,n.TEXTURE0+B);const rt=i.get(j);if(j.version!==rt.__version||nt===!0){e.activeTexture(n.TEXTURE0+B);const ht=Jt.getPrimaries(Jt.workingColorSpace),q=x.colorSpace===pi?null:Jt.getPrimaries(x.colorSpace),Z=x.colorSpace===pi||ht===q?n.NONE:n.BROWSER_DEFAULT_WEBGL;e.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,x.flipY),e.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),e.pixelStorei(n.UNPACK_ALIGNMENT,x.unpackAlignment),e.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Z);const ot=x.isCompressedTexture||x.image[0].isCompressedTexture,P=x.image[0]&&x.image[0].isDataTexture,Q=[];for(let pt=0;pt<6;pt++)!ot&&!P?Q[pt]=v(x.image[pt],!0,s.maxCubemapSize):Q[pt]=P?x.image[pt].image:x.image[pt],Q[pt]=Pt(x,Q[pt]);const Y=Q[0],lt=r.convert(x.format,x.colorSpace),st=r.convert(x.type);let at=T(x.internalFormat,lt,st,x.normalized,x.colorSpace);const bt=x.isVideoTexture!==!0,Vt=rt.__version===void 0||nt===!0,it=j.dataReady;let Rt=E(x,Y);ne(n.TEXTURE_CUBE_MAP,x);let Ht;if(x.isDepthTexture){if(at=_(x.format===_i,x.type),Vt)if(bt)e.texStorage2D(n.TEXTURE_CUBE_MAP,1,at,Y.width,Y.height);else for(let pt=0;pt<6;pt++)e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pt,0,at,Y.width,Y.height,0,lt,st,null)}else if(ot){bt&&Vt&&e.texStorage2D(n.TEXTURE_CUBE_MAP,Rt,at,Y.width,Y.height);for(let pt=0;pt<6;pt++){Ht=Q[pt].mipmaps;for(let ie=0;ie<Ht.length;ie++){const Le=Ht[ie];x.format!==Bn?lt!==null?bt?it&&e.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pt,ie,0,0,Le.width,Le.height,lt,Le.data):e.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pt,ie,at,Le.width,Le.height,0,Le.data):Nt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):bt?it&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pt,ie,0,0,Le.width,Le.height,lt,st,Le.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pt,ie,at,Le.width,Le.height,0,lt,st,Le.data)}}}else{if(Ht=x.mipmaps,bt&&Vt){Ht.length>0&&Rt++;const pt=Ft(Q[0]);e.texStorage2D(n.TEXTURE_CUBE_MAP,Rt,at,pt.width,pt.height)}for(let pt=0;pt<6;pt++)if(P){bt?it&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pt,0,0,0,Q[pt].width,Q[pt].height,lt,st,Q[pt].data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pt,0,at,Q[pt].width,Q[pt].height,0,lt,st,Q[pt].data);for(let ie=0;ie<Ht.length;ie++){const ri=Ht[ie].image[pt].image;bt?it&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pt,ie+1,0,0,ri.width,ri.height,lt,st,ri.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pt,ie+1,at,ri.width,ri.height,0,lt,st,ri.data)}}else{bt?it&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pt,0,0,0,lt,st,Q[pt]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pt,0,at,lt,st,Q[pt]);for(let ie=0;ie<Ht.length;ie++){const Le=Ht[ie];bt?it&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pt,ie+1,0,0,lt,st,Le.image[pt]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pt,ie+1,at,lt,st,Le.image[pt])}}}b(x)&&x.mipmapsAutoUpdate===!0&&y(n.TEXTURE_CUBE_MAP),rt.__version=j.version,x.onUpdate&&x.onUpdate(x)}A.__version=x.version}function me(A,x,B,nt,j,rt){const ht=r.convert(B.format,B.colorSpace),q=r.convert(B.type),Z=T(B.internalFormat,ht,q,B.normalized,B.colorSpace),ot=i.get(x),P=i.get(B);if(P.__renderTarget=x,!ot.__hasExternalTextures){const Q=Math.max(1,x.width>>rt),Y=Math.max(1,x.height>>rt);j===n.TEXTURE_3D||j===n.TEXTURE_2D_ARRAY?e.texImage3D(j,rt,Z,Q,Y,x.depth,0,ht,q,null):e.texImage2D(j,rt,Z,Q,Y,0,ht,q,null)}e.bindFramebuffer(n.FRAMEBUFFER,A),ft(x)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,nt,j,P.__webglTexture,0,fe(x)):(j===n.TEXTURE_2D||j>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&j<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,nt,j,P.__webglTexture,rt),e.bindFramebuffer(n.FRAMEBUFFER,null)}function Pn(A,x,B){if(n.bindRenderbuffer(n.RENDERBUFFER,A),x.depthBuffer){const nt=x.depthTexture,j=nt&&nt.isDepthTexture?nt.type:null,rt=_(x.stencilBuffer,j),ht=x.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;ft(x)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,fe(x),rt,x.width,x.height):B?n.renderbufferStorageMultisample(n.RENDERBUFFER,fe(x),rt,x.width,x.height):n.renderbufferStorage(n.RENDERBUFFER,rt,x.width,x.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,ht,n.RENDERBUFFER,A)}else{const nt=x.textures;for(let j=0;j<nt.length;j++){const rt=nt[j],ht=r.convert(rt.format,rt.colorSpace),q=r.convert(rt.type),Z=T(rt.internalFormat,ht,q,rt.normalized,rt.colorSpace);ft(x)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,fe(x),Z,x.width,x.height):B?n.renderbufferStorageMultisample(n.RENDERBUFFER,fe(x),Z,x.width,x.height):n.renderbufferStorage(n.RENDERBUFFER,Z,x.width,x.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function Pe(A,x,B){const nt=x.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(n.FRAMEBUFFER,A),!(x.depthTexture&&x.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const j=i.get(x.depthTexture);j.__renderTarget=x;const rt=nt?x.depthTexture.image[0]:x.depthTexture.image;(!j.__webglTexture||rt.width!==x.width||rt.height!==x.height)&&(rt.width=x.width,rt.height=x.height,x.depthTexture.needsUpdate=!0),nt?_t(x.depthTexture,0):gt(x.depthTexture,0);const ht=j.__webglTexture,q=fe(x),Z=nt?n.TEXTURE_CUBE_MAP_POSITIVE_X+B:n.TEXTURE_2D,ot=x.depthTexture.format===_i?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;if(x.depthTexture.format===Si)ft(x)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,ot,Z,ht,0,q):n.framebufferTexture2D(n.FRAMEBUFFER,ot,Z,ht,0);else if(x.depthTexture.format===_i)ft(x)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,ot,Z,ht,0,q):n.framebufferTexture2D(n.FRAMEBUFFER,ot,Z,ht,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function fn(A){const x=i.get(A),B=A.isWebGLCubeRenderTarget===!0;if(x.__boundDepthTexture!==A.depthTexture){const nt=A.depthTexture;if(x.__depthDisposeCallback&&x.__depthDisposeCallback(),nt){const j=()=>{delete x.__boundDepthTexture,delete x.__depthDisposeCallback,nt.removeEventListener("dispose",j)};nt.addEventListener("dispose",j),x.__depthDisposeCallback=j}x.__boundDepthTexture=nt}if(A.depthTexture&&!x.__autoAllocateDepthBuffer)if(B)for(let nt=0;nt<6;nt++)Pe(x.__webglFramebuffer[nt],A,nt);else A.texture.mipmaps.length>0?Pe(x.__webglFramebuffer[0],A,0):Pe(x.__webglFramebuffer,A,0);else if(B){x.__webglDepthbuffer=[];for(let nt=0;nt<6;nt++)if(e.bindFramebuffer(n.FRAMEBUFFER,x.__webglFramebuffer[nt]),x.__webglDepthbuffer[nt]===void 0)x.__webglDepthbuffer[nt]=n.createRenderbuffer(),Pn(x.__webglDepthbuffer[nt],A,!1);else{const j=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,rt=x.__webglDepthbuffer[nt];n.bindRenderbuffer(n.RENDERBUFFER,rt),n.framebufferRenderbuffer(n.FRAMEBUFFER,j,n.RENDERBUFFER,rt)}}else if(A.texture.mipmaps.length>0?e.bindFramebuffer(n.FRAMEBUFFER,x.__webglFramebuffer[0]):e.bindFramebuffer(n.FRAMEBUFFER,x.__webglFramebuffer),x.__webglDepthbuffer===void 0)x.__webglDepthbuffer=n.createRenderbuffer(),Pn(x.__webglDepthbuffer,A,!1);else{const j=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,rt=x.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,rt),n.framebufferRenderbuffer(n.FRAMEBUFFER,j,n.RENDERBUFFER,rt)}e.bindFramebuffer(n.FRAMEBUFFER,null)}function pn(A,x,B){const nt=i.get(A);x!==void 0&&me(nt.__webglFramebuffer,A,A.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),B!==void 0&&fn(A)}function mn(A){const x=A.texture,B=i.get(A),nt=i.get(x);A.addEventListener("dispose",F),L(A);const j=A.textures,rt=A.isWebGLCubeRenderTarget===!0,ht=j.length>1;if(ht||(nt.__webglTexture===void 0&&(nt.__webglTexture=n.createTexture()),nt.__version=x.version,a.memory.textures++),rt){B.__webglFramebuffer=[];for(let q=0;q<6;q++)if(x.mipmaps.length>0){B.__webglFramebuffer[q]=[];for(let Z=0;Z<x.mipmaps.length;Z++)B.__webglFramebuffer[q][Z]=n.createFramebuffer()}else B.__webglFramebuffer[q]=n.createFramebuffer()}else{if(x.mipmaps.length>0){B.__webglFramebuffer=[];for(let q=0;q<x.mipmaps.length;q++)B.__webglFramebuffer[q]=n.createFramebuffer()}else B.__webglFramebuffer=n.createFramebuffer();if(ht)for(let q=0,Z=j.length;q<Z;q++){const ot=i.get(j[q]);ot.__webglTexture===void 0&&(ot.__webglTexture=n.createTexture(),a.memory.textures++)}if(A.samples>0&&ft(A)===!1){B.__webglMultisampledFramebuffer=n.createFramebuffer(),B.__webglColorRenderbuffer=[],e.bindFramebuffer(n.FRAMEBUFFER,B.__webglMultisampledFramebuffer);for(let q=0;q<j.length;q++){const Z=j[q];B.__webglColorRenderbuffer[q]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,B.__webglColorRenderbuffer[q]);const ot=r.convert(Z.format,Z.colorSpace),P=r.convert(Z.type),Q=T(Z.internalFormat,ot,P,Z.normalized,Z.colorSpace,A.isXRRenderTarget===!0),Y=fe(A);n.renderbufferStorageMultisample(n.RENDERBUFFER,Y,Q,A.width,A.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+q,n.RENDERBUFFER,B.__webglColorRenderbuffer[q])}n.bindRenderbuffer(n.RENDERBUFFER,null),A.depthBuffer&&(B.__webglDepthRenderbuffer=n.createRenderbuffer(),Pn(B.__webglDepthRenderbuffer,A,!0)),e.bindFramebuffer(n.FRAMEBUFFER,null)}}if(rt){e.bindTexture(n.TEXTURE_CUBE_MAP,nt.__webglTexture),ne(n.TEXTURE_CUBE_MAP,x);for(let q=0;q<6;q++)if(x.mipmaps.length>0)for(let Z=0;Z<x.mipmaps.length;Z++)me(B.__webglFramebuffer[q][Z],A,x,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+q,Z);else me(B.__webglFramebuffer[q],A,x,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+q,0);b(x)?y(n.TEXTURE_CUBE_MAP):x.mipmaps.length>0&&n.texParameteri(n.TEXTURE_CUBE_MAP,n.TEXTURE_MAX_LEVEL,x.mipmaps.length-1),e.unbindTexture()}else if(ht){for(let q=0,Z=j.length;q<Z;q++){const ot=j[q],P=i.get(ot);let Q=n.TEXTURE_2D;(A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(Q=A.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),e.bindTexture(Q,P.__webglTexture),ne(Q,ot),me(B.__webglFramebuffer,A,ot,n.COLOR_ATTACHMENT0+q,Q,0),b(ot)&&y(Q)}e.unbindTexture()}else{let q=n.TEXTURE_2D;if((A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(q=A.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),e.bindTexture(q,nt.__webglTexture),ne(q,x),x.mipmaps.length>0)for(let Z=0;Z<x.mipmaps.length;Z++)me(B.__webglFramebuffer[Z],A,x,n.COLOR_ATTACHMENT0,q,Z);else me(B.__webglFramebuffer,A,x,n.COLOR_ATTACHMENT0,q,0);b(x)?y(q):x.mipmaps.length>0&&n.texParameteri(q,n.TEXTURE_MAX_LEVEL,x.mipmaps.length-1),e.unbindTexture()}A.depthBuffer&&fn(A)}function O(A){const x=A.textures;for(let B=0,nt=x.length;B<nt;B++){const j=x[B];if(b(j)&&j.mipmapsAutoUpdate===!0){const rt=w(A),ht=i.get(j).__webglTexture;e.bindTexture(rt,ht),y(rt),e.unbindTexture()}}}const gn=[];function de(A){if(A.samples>0){if(ft(A)===!1){const x=A.textures,B=A.width,nt=A.height;let j=n.COLOR_BUFFER_BIT;const rt=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,ht=i.get(A),q=x.length>1;if(q)for(let ot=0;ot<x.length;ot++)e.bindFramebuffer(n.FRAMEBUFFER,ht.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ot,n.RENDERBUFFER,null),e.bindFramebuffer(n.FRAMEBUFFER,ht.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+ot,n.TEXTURE_2D,null,0);e.bindFramebuffer(n.READ_FRAMEBUFFER,ht.__webglMultisampledFramebuffer),A.texture.mipmaps.length>0?e.bindFramebuffer(n.DRAW_FRAMEBUFFER,ht.__webglFramebuffer[0]):e.bindFramebuffer(n.DRAW_FRAMEBUFFER,ht.__webglFramebuffer);for(let ot=0;ot<x.length;ot++){if(A.resolveDepthBuffer&&(A.depthBuffer&&(j|=n.DEPTH_BUFFER_BIT),A.stencilBuffer&&A.resolveStencilBuffer&&(j|=n.STENCIL_BUFFER_BIT)),q){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,ht.__webglColorRenderbuffer[ot]);const P=i.get(x[ot]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,P,0)}n.blitFramebuffer(0,0,B,nt,0,0,B,nt,j,n.NEAREST),c===!0&&(gn.length=0,gn.push(n.COLOR_ATTACHMENT0+ot),A.depthBuffer&&A.storeMultisampledDepthBuffer===!1&&gn.push(rt),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,gn))}if(e.bindFramebuffer(n.READ_FRAMEBUFFER,null),e.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),q)for(let ot=0;ot<x.length;ot++){e.bindFramebuffer(n.FRAMEBUFFER,ht.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ot,n.RENDERBUFFER,ht.__webglColorRenderbuffer[ot]);const P=i.get(x[ot]).__webglTexture;e.bindFramebuffer(n.FRAMEBUFFER,ht.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+ot,n.TEXTURE_2D,P,0)}e.bindFramebuffer(n.DRAW_FRAMEBUFFER,ht.__webglMultisampledFramebuffer)}else if(A.depthBuffer&&A.storeMultisampledDepthBuffer===!1&&c){const x=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[x])}}}function fe(A){return Math.min(s.maxSamples,A.samples)}function ft(A){const x=i.get(A);return A.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&x.__useRenderToTexture!==!1}function be(A){const x=a.render.frame;h.get(A)!==x&&(h.set(A,x),A.update())}function Pt(A,x){const B=A.colorSpace,nt=A.format,j=A.type;return A.isCompressedTexture===!0||A.isVideoTexture===!0||B!==jr&&B!==pi&&(Jt.getTransfer(B)===re?(nt!==Bn||j!==dn)&&Nt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):jt("WebGLTextures: Unsupported texture color space:",B)),x}function Ft(A){return typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement?(l.width=A.naturalWidth||A.width,l.height=A.naturalHeight||A.height):typeof VideoFrame<"u"&&A instanceof VideoFrame?(l.width=A.displayWidth,l.height=A.displayHeight):(l.width=A.width,l.height=A.height),l}this.allocateTextureUnit=Tt,this.resetTextureUnits=X,this.getTextureUnits=J,this.setTextureUnits=dt,this.setTexture2D=gt,this.setTexture2DArray=Mt,this.setTexture3D=Ct,this.setTextureCube=_t,this.rebindTextures=pn,this.setupRenderTarget=mn,this.updateRenderTargetMipmap=O,this.updateMultisampleRenderTarget=de,this.setupDepthRenderbuffer=fn,this.setupFrameBufferTexture=me,this.useMultisampledRTT=ft,this.dispose=H}function m_(n,t){function e(i,s=pi){let r;const a=Jt.getTransfer(s);if(i===dn)return n.UNSIGNED_BYTE;if(i===dl)return n.UNSIGNED_SHORT_4_4_4_4;if(i===fl)return n.UNSIGNED_SHORT_5_5_5_1;if(i===Fh)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===Oh)return n.UNSIGNED_INT_10F_11F_11F_REV;if(i===Nh)return n.BYTE;if(i===Uh)return n.SHORT;if(i===nr)return n.UNSIGNED_SHORT;if(i===ul)return n.INT;if(i===Vn)return n.UNSIGNED_INT;if(i===kn)return n.FLOAT;if(i===Wn)return n.HALF_FLOAT;if(i===zh)return n.ALPHA;if(i===kh)return n.RGB;if(i===Bn)return n.RGBA;if(i===Si)return n.DEPTH_COMPONENT;if(i===_i)return n.DEPTH_STENCIL;if(i===Bh)return n.RED;if(i===pl)return n.RED_INTEGER;if(i===Vi)return n.RG;if(i===ml)return n.RG_INTEGER;if(i===gl)return n.RGBA_INTEGER;if(i===Vr||i===Wr||i===Xr||i===$r)if(a===re)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(i===Vr)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===Wr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===Xr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===$r)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(i===Vr)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===Wr)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===Xr)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===$r)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===xo||i===vo||i===Mo||i===So)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(i===xo)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===vo)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===Mo)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===So)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===yo||i===Eo||i===bo||i===To||i===wo||i===Jr||i===Ao)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(i===yo||i===Eo)return a===re?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(i===bo)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(i===To)return r.COMPRESSED_R11_EAC;if(i===wo)return r.COMPRESSED_SIGNED_R11_EAC;if(i===Jr)return r.COMPRESSED_RG11_EAC;if(i===Ao)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(i===Ro||i===Co||i===Po||i===Lo||i===Do||i===Io||i===No||i===Uo||i===Fo||i===Oo||i===zo||i===ko||i===Bo||i===Go)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(i===Ro)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Co)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Po)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Lo)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Do)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Io)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===No)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Uo)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Fo)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===Oo)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===zo)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===ko)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Bo)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Go)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Ho||i===Vo||i===Wo)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(i===Ho)return a===re?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Vo)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Wo)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Xo||i===$o||i===Qr||i===Yo)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(i===Xo)return r.COMPRESSED_RED_RGTC1_EXT;if(i===$o)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Qr)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Yo)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Es?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:e}}const g_=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,__=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class x_{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){const i=new nu(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=i}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,i=new Xi({vertexShader:g_,fragmentShader:__,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new Oe(new Ts(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class v_ extends wi{constructor(t,e){super();const i=this;let s=null,r=1,a=null,o="local-floor",c=1,l=null,h=null,f=null,p=null,m=null,g=null;const M=typeof XRWebGLBinding<"u",d=new x_,u={},v=e.getContextAttributes();let b=null,y=null;const w=[],T=[],_=new At;let E=null,L=null;const R=new Ze;R.viewport=new _e;const I=new Ze;I.viewport=new _e;const F=[R,I],z=new Rf;let C=null,H=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(K){let gt=w[K];return gt===void 0&&(gt=new Ia,w[K]=gt),gt.getTargetRaySpace()},this.getControllerGrip=function(K){let gt=w[K];return gt===void 0&&(gt=new Ia,w[K]=gt),gt.getGripSpace()},this.getHand=function(K){let gt=w[K];return gt===void 0&&(gt=new Ia,w[K]=gt),gt.getHandSpace()};function $(K){const gt=T.indexOf(K.inputSource);if(gt===-1)return;const Mt=w[gt];Mt!==void 0&&(Mt.update(K.inputSource,K.frame,l||a),Mt.dispatchEvent({type:K.type,data:K.inputSource}))}function V(){s.removeEventListener("select",$),s.removeEventListener("selectstart",$),s.removeEventListener("selectend",$),s.removeEventListener("squeeze",$),s.removeEventListener("squeezestart",$),s.removeEventListener("squeezeend",$),s.removeEventListener("end",V),s.removeEventListener("inputsourceschange",et);for(let K=0;K<w.length;K++){const gt=T[K];gt!==null&&(T[K]=null,w[K].disconnect(gt))}C=null,H=null,d.reset();for(const K in u)delete u[K];if(t.setRenderTarget(b),m=null,p=null,f=null,s=null,y=null,Tt.stop(),i.isPresenting=!1,t.setPixelRatio(E),t.setSize(_.width,_.height,!1),L!==null){const K=L.camera;K.fov=L.fov,K.zoom=L.zoom,K.updateProjectionMatrix(),L=null}i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(K){r=K,i.isPresenting===!0&&Nt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(K){o=K,i.isPresenting===!0&&Nt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||a},this.setReferenceSpace=function(K){l=K},this.getBaseLayer=function(){return p!==null?p:m},this.getBinding=function(){return f===null&&M&&(f=new XRWebGLBinding(s,e)),f},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(K){if(s=K,s!==null){if(b=t.getRenderTarget(),s.addEventListener("select",$),s.addEventListener("selectstart",$),s.addEventListener("selectend",$),s.addEventListener("squeeze",$),s.addEventListener("squeezestart",$),s.addEventListener("squeezeend",$),s.addEventListener("end",V),s.addEventListener("inputsourceschange",et),v.xrCompatible!==!0&&await e.makeXRCompatible(),E=t.getPixelRatio(),t.getSize(_),M&&"createProjectionLayer"in XRWebGLBinding.prototype){let Mt=null,Ct=null,_t=null;v.depth&&(_t=v.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,Mt=v.stencil?_i:Si,Ct=v.stencil?Es:Vn);const kt={colorFormat:e.RGBA8,depthFormat:_t,scaleFactor:r};f=this.getBinding(),p=f.createProjectionLayer(kt),s.updateRenderState({layers:[p]}),t.setPixelRatio(1),t.setSize(p.textureWidth,p.textureHeight,!1),y=new Gn(p.textureWidth,p.textureHeight,{format:Bn,type:dn,depthTexture:new bs(p.textureWidth,p.textureHeight,Ct,void 0,void 0,void 0,void 0,void 0,void 0,Mt),stencilBuffer:v.stencil,colorSpace:t.outputColorSpace,samples:v.antialias?4:0,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1,storeMultisampledDepthBuffer:p.ignoreDepthValues===!1,storeMultisampledStencilBuffer:p.ignoreDepthValues===!1})}else{const Mt={antialias:v.antialias,alpha:!0,depth:v.depth,stencil:v.stencil,framebufferScaleFactor:r};m=new XRWebGLLayer(s,e,Mt),s.updateRenderState({baseLayer:m}),t.setPixelRatio(1),t.setSize(m.framebufferWidth,m.framebufferHeight,!1),y=new Gn(m.framebufferWidth,m.framebufferHeight,{format:Bn,type:dn,colorSpace:t.outputColorSpace,stencilBuffer:v.stencil,resolveDepthBuffer:m.ignoreDepthValues===!1,resolveStencilBuffer:m.ignoreDepthValues===!1,storeMultisampledDepthBuffer:m.ignoreDepthValues===!1,storeMultisampledStencilBuffer:m.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(c),l=null,a=await s.requestReferenceSpace(o),Tt.setContext(s),Tt.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return d.getDepthTexture()};function et(K){for(let gt=0;gt<K.removed.length;gt++){const Mt=K.removed[gt],Ct=T.indexOf(Mt);Ct>=0&&(T[Ct]=null,w[Ct].disconnect(Mt))}for(let gt=0;gt<K.added.length;gt++){const Mt=K.added[gt];let Ct=T.indexOf(Mt);if(Ct===-1){for(let kt=0;kt<w.length;kt++)if(kt>=T.length){T.push(Mt),Ct=kt;break}else if(T[kt]===null){T[kt]=Mt,Ct=kt;break}if(Ct===-1)break}const _t=w[Ct];_t&&_t.connect(Mt)}}function U(K,gt){gt===null?K.matrixWorld.copy(K.matrix):K.matrixWorld.multiplyMatrices(gt.matrixWorld,K.matrix),K.matrixWorldInverse.copy(K.matrixWorld).invert()}this.updateCamera=function(K){if(s===null)return;let gt=K.near,Mt=K.far;d.texture!==null&&(d.depthNear>0&&(gt=d.depthNear),d.depthFar>0&&(Mt=d.depthFar)),z.near=I.near=R.near=gt,z.far=I.far=R.far=Mt,(C!==z.near||H!==z.far)&&(s.updateRenderState({depthNear:z.near,depthFar:z.far}),C=z.near,H=z.far),z.layers.mask=K.layers.mask|6,R.layers.mask=z.layers.mask&-5,I.layers.mask=z.layers.mask&-3;const Ct=K.parent,_t=z.cameras;U(z,Ct);for(let kt=0;kt<_t.length;kt++)U(_t[kt],Ct);z.projectionMatrix.copy(R.projectionMatrix),z.projectionMatrixInverse.copy(R.projectionMatrixInverse),L===null&&K.isPerspectiveCamera&&(L={camera:K,fov:K.fov,zoom:K.zoom}),X(K,z,Ct)};function X(K,gt,Mt){Mt===null?K.matrix.copy(gt.matrixWorld):(K.matrix.copy(Mt.matrixWorld),K.matrix.invert(),K.matrix.multiply(gt.matrixWorld)),K.matrix.decompose(K.position,K.quaternion,K.scale),K.updateMatrixWorld(!0),K.projectionMatrix.copy(gt.projectionMatrix),K.projectionMatrixInverse.copy(gt.projectionMatrixInverse),K.isPerspectiveCamera&&(K.fov=sr*2*Math.atan(1/K.projectionMatrix.elements[5]),K.zoom=1)}this.getCamera=function(){return z},this.getFoveation=function(){if(!(p===null&&m===null))return c},this.setFoveation=function(K){c=K,p!==null&&(p.fixedFoveation=K),m!==null&&m.fixedFoveation!==void 0&&(m.fixedFoveation=K)},this.hasDepthSensing=function(){return d.texture!==null},this.getDepthSensingMesh=function(){return d.getMesh(z)},this.getCameraTexture=function(K){return u[K]};let J=null;function dt(K,gt){if(h=gt.getViewerPose(l||a),g=gt,h!==null){const Mt=h.views;m!==null&&(t.setRenderTargetFramebuffer(y,m.framebuffer),t.setRenderTarget(y));let Ct=!1;Mt.length!==z.cameras.length&&(z.cameras.length=0,Ct=!0);for(let It=0;It<Mt.length;It++){const ne=Mt[It];let oe=null;if(m!==null)oe=m.getViewport(ne);else{const Ue=f.getViewSubImage(p,ne);oe=Ue.viewport,It===0&&(t.setRenderTargetTextures(y,Ue.colorTexture,Ue.depthStencilTexture),t.setRenderTarget(y))}let qt=F[It];qt===void 0&&(qt=new Ze,qt.layers.enable(It),qt.viewport=new _e,F[It]=qt),qt.matrix.fromArray(ne.transform.matrix),qt.matrix.decompose(qt.position,qt.quaternion,qt.scale),qt.projectionMatrix.fromArray(ne.projectionMatrix),qt.projectionMatrixInverse.copy(qt.projectionMatrix).invert(),qt.viewport.set(oe.x,oe.y,oe.width,oe.height),It===0&&(z.matrix.copy(qt.matrix),z.matrix.decompose(z.position,z.quaternion,z.scale)),Ct===!0&&z.cameras.push(qt)}const _t=s.enabledFeatures;if(_t&&_t.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&M){f=i.getBinding();const It=f.getDepthInformation(Mt[0]);It&&It.isValid&&It.texture&&d.init(It,s.renderState)}if(_t&&_t.includes("camera-access")&&M){t.state.unbindTexture(),f=i.getBinding();for(let It=0;It<Mt.length;It++){const ne=Mt[It].camera;if(ne){let oe=u[ne];oe||(oe=new nu,u[ne]=oe);const qt=f.getCameraImage(ne);oe.sourceTexture=qt}}}}for(let Mt=0;Mt<w.length;Mt++){const Ct=T[Mt],_t=w[Mt];Ct!==null&&_t!==void 0&&_t.update(Ct,gt,l||a)}J&&J(K,gt),gt.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:gt}),g=null}const Tt=new ou;Tt.setAnimationLoop(dt),this.setAnimationLoop=function(K){J=K},this.dispose=function(){}}}const M_=new ue,_u=new Ot;_u.set(-1,0,0,0,1,0,0,0,1);function S_(n,t){function e(d,u){d.matrixAutoUpdate===!0&&d.updateMatrix(),u.value.copy(d.matrix)}function i(d,u){u.color.getRGB(d.fogColor.value,iu(n)),u.isFog?(d.fogNear.value=u.near,d.fogFar.value=u.far):u.isFogExp2&&(d.fogDensity.value=u.density)}function s(d,u,v,b,y){u.isNodeMaterial?u.uniformsNeedUpdate=!1:u.isMeshBasicMaterial?r(d,u):u.isMeshLambertMaterial?(r(d,u),u.envMap&&(d.envMapIntensity.value=u.envMapIntensity)):u.isMeshToonMaterial?(r(d,u),f(d,u)):u.isMeshPhongMaterial?(r(d,u),h(d,u),u.envMap&&(d.envMapIntensity.value=u.envMapIntensity)):u.isMeshStandardMaterial?(r(d,u),p(d,u),u.isMeshPhysicalMaterial&&m(d,u,y)):u.isMeshMatcapMaterial?(r(d,u),g(d,u)):u.isMeshDepthMaterial?r(d,u):u.isMeshDistanceMaterial?(r(d,u),M(d,u)):u.isMeshNormalMaterial?r(d,u):u.isLineBasicMaterial?(a(d,u),u.isLineDashedMaterial&&o(d,u)):u.isPointsMaterial?c(d,u,v,b):u.isSpriteMaterial?l(d,u):u.isShadowMaterial?(d.color.value.copy(u.color),d.opacity.value=u.opacity):u.isShaderMaterial&&(u.uniformsNeedUpdate=!1)}function r(d,u){d.opacity.value=u.opacity,u.color&&d.diffuse.value.copy(u.color),u.emissive&&d.emissive.value.copy(u.emissive).multiplyScalar(u.emissiveIntensity),u.map&&(d.map.value=u.map,e(u.map,d.mapTransform)),u.alphaMap&&(d.alphaMap.value=u.alphaMap,e(u.alphaMap,d.alphaMapTransform)),u.bumpMap&&(d.bumpMap.value=u.bumpMap,e(u.bumpMap,d.bumpMapTransform),d.bumpScale.value=u.bumpScale,u.side===sn&&(d.bumpScale.value*=-1)),u.normalMap&&(d.normalMap.value=u.normalMap,e(u.normalMap,d.normalMapTransform),d.normalScale.value.copy(u.normalScale),u.side===sn&&d.normalScale.value.negate()),u.displacementMap&&(d.displacementMap.value=u.displacementMap,e(u.displacementMap,d.displacementMapTransform),d.displacementScale.value=u.displacementScale,d.displacementBias.value=u.displacementBias),u.emissiveMap&&(d.emissiveMap.value=u.emissiveMap,e(u.emissiveMap,d.emissiveMapTransform)),u.specularMap&&(d.specularMap.value=u.specularMap,e(u.specularMap,d.specularMapTransform)),u.alphaTest>0&&(d.alphaTest.value=u.alphaTest);const v=t.get(u),b=v.envMap,y=v.envMapRotation;b&&(d.envMap.value=b,d.envMapRotation.value.setFromMatrix4(M_.makeRotationFromEuler(y)).transpose(),b.isCubeTexture&&b.isRenderTargetTexture===!1&&d.envMapRotation.value.premultiply(_u),d.reflectivity.value=u.reflectivity,d.ior.value=u.ior,d.refractionRatio.value=u.refractionRatio),u.lightMap&&(d.lightMap.value=u.lightMap,d.lightMapIntensity.value=u.lightMapIntensity,e(u.lightMap,d.lightMapTransform)),u.aoMap&&(d.aoMap.value=u.aoMap,d.aoMapIntensity.value=u.aoMapIntensity,e(u.aoMap,d.aoMapTransform))}function a(d,u){d.diffuse.value.copy(u.color),d.opacity.value=u.opacity,u.map&&(d.map.value=u.map,e(u.map,d.mapTransform))}function o(d,u){d.dashSize.value=u.dashSize,d.totalSize.value=u.dashSize+u.gapSize,d.scale.value=u.scale}function c(d,u,v,b){d.diffuse.value.copy(u.color),d.opacity.value=u.opacity,d.size.value=u.size*v,d.scale.value=b*.5,u.map&&(d.map.value=u.map,e(u.map,d.uvTransform)),u.alphaMap&&(d.alphaMap.value=u.alphaMap,e(u.alphaMap,d.alphaMapTransform)),u.alphaTest>0&&(d.alphaTest.value=u.alphaTest)}function l(d,u){d.diffuse.value.copy(u.color),d.opacity.value=u.opacity,d.rotation.value=u.rotation,u.map&&(d.map.value=u.map,e(u.map,d.mapTransform)),u.alphaMap&&(d.alphaMap.value=u.alphaMap,e(u.alphaMap,d.alphaMapTransform)),u.alphaTest>0&&(d.alphaTest.value=u.alphaTest)}function h(d,u){d.specular.value.copy(u.specular),d.shininess.value=Math.max(u.shininess,1e-4)}function f(d,u){u.gradientMap&&(d.gradientMap.value=u.gradientMap)}function p(d,u){d.metalness.value=u.metalness,u.metalnessMap&&(d.metalnessMap.value=u.metalnessMap,e(u.metalnessMap,d.metalnessMapTransform)),d.roughness.value=u.roughness,u.roughnessMap&&(d.roughnessMap.value=u.roughnessMap,e(u.roughnessMap,d.roughnessMapTransform)),u.envMap&&(d.envMapIntensity.value=u.envMapIntensity)}function m(d,u,v){d.ior.value=u.ior,u.diffuseRoughness>0&&(d.diffuseRoughness.value=u.diffuseRoughness,u.diffuseRoughnessMap&&(d.diffuseRoughnessMap.value=u.diffuseRoughnessMap,e(u.diffuseRoughnessMap,d.diffuseRoughnessMapTransform))),u.sheen>0&&(d.sheenColor.value.copy(u.sheenColor).multiplyScalar(u.sheen),d.sheenRoughness.value=u.sheenRoughness,u.sheenColorMap&&(d.sheenColorMap.value=u.sheenColorMap,e(u.sheenColorMap,d.sheenColorMapTransform)),u.sheenRoughnessMap&&(d.sheenRoughnessMap.value=u.sheenRoughnessMap,e(u.sheenRoughnessMap,d.sheenRoughnessMapTransform))),u.clearcoat>0&&(d.clearcoat.value=u.clearcoat,d.clearcoatRoughness.value=u.clearcoatRoughness,u.clearcoatMap&&(d.clearcoatMap.value=u.clearcoatMap,e(u.clearcoatMap,d.clearcoatMapTransform)),u.clearcoatRoughnessMap&&(d.clearcoatRoughnessMap.value=u.clearcoatRoughnessMap,e(u.clearcoatRoughnessMap,d.clearcoatRoughnessMapTransform)),u.clearcoatNormalMap&&(d.clearcoatNormalMap.value=u.clearcoatNormalMap,e(u.clearcoatNormalMap,d.clearcoatNormalMapTransform),d.clearcoatNormalScale.value.copy(u.clearcoatNormalScale),u.side===sn&&d.clearcoatNormalScale.value.negate())),u.dispersion>0&&(d.dispersion.value=u.dispersion),u.retroreflectivity>0&&(d.retroreflectivity.value=u.retroreflectivity),u.iridescence>0&&(d.iridescence.value=u.iridescence,d.iridescenceIOR.value=u.iridescenceIOR,d.iridescenceThicknessMinimum.value=u.iridescenceThicknessMinimum,d.iridescenceThicknessMaximum.value=u.iridescenceThicknessMaximum,u.iridescenceMap&&(d.iridescenceMap.value=u.iridescenceMap,e(u.iridescenceMap,d.iridescenceMapTransform)),u.iridescenceThicknessMap&&(d.iridescenceThicknessMap.value=u.iridescenceThicknessMap,e(u.iridescenceThicknessMap,d.iridescenceThicknessMapTransform))),u.transmission>0&&(d.transmission.value=u.transmission,d.transmissionSamplerMap.value=v.texture,d.transmissionSamplerSize.value.set(v.width,v.height),u.transmissionMap&&(d.transmissionMap.value=u.transmissionMap,e(u.transmissionMap,d.transmissionMapTransform)),d.thickness.value=u.thickness,u.thicknessMap&&(d.thicknessMap.value=u.thicknessMap,e(u.thicknessMap,d.thicknessMapTransform)),d.attenuationDistance.value=u.attenuationDistance,d.attenuationColor.value.copy(u.attenuationColor)),u.anisotropy>0&&(d.anisotropyVector.value.set(u.anisotropy*Math.cos(u.anisotropyRotation),u.anisotropy*Math.sin(u.anisotropyRotation)),u.anisotropyMap&&(d.anisotropyMap.value=u.anisotropyMap,e(u.anisotropyMap,d.anisotropyMapTransform))),d.specularIntensity.value=u.specularIntensity,d.specularColor.value.copy(u.specularColor),u.specularColorMap&&(d.specularColorMap.value=u.specularColorMap,e(u.specularColorMap,d.specularColorMapTransform)),u.specularIntensityMap&&(d.specularIntensityMap.value=u.specularIntensityMap,e(u.specularIntensityMap,d.specularIntensityMapTransform))}function g(d,u){u.matcap&&(d.matcap.value=u.matcap)}function M(d,u){const v=t.get(u).light;d.referencePosition.value.setFromMatrixPosition(v.matrixWorld),d.nearDistance.value=v.shadow.camera.near,d.farDistance.value=v.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:s}}function y_(n,t,e,i){let s={},r={};function a(v,b){const y=b.program;i.uniformBlockBinding(v,y,s[v.id])}function o(v,b){let y=s[v.id];y===void 0&&(g(v),y=c(v),s[v.id]=y,v.addEventListener("dispose",d));const w=b.program;i.updateUBOMapping(v,w);const T=t.render.frame;r[v.id]!==T&&(l(v),r[v.id]=T)}function c(v){const b=n.createBuffer(),y=v.__size,w=v.usage;return n.bindBuffer(n.UNIFORM_BUFFER,b),n.bufferData(n.UNIFORM_BUFFER,y,w),n.bindBuffer(n.UNIFORM_BUFFER,null),b}function l(v){const b=s[v.id],y=v.uniforms,w=v.__cache;n.bindBuffer(n.UNIFORM_BUFFER,b);for(let T=0,_=y.length;T<_;T++){const E=y[T];if(Array.isArray(E))for(let L=0,R=E.length;L<R;L++)h(E[L],T,L,w);else h(E,T,0,w)}n.bindBuffer(n.UNIFORM_BUFFER,null)}function h(v,b,y,w){if(p(v,b,y,w)===!0){const T=v.__offset,_=v.value;if(Array.isArray(_)){let E=0;for(let L=0;L<_.length;L++){const R=_[L],I=M(R,!0);f(R,v.__data,E),E+=I.storage/Float32Array.BYTES_PER_ELEMENT}}else f(_,v.__data,0);n.bufferSubData(n.UNIFORM_BUFFER,T,v.__data)}}function f(v,b,y){typeof v=="number"||typeof v=="boolean"?b[y]=v:v.isMatrix3?(b[y]=v.elements[0],b[y+1]=v.elements[1],b[y+2]=v.elements[2],b[y+3]=0,b[y+4]=v.elements[3],b[y+5]=v.elements[4],b[y+6]=v.elements[5],b[y+7]=0,b[y+8]=v.elements[6],b[y+9]=v.elements[7],b[y+10]=v.elements[8],b[y+11]=0):ArrayBuffer.isView(v)?b.set(v.subarray(0,b.length-y),y):v.toArray(b,y)}function p(v,b,y,w){const T=v.value,_=b+"_"+y;if(Array.isArray(T)){w[_]===void 0&&(w[_]=[]);const E=w[_];let L=!1;for(let R=0;R<T.length;R++)m(T[R],E,R)===!0&&(L=!0);return L}return m(T,w,_)}function m(v,b,y){if(b[y]===void 0)return typeof v=="number"||typeof v=="boolean"?b[y]=v:ArrayBuffer.isView(v)?b[y]=v.slice():b[y]=v.clone(),!0;{const w=b[y];if(typeof v=="number"||typeof v=="boolean"){if(w!==v)return b[y]=v,!0}else{if(ArrayBuffer.isView(v))return!0;if(w.equals(v)===!1)return w.copy(v),!0}}return!1}function g(v){const b=v.uniforms;let y=0;const w=16;for(let _=0,E=b.length;_<E;_++){const L=Array.isArray(b[_])?b[_]:[b[_]];for(let R=0,I=L.length;R<I;R++){const F=L[R],z=Array.isArray(F.value)?F.value:[F.value],C=Array.isArray(b[_])||Array.isArray(F.value);let H=y;for(let V=0,et=z.length;V<et;V++){const U=z[V],X=M(U,C),J=y%w,dt=J%X.boundary,Tt=J+dt;y+=dt,Tt!==0&&w-Tt<X.storage&&(y+=w-Tt),V===0&&(H=y),y+=X.storage}const $=F.type==="int"?Int32Array:F.type==="uint"?Uint32Array:Float32Array;F.__data=new $((y-H)/Float32Array.BYTES_PER_ELEMENT),F.__offset=H}}const T=y%w;return T>0&&(y+=w-T),v.__size=y,v.__cache={},this}function M(v,b){const y={boundary:0,storage:0};return typeof v=="number"||typeof v=="boolean"?(y.boundary=4,y.storage=4):v.isVector2?(y.boundary=8,y.storage=8):v.isVector3||v.isColor?(y.boundary=16,y.storage=12):v.isVector4?(y.boundary=16,y.storage=16):v.isMatrix3?(y.boundary=16,y.storage=48):v.isMatrix4?(y.boundary=16,y.storage=64):v.isTexture?Nt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(v)?(y.boundary=16,y.storage=v.byteLength):Nt("WebGLRenderer: Unsupported uniform value type.",v),b===!0&&(y.boundary=16,y.storage=Math.ceil(y.storage/16)*16),y}function d(v){const b=v.target;b.removeEventListener("dispose",d),n.deleteBuffer(s[b.id]),delete s[b.id],delete r[b.id]}function u(){for(const v in s)n.deleteBuffer(s[v]);s={},r={}}return{bind:a,update:o,dispose:u}}const E_=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let Dn=null;function b_(){return Dn===null&&(Dn=new ff(E_,16,16,Vi,Wn),Dn.name="DFG_LUT",Dn.minFilter=en,Dn.magFilter=en,Dn.wrapS=ti,Dn.wrapT=ti,Dn.generateMipmaps=!1,Dn.needsUpdate=!0),Dn}class jc{constructor(t={}){const{canvas:e=Td(),context:i=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:f=!1,reversedDepthBuffer:p=!1,outputBufferType:m=dn}=t;this.isWebGLRenderer=!0;let g;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=i.getContextAttributes().alpha}else g=a;const M=m,d=new Set([gl,ml,pl]),u=new Set([dn,Vn,nr,Es,dl,fl]),v=new Uint32Array(4),b=new Int32Array(4),y={textures:[],min:[],max:[],resolution:[]};let w=null,T=null;const _=[],E=[];let L=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=ni,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const R=this;let I=!1,F=null,z=null,C=null,H=null;this._outputColorSpace=un;let $=0,V=0,et=null,U=-1,X=null;const J=new _e,dt=new _e;let Tt=null;const K=new Xt(0);let gt=0,Mt=e.width,Ct=e.height,_t=1,kt=null,Me=null;const It=new _e(0,0,Mt,Ct),ne=new _e(0,0,Mt,Ct);let oe=!1;const qt=new ar,Ue=new El;let Ee=!1,Qe=!1;const me=new ue,Pn=new N,Pe=new _e,fn={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let pn=!1;function mn(){return et===null?_t:1}let O=i;function gn(S,D){return e.getContext(S,D)}let de,fe,ft,be,Pt,Ft,A,x,B,nt,j,rt,ht,q,Z,ot,P,Q,Y,lt,st,at,bt;try{const S={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:f};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${hl}`),e.addEventListener("webglcontextlost",Rt,!1),e.addEventListener("webglcontextrestored",Ht,!1),e.addEventListener("webglcontextcreationerror",pt,!1),O===null){const D="webgl2";if(O=gn(D,S),O===null)throw gn(D)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}Vt()}catch(S){throw e.removeEventListener("webglcontextlost",Rt,!1),e.removeEventListener("webglcontextrestored",Ht,!1),e.removeEventListener("webglcontextcreationerror",pt,!1),jt("WebGLRenderer: "+S.message),S}function Vt(){de=new R0(O),de.init(),st=new m_(O,de),fe=new _0(O,de,t,st),ft=new f_(O,de),fe.reversedDepthBuffer&&p&&ft.buffers.depth.setReversed(!0),z=O.createFramebuffer(),C=O.createFramebuffer(),H=O.createFramebuffer(),be=new L0(O),Pt=new jg,Ft=new p_(O,de,ft,Pt,fe,st,be),A=new A0(R),x=new If(O),at=new m0(O,x),B=new C0(O,x,be,at),nt=new I0(O,B,x,at,be),Q=new D0(O,fe,Ft),Z=new x0(Pt),j=new Qg(R,A,de,fe,at,Z),rt=new S_(R,Pt),ht=new e_,q=new o_(de),P=new p0(R,A,ft,nt,g,c),ot=new d_(R,nt,fe),bt=new y_(O,be,fe,ft),Y=new g0(O,de,be),lt=new P0(O,de,be),be.programs=j.programs,R.capabilities=fe,R.extensions=de,R.properties=Pt,R.renderLists=ht,R.shadowMap=ot,R.state=ft,R.info=be}M!==dn&&(L=new U0(M,e.width,e.height,o,s,r));const it=new v_(R,O);this.xr=it,this.getContext=function(){return O},this.getContextAttributes=function(){return O.getContextAttributes()},this.forceContextLoss=function(){const S=de.get("WEBGL_lose_context");S&&S.loseContext()},this.forceContextRestore=function(){const S=de.get("WEBGL_lose_context");S&&S.restoreContext()},this.getPixelRatio=function(){return _t},this.setPixelRatio=function(S){S!==void 0&&(_t=S,this.setSize(Mt,Ct,!1))},this.getSize=function(S){return S.set(Mt,Ct)},this.setSize=function(S,D,W=!0){if(it.isPresenting){Nt("WebGLRenderer: Can't change size while VR device is presenting.");return}Mt=S,Ct=D,e.width=Math.floor(S*_t),e.height=Math.floor(D*_t),W===!0&&(e.style.width=S+"px",e.style.height=D+"px"),L!==null&&L.setSize(e.width,e.height),this.setViewport(0,0,S,D)},this.getDrawingBufferSize=function(S){return S.set(Mt*_t,Ct*_t).floor()},this.setDrawingBufferSize=function(S,D,W){Mt=S,Ct=D,_t=W,e.width=Math.floor(S*W),e.height=Math.floor(D*W),this.setViewport(0,0,S,D)},this.setEffects=function(S){if(M===dn){jt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(S){for(let D=0;D<S.length;D++)if(S[D].isOutputPass===!0){Nt("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}L.setEffects(S||[])},this.getCurrentViewport=function(S){return S.copy(J)},this.getViewport=function(S){return S.copy(It)},this.setViewport=function(S,D,W,k){S.isVector4?It.set(S.x,S.y,S.z,S.w):It.set(S,D,W,k),ft.viewport(J.copy(It).multiplyScalar(mn()).round())},this.getScissor=function(S){return S.copy(ne)},this.setScissor=function(S,D,W,k){S.isVector4?ne.set(S.x,S.y,S.z,S.w):ne.set(S,D,W,k),ft.scissor(dt.copy(ne).multiplyScalar(mn()).round())},this.getScissorTest=function(){return oe},this.setScissorTest=function(S){ft.setScissorTest(oe=S)},this.setOpaqueSort=function(S){kt=S},this.setTransparentSort=function(S){Me=S},this.getClearColor=function(S){return S.copy(P.getClearColor())},this.setClearColor=function(){P.setClearColor(...arguments)},this.getClearAlpha=function(){return P.getClearAlpha()},this.setClearAlpha=function(){P.setClearAlpha(...arguments)},this.clear=function(S=!0,D=!0,W=!0){let k=0;if(S){let G=!1;if(et!==null){const ut=et.texture.format;G=d.has(ut)}if(G){const ut=et.texture.type,vt=u.has(ut),ct=P.getClearColor(),xt=P.getClearAlpha(),Et=ct.r,zt=ct.g,Kt=ct.b;vt?(v[0]=Et,v[1]=zt,v[2]=Kt,v[3]=xt,O.clearBufferuiv(O.COLOR,0,v)):(b[0]=Et,b[1]=zt,b[2]=Kt,b[3]=xt,O.clearBufferiv(O.COLOR,0,b))}else k|=O.COLOR_BUFFER_BIT}D&&(k|=O.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),W&&(k|=O.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),k!==0&&O.clear(k)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(S){S.setRenderer(this),F=S},this.dispose=function(){e.removeEventListener("webglcontextlost",Rt,!1),e.removeEventListener("webglcontextrestored",Ht,!1),e.removeEventListener("webglcontextcreationerror",pt,!1),P.dispose(),ht.dispose(),q.dispose(),Ft.dispose(),Pt.dispose(),A.dispose(),nt.dispose(),B.dispose(),at.dispose(),bt.dispose(),j.dispose(),it.dispose(),it.removeEventListener("sessionstart",zl),it.removeEventListener("sessionend",kl),Ci.stop()};function Rt(S){S.preventDefault(),na("WebGLRenderer: Context Lost."),I=!0}function Ht(){na("WebGLRenderer: Context Restored."),I=!1;const S=be.autoReset,D=ot.enabled,W=ot.autoUpdate,k=ot.needsUpdate,G=ot.type;Vt(),be.autoReset=S,ot.enabled=D,ot.autoUpdate=W,ot.needsUpdate=k,ot.type=G}function pt(S){jt("WebGLRenderer: A WebGL context could not be created. Reason: ",S.statusMessage)}function ie(S){const D=S.target;D.removeEventListener("dispose",ie),Le(D)}function Le(S){ri(S),Pt.remove(S)}function ri(S){const D=Pt.get(S).programs;D!==void 0&&(D.forEach(function(W){j.releaseProgram(W)}),S.isShaderMaterial&&j.releaseShaderCache(S))}this.renderBufferDirect=function(S,D,W,k,G,ut){D===null&&(D=fn);const vt=G.isMesh&&G.matrixWorld.determinantAffine()<0,ct=Vu(S,D,W,k,G);ft.setMaterial(k,vt);let xt=W.index,Et=1;if(k.wireframe===!0){if(xt=B.getWireframeAttribute(W),xt===void 0)return;Et=2}const zt=W.drawRange,Kt=W.attributes.position;let St=zt.start*Et,Zt=(zt.start+zt.count)*Et;ut!==null&&(St=Math.max(St,ut.start*Et),Zt=Math.min(Zt,(ut.start+ut.count)*Et)),xt!==null?(St=Math.max(St,0),Zt=Math.min(Zt,xt.count)):Kt!=null&&(St=Math.max(St,0),Zt=Math.min(Zt,Kt.count));const Se=Zt-St;if(Se<0||Se===1/0)return;at.setup(G,k,ct,W,xt);let he,le=Y;if(xt!==null&&(he=x.get(xt),le=lt,le.setIndex(he)),G.isMesh)k.wireframe===!0?(ft.setLineWidth(k.wireframeLinewidth*mn()),le.setMode(O.LINES)):le.setMode(O.TRIANGLES);else if(G.isLine){let ke=k.linewidth;ke===void 0&&(ke=1),ft.setLineWidth(ke*mn()),G.isLineSegments?le.setMode(O.LINES):G.isLineLoop?le.setMode(O.LINE_LOOP):le.setMode(O.LINE_STRIP)}else G.isPoints?le.setMode(O.POINTS):G.isSprite&&le.setMode(O.TRIANGLES);if(G.isBatchedMesh)if(de.get("WEBGL_multi_draw"))le.renderMultiDraw(G._multiDrawStarts,G._multiDrawCounts,G._multiDrawCount);else{const ke=G._multiDrawStarts,yt=G._multiDrawCounts,Xe=G._multiDrawCount,te=xt?x.get(xt).bytesPerElement:1,Pi=Pt.get(k).currentProgram.getUniforms();for(let Be=0;Be<Xe;Be++)Pi.setValue(O,"_gl_DrawID",Be),le.render(ke[Be]/te,yt[Be])}else if(G.isInstancedMesh)le.renderInstances(St,Se,G.count);else if(W.isInstancedBufferGeometry){const ke=W._maxInstanceCount!==void 0?W._maxInstanceCount:1/0,yt=Math.min(W.instanceCount,ke);le.renderInstances(St,Se,yt)}else le.render(St,Se)};function Ol(S,D,W,k){F!==null&&S.isNodeMaterial&&F.setObject(k,S),Ee===!0&&Z.setState(S,W,!1),S.transparent===!0&&S.side===jn&&S.forceSinglePass===!1?(S.side=sn,S.needsUpdate=!0,Ls(S,D,k),S.side=Hi,S.needsUpdate=!0,Ls(S,D,k),S.side=jn):Ls(S,D,k)}this.compile=function(S,D,W=null){W===null&&(W=S),F!==null&&F.renderStart(S,D,W),T=q.get(W),T.init(D),E.push(T),W.traverseVisible(function(G){G.isLight&&G.layers.test(D.layers)&&(T.pushLight(G),G.castShadow&&T.pushShadow(G))}),S!==W&&S.traverseVisible(function(G){G.isLight&&G.layers.test(D.layers)&&(T.pushLight(G),G.castShadow&&T.pushShadow(G))}),T.setupLights(),F!==null&&F.updateLights(T.state.lightsArray),Qe=this.localClippingEnabled,Ee=Z.init(this.clippingPlanes,Qe),Ee===!0&&Z.setGlobalState(this.clippingPlanes,D),F!==null&&ot.render(T.state.shadowsArray,W,D);const k=new Set;return S.traverse(function(G){if(!(G.isMesh||G.isPoints||G.isLine||G.isSprite))return;const ut=G.material;if(ut)if(Array.isArray(ut))for(let vt=0;vt<ut.length;vt++){const ct=ut[vt];Ol(ct,W,D,G),k.add(ct)}else Ol(ut,W,D,G),k.add(ut)}),T=E.pop(),F!==null&&F.renderEnd(),k},this.compileAsync=function(S,D,W=null){const k=this.compile(S,D,W);return new Promise(G=>{function ut(){if(k.forEach(function(vt){const xt=Pt.get(vt).currentProgram;(xt===void 0||xt.isReady())&&k.delete(vt)}),k.size===0){G(S);return}setTimeout(ut,10)}de.get("KHR_parallel_shader_compile")!==null?ut():setTimeout(ut,10)})};let ya=null;function Gu(S){ya&&ya(S)}function zl(){Ci.stop()}function kl(){Ci.start()}const Ci=new ou;Ci.setAnimationLoop(Gu),typeof self<"u"&&Ci.setContext(self),this.setAnimationLoop=function(S){ya=S,it.setAnimationLoop(S),S===null?Ci.stop():Ci.start()},it.addEventListener("sessionstart",zl),it.addEventListener("sessionend",kl),this.render=function(S,D){if(D!==void 0&&D.isCamera!==!0){jt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(I===!0)return;F!==null&&F.renderStart(S,D);const W=it.enabled===!0&&it.isPresenting===!0,k=L!==null&&(et===null||W)&&L.begin(R,et);if(S.matrixWorldAutoUpdate===!0&&S.updateMatrixWorld(),D.parent===null&&D.matrixWorldAutoUpdate===!0&&D.updateMatrixWorld(),it.enabled===!0&&it.isPresenting===!0&&(L===null||L.isCompositing()===!1)&&(it.cameraAutoUpdate===!0&&it.updateCamera(D),D=it.getCamera()),S.isScene===!0&&S.onBeforeRender(R,S,D,et),T=q.get(S,E.length),T.init(D),T.state.textureUnits=Ft.getTextureUnits(),E.push(T),me.multiplyMatrices(D.projectionMatrix,D.matrixWorldInverse),D.isArrayCamera?Ue.setFromArrayCamera(D):qt.setFromProjectionMatrix(me,An,D.reversedDepth),Qe=this.localClippingEnabled,Ee=Z.init(this.clippingPlanes,Qe),w=ht.get(S,_.length),w.init(),_.push(w),this.info.render.frame++,it.enabled===!0&&it.isPresenting===!0){const vt=R.xr.getDepthSensingMesh();vt!==null&&Ea(vt,D,-1/0,R.sortObjects)}Ea(S,D,0,R.sortObjects),w.finish(),F!==null&&F.updateLights(T.state.lightsArray),R.sortObjects===!0&&w.sort(kt,Me),pn=it.enabled===!1||it.isPresenting===!1||it.hasDepthSensing()===!1,pn&&P.addToRenderList(w,S),this.info.autoReset===!0&&this.info.reset(),Ee===!0&&Z.beginShadows();const G=T.state.shadowsArray;if(ot.render(G,S,D),Ee===!0&&Z.endShadows(),(k&&L.hasRenderPass())===!1){const vt=w.opaque,ct=w.transmissive;if(T.setupLights(),D.isArrayCamera){const xt=D.cameras;if(ct.length>0)for(let Et=0,zt=xt.length;Et<zt;Et++){const Kt=xt[Et];Gl(vt,ct,S,Kt)}pn&&P.render(S);for(let Et=0,zt=xt.length;Et<zt;Et++){const Kt=xt[Et];Bl(w,S,Kt,Kt.viewport)}}else ct.length>0&&Gl(vt,ct,S,D),pn&&P.render(S),Bl(w,S,D)}et!==null&&V===0&&(Ft.updateMultisampleRenderTarget(et),Ft.updateRenderTargetMipmap(et)),k&&L.end(R),S.isScene===!0&&S.onAfterRender(R,S,D),at.resetDefaultState(),U=-1,X=null,E.pop(),E.length>0?(T=E[E.length-1],Ft.setTextureUnits(T.state.textureUnits),Ee===!0&&Z.setGlobalState(R.clippingPlanes,T.state.camera)):T=null,_.pop(),_.length>0?w=_[_.length-1]:w=null,F!==null&&F.renderEnd()};function Ea(S,D,W,k){if(S.visible===!1)return;if(S.layers.test(D.layers)){if(S.isGroup)W=S.renderOrder;else if(S.isLOD)S.autoUpdate===!0&&S.update(D);else if(S.isLight)T.pushLight(S),S.castShadow&&T.pushShadow(S);else if(S.isSprite){const vt=D.isArrayCamera?Ue:qt;if(!S.frustumCulled||S.intersectsFrustum(vt)){k&&Pe.setFromMatrixPosition(S.matrixWorld).applyMatrix4(me);const ct=nt.update(S),xt=S.material;xt.visible&&w.push(S,ct,xt,W,Pe.z,null,D)}}else if(S.isMesh||S.isLine||S.isPoints){const vt=D.isArrayCamera?Ue:qt;if(!S.frustumCulled||S.intersectsFrustum(vt)){const ct=nt.update(S),xt=S.material;if(k&&(S.boundingSphere!==void 0?(S.boundingSphere===null&&S.computeBoundingSphere(),Pe.copy(S.boundingSphere.center)):(ct.boundingSphere===null&&ct.computeBoundingSphere(),Pe.copy(ct.boundingSphere.center)),Pe.applyMatrix4(S.matrixWorld).applyMatrix4(me)),Array.isArray(xt)){const Et=ct.groups;for(let zt=0,Kt=Et.length;zt<Kt;zt++){const St=Et[zt],Zt=xt[St.materialIndex];Zt&&Zt.visible&&w.push(S,ct,Zt,W,Pe.z,St,D)}}else xt.visible&&w.push(S,ct,xt,W,Pe.z,null,D)}}}const ut=S.children;for(let vt=0,ct=ut.length;vt<ct;vt++)Ea(ut[vt],D,W,k)}function Bl(S,D,W,k){const{opaque:G,transmissive:ut,transparent:vt}=S;T.setupLightsView(W),Ee===!0&&Z.setGlobalState(R.clippingPlanes,W),k&&ft.viewport(J.copy(k)),G.length>0&&ur(G,D,W),ut.length>0&&ur(ut,D,W),vt.length>0&&ur(vt,D,W),ft.buffers.depth.setTest(!0),ft.buffers.depth.setMask(!0),ft.buffers.color.setMask(!0),ft.setPolygonOffset(!1)}function Gl(S,D,W,k){if((W.isScene===!0?W.overrideMaterial:null)!==null)return;if(T.state.transmissionRenderTarget[k.id]===void 0){const St=de.has("EXT_color_buffer_half_float")||de.has("EXT_color_buffer_float");T.state.transmissionRenderTarget[k.id]=new Gn(1,1,{generateMipmaps:!0,type:St?Wn:dn,minFilter:gi,samples:Math.max(4,fe.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:Jt.workingColorSpace})}const ut=T.state.transmissionRenderTarget[k.id],vt=k.viewport||J;ut.setSize(vt.z*R.transmissionResolutionScale,vt.w*R.transmissionResolutionScale);const ct=R.getRenderTarget(),xt=R.getActiveCubeFace(),Et=R.getActiveMipmapLevel();R.setRenderTarget(ut),R.getClearColor(K),gt=R.getClearAlpha(),gt<1&&R.setClearColor(16777215,.5),R.clear(),pn&&P.render(W);const zt=R.toneMapping;R.toneMapping=ni;const Kt=k.viewport;if(k.viewport!==void 0&&(k.viewport=void 0),T.setupLightsView(k),Ee===!0&&Z.setGlobalState(R.clippingPlanes,k),ur(S,W,k),Ft.updateMultisampleRenderTarget(ut),Ft.updateRenderTargetMipmap(ut),de.has("WEBGL_multisampled_render_to_texture")===!1){let St=!1;for(let Zt=0,Se=D.length;Zt<Se;Zt++){const he=D[Zt],{object:le,geometry:ke,material:yt,group:Xe}=he;if(yt.side===jn&&le.layers.test(k.layers)){const te=yt.side;yt.side=sn,yt.needsUpdate=!0,Hl(le,W,k,ke,yt,Xe),yt.side=te,yt.needsUpdate=!0,St=!0}}St===!0&&(Ft.updateMultisampleRenderTarget(ut),Ft.updateRenderTargetMipmap(ut))}R.setRenderTarget(ct,xt,Et),R.setClearColor(K,gt),Kt!==void 0&&(k.viewport=Kt),R.toneMapping=zt}function ur(S,D,W){const k=D.isScene===!0?D.overrideMaterial:null;for(let G=0,ut=S.length;G<ut;G++){const vt=S[G],{object:ct,geometry:xt,group:Et}=vt;let zt=vt.material;zt.allowOverride===!0&&k!==null&&(zt=k),ct.layers.test(W.layers)&&Hl(ct,D,W,xt,zt,Et)}}function Hl(S,D,W,k,G,ut){F!==null&&G.isNodeMaterial&&F.setObject(S,G),S.onBeforeRender(R,D,W,k,G,ut),S.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,S.matrixWorld),S.normalMatrix.getNormalMatrix(S.modelViewMatrix),G.onBeforeRender(R,D,W,k,S,ut),G.transparent===!0&&G.side===jn&&G.forceSinglePass===!1?(G.side=sn,G.needsUpdate=!0,R.renderBufferDirect(W,D,k,G,S,ut),G.side=Hi,G.needsUpdate=!0,R.renderBufferDirect(W,D,k,G,S,ut),G.side=jn):R.renderBufferDirect(W,D,k,G,S,ut),S.onAfterRender(R,D,W,k,G,ut)}function Vl(S){let D=0;for(const W of S)W.texture!==null&&D++;return D}function Ls(S,D,W){D.isScene!==!0&&(D=fn);const k=Pt.get(S),G=T.state.lights,ut=T.state.shadowsArray,vt=G.state.version,ct=j.getParameters(S,G.state,ut,D,W,T.state.lightProbeGridArray),xt=j.getProgramCacheKey(ct);let Et=k.programs;k.environment=S.isMeshStandardMaterial||S.isMeshLambertMaterial||S.isMeshPhongMaterial?D.environment:null,k.fog=D.fog;const zt=S.isMeshStandardMaterial||S.isMeshLambertMaterial&&!S.envMap||S.isMeshPhongMaterial&&!S.envMap;k.envMap=A.get(S.envMap||k.environment,zt),k.envMapRotation=k.environment!==null&&S.envMap===null?D.environmentRotation:S.envMapRotation,Et===void 0&&(S.addEventListener("dispose",ie),Et=new Map,k.programs=Et,k.programVariants=new Map);let Kt=Et.get(xt);if(Kt!==void 0){if(k.currentProgram===Kt&&k.lightsStateVersion===vt)return Xl(S,ct),Kt}else ct.uniforms=j.getUniforms(S),F!==null&&S.isNodeMaterial&&F.build(S,W,ct),S.onBeforeCompile(ct,R),Kt=j.acquireProgram(ct,xt),Et.set(xt,Kt),k.uniforms=ct.uniforms;const St=k.uniforms;return(!S.isShaderMaterial&&!S.isRawShaderMaterial||S.clipping===!0)&&(St.clippingPlanes=Z.uniform),Xl(S,ct),k.needsLights=Xu(S),k.lightsStateVersion=vt,k.needsLights&&(St.ambientLightColor.value=G.state.ambient,St.lightProbe.value=G.state.probe,St.sunLights.value=G.state.sun,St.sunLightShadows.value=G.state.sunShadow,St.directionalLights.value=G.state.directional,St.directionalLightShadows.value=G.state.directionalShadow,St.spotLights.value=G.state.spot,St.spotLightShadows.value=G.state.spotShadow,St.rectAreaLights.value=G.state.rectArea,St.ltc_1.value=G.state.rectAreaLTC1,St.ltc_2.value=G.state.rectAreaLTC2,St.pointLights.value=G.state.point,St.pointLightShadows.value=G.state.pointShadow,St.hemisphereLights.value=G.state.hemi,St.sunShadowMatrix.value=G.state.sunShadowMatrix,St.sunShadowCascade.value=G.state.sunShadowCascade,St.directionalShadowMatrix.value=G.state.directionalShadowMatrix,St.spotLightMatrix.value=G.state.spotLightMatrix,St.spotLightMap.value=G.state.spotLightMap,St.pointShadowMatrix.value=G.state.pointShadowMatrix),k.numLightProbeGrids=Vl(T.state.lightProbeGridArray),k.currentProgram=Kt,k.uniformsList=null,Kt}function Hu(S,D,W,k,G){const ut=Pt.get(S),vt=ut.currentProgram.id+","+k+","+G;let ct=ut.programVariants.get(vt);return ct===void 0?(ct=Ls(S,D,W),ut.programVariants.set(vt,ct)):(ut.currentProgram=ct,ut.uniformsList=null,ut.outputColorSpace=k,ut.toneMapping=G),ct}function Wl(S){if(S.uniformsList===null){const D=S.currentProgram.getUniforms();S.uniformsList=Kr.seqWithValue(D.seq,S.uniforms)}return S.uniformsList}function Xl(S,D){const W=Pt.get(S);W.outputColorSpace=D.outputColorSpace,W.batching=D.batching,W.batchingColor=D.batchingColor,W.instancing=D.instancing,W.instancingColor=D.instancingColor,W.instancingMorph=D.instancingMorph,W.skinning=D.skinning,W.morphTargets=D.morphTargets,W.morphNormals=D.morphNormals,W.morphColors=D.morphColors,W.morphTargetsCount=D.morphTargetsCount,W.numClippingPlanes=D.numClippingPlanes,W.numIntersection=D.numClipIntersection,W.vertexAlphas=D.vertexAlphas,W.vertexTangents=D.vertexTangents,W.toneMapping=D.toneMapping}function Vu(S,D,W,k,G){D.isScene!==!0&&(D=fn),Ft.resetTextureUnits();const ut=D.fog,vt=k.isMeshStandardMaterial||k.isMeshLambertMaterial||k.isMeshPhongMaterial?D.environment:null,ct=et===null?R.outputColorSpace:et.isXRRenderTarget===!0?et.texture.colorSpace:Jt.workingColorSpace,xt=k.isMeshStandardMaterial||k.isMeshLambertMaterial&&!k.envMap||k.isMeshPhongMaterial&&!k.envMap,Et=A.get(k.envMap||vt,xt),zt=k.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,Kt=!!W.attributes.tangent&&(!!k.normalMap||k.anisotropy>0),St=!!W.morphAttributes.position,Zt=!!W.morphAttributes.normal,Se=!!W.morphAttributes.color;let he=ni;k.toneMapped&&(et===null||et.isXRRenderTarget===!0)&&(he=R.toneMapping);const le=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,ke=le!==void 0?le.length:0,yt=Pt.get(k),Xe=T.state.lights;if(Ee===!0&&(Qe===!0||S!==X)){const ge=S===X&&k.id===U;Z.setState(k,S,ge)}let te=!1,Pi=!1;k.version===yt.__version?yt.needsLights&&yt.lightsStateVersion!==Xe.state.version||G.isBatchedMesh&&yt.batching===!1||!G.isBatchedMesh&&yt.batching===!0||G.isBatchedMesh&&yt.batchingColor===!0&&G._colorsTexture===null||G.isBatchedMesh&&yt.batchingColor===!1&&G._colorsTexture!==null||G.isInstancedMesh&&yt.instancing===!1||!G.isInstancedMesh&&yt.instancing===!0||G.isSkinnedMesh&&yt.skinning===!1||!G.isSkinnedMesh&&yt.skinning===!0||G.isInstancedMesh&&yt.instancingColor===!0&&G.instanceColor===null||G.isInstancedMesh&&yt.instancingColor===!1&&G.instanceColor!==null||G.isInstancedMesh&&yt.instancingMorph===!0&&G.morphTexture===null||G.isInstancedMesh&&yt.instancingMorph===!1&&G.morphTexture!==null||yt.envMap!==Et||k.fog===!0&&yt.fog!==ut||yt.numClippingPlanes!==void 0&&(yt.numClippingPlanes!==Z.numPlanes||yt.numIntersection!==Z.numIntersection)||yt.vertexAlphas!==zt||yt.vertexTangents!==Kt||yt.morphTargets!==St||yt.morphNormals!==Zt||yt.morphColors!==Se||yt.morphTargetsCount!==ke||yt.numLightProbeGrids!==Vl(T.state.lightProbeGridArray)?te=!0:(yt.outputColorSpace!==ct||yt.toneMapping!==he)&&(Pi=!0):(te=!0,yt.__version=k.version);let Be=yt.currentProgram;(te===!0||Pi===!0)&&(Be=Pi===!0?Hu(k,D,G,ct,he):Ls(k,D,G),F&&k.isNodeMaterial&&F.onUpdateProgram(k,Be,yt));let dr=!1,ai=!1,Li=!1;const Qt=Be.getUniforms(),Fe=yt.uniforms;if(ft.useProgram(Be.program)&&(dr=!0,ai=!0,Li=!0),k.id!==U&&(U=k.id,ai=!0),dr||X!==S){ft.buffers.depth.getReversed()&&S.reversedDepth!==!0&&(S._reversedDepth=!0,S.updateProjectionMatrix()),Qt.setValue(O,"projectionMatrix",S.projectionMatrix),Qt.setValue(O,"viewMatrix",S.matrixWorldInverse);const De=Qt.map.cameraPosition;De!==void 0&&De.setValue(O,Pn.setFromMatrixPosition(S.matrixWorld)),fe.logarithmicDepthBuffer&&Qt.setValue(O,"logDepthBufFC",2/(Math.log(S.far+1)/Math.LN2)),(k.isMeshPhongMaterial||k.isMeshToonMaterial||k.isMeshLambertMaterial||k.isMeshBasicMaterial||k.isMeshStandardMaterial||k.isShaderMaterial)&&Qt.setValue(O,"isOrthographic",S.isOrthographicCamera===!0),X!==S&&(X=S,ai=!0,Li=!0)}if(yt.needsLights&&(Xe.state.sunShadowMap.length>0&&Qt.setValue(O,"sunShadowMap",Xe.state.sunShadowMap,Ft),Xe.state.directionalShadowMap.length>0&&Qt.setValue(O,"directionalShadowMap",Xe.state.directionalShadowMap,Ft),Xe.state.spotShadowMap.length>0&&Qt.setValue(O,"spotShadowMap",Xe.state.spotShadowMap,Ft),Xe.state.pointShadowMap.length>0&&Qt.setValue(O,"pointShadowMap",Xe.state.pointShadowMap,Ft)),G.isSkinnedMesh){Qt.setOptional(O,G,"bindMatrix"),Qt.setOptional(O,G,"bindMatrixInverse");const ge=G.skeleton;ge&&(ge.boneTexture===null&&ge.computeBoneTexture(),Qt.setValue(O,"boneTexture",ge.boneTexture,Ft))}G.isBatchedMesh&&(Qt.setOptional(O,G,"batchingTexture"),Qt.setValue(O,"batchingTexture",G._matricesTexture,Ft),Qt.setOptional(O,G,"batchingIdTexture"),Qt.setValue(O,"batchingIdTexture",G._indirectTexture,Ft),Qt.setOptional(O,G,"batchingColorTexture"),G._colorsTexture!==null&&Qt.setValue(O,"batchingColorTexture",G._colorsTexture,Ft));const yn=W.morphAttributes;if((yn.position!==void 0||yn.normal!==void 0||yn.color!==void 0)&&Q.update(G,W,Be),(ai||yt.receiveShadow!==G.receiveShadow)&&(yt.receiveShadow=G.receiveShadow,Qt.setValue(O,"receiveShadow",G.receiveShadow)),(k.isMeshStandardMaterial||k.isMeshLambertMaterial||k.isMeshPhongMaterial)&&k.envMap===null&&D.environment!==null&&(Fe.envMapIntensity.value=D.environmentIntensity),Fe.dfgLUT!==void 0&&(Fe.dfgLUT.value=b_()),ai){if(Qt.setValue(O,"toneMappingExposure",R.toneMappingExposure),yt.needsLights&&Wu(Fe,Li),ut&&k.fog===!0&&rt.refreshFogUniforms(Fe,ut),rt.refreshMaterialUniforms(Fe,k,_t,Ct,T.state.transmissionRenderTarget[S.id]),yt.needsLights&&yt.numLightProbeGrids>0){const ge=y;let De=0;for(const Xn of T.state.lightProbeGridArray)Xn.texture!==null&&(ge.textures[De]=Xn.texture,ge.min[De]=Xn.boundingBox.min,ge.max[De]=Xn.boundingBox.max,ge.resolution[De]=Xn.resolution,De++);for(const Xn in ge)ge[Xn].length=De;Fe.probesSH.value=ge.textures,Fe.probesMin.value=ge.min,Fe.probesMax.value=ge.max,Fe.probesResolution.value=ge.resolution}Kr.upload(O,Wl(yt),Fe,Ft)}if(k.isShaderMaterial&&k.uniformsNeedUpdate===!0&&(Kr.upload(O,Wl(yt),Fe,Ft),k.uniformsNeedUpdate=!1),k.isSpriteMaterial&&Qt.setValue(O,"center",G.center),Qt.setValue(O,"modelViewMatrix",G.modelViewMatrix),Qt.setValue(O,"normalMatrix",G.normalMatrix),Qt.setValue(O,"modelMatrix",G.matrixWorld),k.uniformsGroups!==void 0){const ge=k.uniformsGroups;for(let De=0,Xn=ge.length;De<Xn;De++){const Yl=ge[De];bt.update(Yl,Be),bt.bind(Yl,Be)}}return Be}function Wu(S,D){S.ambientLightColor.needsUpdate=D,S.lightProbe.needsUpdate=D,S.sunLights.needsUpdate=D,S.sunLightShadows.needsUpdate=D,S.directionalLights.needsUpdate=D,S.directionalLightShadows.needsUpdate=D,S.pointLights.needsUpdate=D,S.pointLightShadows.needsUpdate=D,S.spotLights.needsUpdate=D,S.spotLightShadows.needsUpdate=D,S.rectAreaLights.needsUpdate=D,S.hemisphereLights.needsUpdate=D}function Xu(S){return S.isMeshLambertMaterial||S.isMeshToonMaterial||S.isMeshPhongMaterial||S.isMeshStandardMaterial||S.isShadowMaterial||S.isShaderMaterial&&S.lights===!0}this.getActiveCubeFace=function(){return $},this.getActiveMipmapLevel=function(){return V},this.getRenderTarget=function(){return et},this.setRenderTargetTextures=function(S,D,W){const k=Pt.get(S);k.__autoAllocateDepthBuffer=S.resolveDepthBuffer===!1,k.__autoAllocateDepthBuffer===!1&&(k.__useRenderToTexture=!1),Pt.get(S.texture).__webglTexture=D,Pt.get(S.depthTexture).__webglTexture=k.__autoAllocateDepthBuffer?void 0:W,k.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(S,D){const W=Pt.get(S);W.__webglFramebuffer=D,W.__useDefaultFramebuffer=D===void 0},this.setRenderTarget=function(S,D=0,W=0){et=S,$=D,V=W;let k=null,G=!1,ut=!1;if(S){const ct=Pt.get(S);if(ct.__useDefaultFramebuffer!==void 0){ft.bindFramebuffer(O.FRAMEBUFFER,ct.__webglFramebuffer),J.copy(S.viewport),dt.copy(S.scissor),Tt=S.scissorTest,ft.viewport(J),ft.scissor(dt),ft.setScissorTest(Tt),U=-1;return}else if(ct.__webglFramebuffer===void 0)Ft.setupRenderTarget(S);else if(ct.__hasExternalTextures)Ft.rebindTextures(S,Pt.get(S.texture).__webglTexture,Pt.get(S.depthTexture).__webglTexture);else if(S.depthBuffer){const zt=S.depthTexture;if(ct.__boundDepthTexture!==zt){if(zt!==null&&Pt.has(zt)&&(S.width!==zt.image.width||S.height!==zt.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");Ft.setupDepthRenderbuffer(S)}}const xt=S.texture;(xt.isData3DTexture||xt.isDataArrayTexture||xt.isCompressedArrayTexture)&&(ut=!0);const Et=Pt.get(S).__webglFramebuffer;S.isWebGLCubeRenderTarget?(Array.isArray(Et[D])?k=Et[D][W]:k=Et[D],G=!0):S.samples>0&&Ft.useMultisampledRTT(S)===!1?k=Pt.get(S).__webglMultisampledFramebuffer:Array.isArray(Et)?k=Et[W]:k=Et,J.copy(S.viewport),dt.copy(S.scissor),Tt=S.scissorTest}else J.copy(It).multiplyScalar(_t).floor(),dt.copy(ne).multiplyScalar(_t).floor(),Tt=oe;if(W!==0&&(k=z),ft.bindFramebuffer(O.FRAMEBUFFER,k)&&ft.drawBuffers(S,k),ft.viewport(J),ft.scissor(dt),ft.setScissorTest(Tt),G){const ct=Pt.get(S.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_CUBE_MAP_POSITIVE_X+D,ct.__webglTexture,W)}else if(ut){const ct=D;for(let xt=0;xt<S.textures.length;xt++){const Et=Pt.get(S.textures[xt]);O.framebufferTextureLayer(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0+xt,Et.__webglTexture,W,ct)}}else if(S!==null&&W!==0){const ct=Pt.get(S.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,ct.__webglTexture,W)}U=-1};function $l(S){const D=Pt.get(S);return(D.__readFormat!==S.format||D.__readType!==S.type)&&(D.__readFormat=S.format,D.__readType=S.type,D.__formatReadable=fe.textureFormatReadable(S.format),D.__typeReadable=fe.textureTypeReadable(S.type)),D}this.readRenderTargetPixels=function(S,D,W,k,G,ut,vt,ct=0){if(!(S&&S.isWebGLRenderTarget)){jt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let xt=Pt.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&vt!==void 0&&(xt=xt[vt],Array.isArray(xt)&&(xt=xt[0])),xt){ft.bindFramebuffer(O.FRAMEBUFFER,xt);try{const Et=S.textures[ct],zt=Et.format,Kt=Et.type;S.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+ct);const St=$l(Et);if(St.__formatReadable===!1){jt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(St.__typeReadable===!1){jt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}D>=0&&D<=S.width-k&&W>=0&&W<=S.height-G&&O.readPixels(D,W,k,G,st.convert(zt),st.convert(Kt),ut)}finally{const Et=et!==null?Pt.get(et).__webglFramebuffer:null;ft.bindFramebuffer(O.FRAMEBUFFER,Et)}}},this.readRenderTargetPixelsAsync=async function(S,D,W,k,G,ut,vt,ct=0){if(!(S&&S.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let xt=Pt.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&vt!==void 0&&(xt=xt[vt],Array.isArray(xt)&&(xt=xt[0])),xt)if(D>=0&&D<=S.width-k&&W>=0&&W<=S.height-G){ft.bindFramebuffer(O.FRAMEBUFFER,xt);const Et=S.textures[ct],zt=Et.format,Kt=Et.type;S.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+ct);const St=$l(Et);if(St.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(St.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Zt=O.createBuffer();O.bindBuffer(O.PIXEL_PACK_BUFFER,Zt),O.bufferData(O.PIXEL_PACK_BUFFER,ut.byteLength,O.STREAM_READ),O.readPixels(D,W,k,G,st.convert(zt),st.convert(Kt),0),O.bindBuffer(O.PIXEL_PACK_BUFFER,null);const Se=et!==null?Pt.get(et).__webglFramebuffer:null;ft.bindFramebuffer(O.FRAMEBUFFER,Se);const he=O.fenceSync(O.SYNC_GPU_COMMANDS_COMPLETE,0);return O.flush(),await wd(O,he,4),O.bindBuffer(O.PIXEL_PACK_BUFFER,Zt),O.getBufferSubData(O.PIXEL_PACK_BUFFER,0,ut),O.bindBuffer(O.PIXEL_PACK_BUFFER,null),O.deleteBuffer(Zt),O.deleteSync(he),ut}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(S,D=null,W=0){const k=Math.pow(2,-W),G=Math.floor(S.image.width*k),ut=Math.floor(S.image.height*k),vt=D!==null?D.x:0,ct=D!==null?D.y:0;Ft.setTexture2D(S,0),O.copyTexSubImage2D(O.TEXTURE_2D,W,0,0,vt,ct,G,ut),ft.unbindTexture()},this.copyTextureToTexture=function(S,D,W=null,k=null,G=0,ut=0){let vt,ct,xt,Et,zt,Kt,St,Zt,Se;const he=S.isCompressedTexture?S.mipmaps[ut]:S.image;if(W!==null)vt=W.max.x-W.min.x,ct=W.max.y-W.min.y,xt=W.isBox3?W.max.z-W.min.z:1,Et=W.min.x,zt=W.min.y,Kt=W.isBox3?W.min.z:0;else{const Qt=Math.pow(2,-G);vt=Math.floor(he.width*Qt),ct=Math.floor(he.height*Qt),S.isDataArrayTexture?xt=he.depth:S.isData3DTexture?xt=Math.floor(he.depth*Qt):xt=1,Et=0,zt=0,Kt=0}k!==null?(St=k.x,Zt=k.y,Se=k.z):(St=0,Zt=0,Se=0);const le=st.convert(D.format),ke=st.convert(D.type);let yt;D.isData3DTexture?(Ft.setTexture3D(D,0),yt=O.TEXTURE_3D):D.isDataArrayTexture||D.isCompressedArrayTexture?(Ft.setTexture2DArray(D,0),yt=O.TEXTURE_2D_ARRAY):(Ft.setTexture2D(D,0),yt=O.TEXTURE_2D),ft.activeTexture(O.TEXTURE0),ft.pixelStorei(O.UNPACK_FLIP_Y_WEBGL,D.flipY),ft.pixelStorei(O.UNPACK_PREMULTIPLY_ALPHA_WEBGL,D.premultiplyAlpha),ft.pixelStorei(O.UNPACK_ALIGNMENT,D.unpackAlignment);const Xe=ft.getParameter(O.UNPACK_ROW_LENGTH),te=ft.getParameter(O.UNPACK_IMAGE_HEIGHT),Pi=ft.getParameter(O.UNPACK_SKIP_PIXELS),Be=ft.getParameter(O.UNPACK_SKIP_ROWS),dr=ft.getParameter(O.UNPACK_SKIP_IMAGES);ft.pixelStorei(O.UNPACK_ROW_LENGTH,he.width),ft.pixelStorei(O.UNPACK_IMAGE_HEIGHT,he.height),ft.pixelStorei(O.UNPACK_SKIP_PIXELS,Et),ft.pixelStorei(O.UNPACK_SKIP_ROWS,zt),ft.pixelStorei(O.UNPACK_SKIP_IMAGES,Kt);const ai=S.isDataArrayTexture||S.isData3DTexture,Li=D.isDataArrayTexture||D.isData3DTexture;if(S.isDepthTexture){const Qt=Pt.get(S),Fe=Pt.get(D),yn=Pt.get(Qt.__renderTarget),ge=Pt.get(Fe.__renderTarget);ft.bindFramebuffer(O.READ_FRAMEBUFFER,yn.__webglFramebuffer),ft.bindFramebuffer(O.DRAW_FRAMEBUFFER,ge.__webglFramebuffer);for(let De=0;De<xt;De++)ai&&(O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Pt.get(S).__webglTexture,G,Kt+De),O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Pt.get(D).__webglTexture,ut,Se+De)),O.blitFramebuffer(Et,zt,Et+vt,zt+ct,St,Zt,St+vt,Zt+ct,O.DEPTH_BUFFER_BIT,O.NEAREST);ft.bindFramebuffer(O.READ_FRAMEBUFFER,null),ft.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else if(G!==0||S.isRenderTargetTexture||Pt.has(S)){const Qt=Pt.get(S),Fe=Pt.get(D);ft.bindFramebuffer(O.READ_FRAMEBUFFER,C),ft.bindFramebuffer(O.DRAW_FRAMEBUFFER,H);for(let yn=0;yn<xt;yn++)ai?O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Qt.__webglTexture,G,Kt+yn):O.framebufferTexture2D(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Qt.__webglTexture,G),Li?O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Fe.__webglTexture,ut,Se+yn):O.framebufferTexture2D(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Fe.__webglTexture,ut),G!==0?O.blitFramebuffer(Et,zt,Et+vt,zt+ct,St,Zt,St+vt,Zt+ct,O.COLOR_BUFFER_BIT,O.NEAREST):Li?O.copyTexSubImage3D(yt,ut,St,Zt,Se+yn,Et,zt,vt,ct):O.copyTexSubImage2D(yt,ut,St,Zt,Et,zt,vt,ct);ft.bindFramebuffer(O.READ_FRAMEBUFFER,null),ft.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else Li?S.isDataTexture||S.isData3DTexture?O.texSubImage3D(yt,ut,St,Zt,Se,vt,ct,xt,le,ke,he.data):D.isCompressedArrayTexture?O.compressedTexSubImage3D(yt,ut,St,Zt,Se,vt,ct,xt,le,he.data):O.texSubImage3D(yt,ut,St,Zt,Se,vt,ct,xt,le,ke,he):S.isDataTexture?O.texSubImage2D(O.TEXTURE_2D,ut,St,Zt,vt,ct,le,ke,he.data):S.isCompressedTexture?O.compressedTexSubImage2D(O.TEXTURE_2D,ut,St,Zt,he.width,he.height,le,he.data):O.texSubImage2D(O.TEXTURE_2D,ut,St,Zt,vt,ct,le,ke,he);ft.pixelStorei(O.UNPACK_ROW_LENGTH,Xe),ft.pixelStorei(O.UNPACK_IMAGE_HEIGHT,te),ft.pixelStorei(O.UNPACK_SKIP_PIXELS,Pi),ft.pixelStorei(O.UNPACK_SKIP_ROWS,Be),ft.pixelStorei(O.UNPACK_SKIP_IMAGES,dr),ut===0&&D.generateMipmaps===!0&&D.mipmapsAutoUpdate===!0&&O.generateMipmap(yt),ft.unbindTexture()},this.initRenderTarget=function(S){Pt.get(S).__webglFramebuffer===void 0&&Ft.setupRenderTarget(S)},this.initTexture=function(S){S.isCubeTexture?Ft.setTextureCube(S,0):S.isData3DTexture?Ft.setTexture3D(S,0):S.isDataArrayTexture||S.isCompressedArrayTexture?Ft.setTexture2DArray(S,0):Ft.setTexture2D(S,0),ft.unbindTexture()},this.resetState=function(){$=0,V=0,et=null,ft.reset(),at.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return An}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorSpace=Jt._getDrawingBufferColorSpace(t),e.unpackColorSpace=Jt._getUnpackColorSpace()}}const we=()=>Math.random().toString(36).slice(2,9),ce=(n,t,e)=>Math.min(e,Math.max(t,n)),Ut=Math.PI/180;function Ve(n,t=1){return n.toFixed(t).replace(".",",")}function vn(n){const t=Math.round(n*10)/10;return Number.isInteger(t)?String(t):t.toFixed(1)}function xu(n,t){const e=Math.round(n*t),i=Math.floor(e/t),s=e%t;return`${String(i).padStart(2,"0")}:${String(s).padStart(2,"0")}`}function bi(n){return n.replace(/[&<>"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[t])}const Qo=["A","B","C","D"],vu={A:"#ff6a45",B:"#33c3ff",C:"#ffd02e",D:"#c47bff"},T_=[14,18,24,35,50,85,135],w_=["16:9","9:16","2.39:1","1:1"],A_=[{id:"stand",gr:"Όρθιος"},{id:"sit",gr:"Καθιστός"},{id:"walk",gr:"Περπατάει"},{id:"run",gr:"Τρέχει"},{id:"kneel",gr:"Γονατιστός"}],R_=[{id:"linear",gr:"Γραμμικό"},{id:"in",gr:"Ease in"},{id:"out",gr:"Ease out"},{id:"inout",gr:"In-out"}],Mu=[{id:"box",gr:"Κουτί"},{id:"table",gr:"Τραπέζι"},{id:"chair",gr:"Καρέκλα"},{id:"door",gr:"Πόρτα"},{id:"wall",gr:"Τοίχος"},{id:"sofa",gr:"Καναπές"},{id:"bed",gr:"Κρεβάτι"},{id:"bar",gr:"Μπαρ"},{id:"car",gr:"Αυτοκίνητο"},{id:"mic",gr:"Μικρόφωνο"},{id:"tree",gr:"Δέντρο"},{id:"column",gr:"Κολόνα"}];function Su(){const e=[-90,-45,0,45,90].map((i,s)=>({id:we(),t:s*2,pos:[3.2*Math.sin(i*Math.PI/180),1.6,3.2*Math.cos(i*Math.PI/180)],target:[0,1.45,0],roll:0,lens:35,ease:s===0?"in":s===3?"out":"linear",look:"A"}));return{v:1,figures:[{id:we(),label:"A",x:0,z:0,rot:0,height:1.8,pose:"stand"},{id:we(),label:"B",x:-1.7,z:-1.6,rot:40,height:1.68,pose:"stand"}],props:[{id:we(),kind:"wall",x:0,z:-4.2,rot:0},{id:we(),kind:"door",x:2.6,z:-4.1,rot:0},{id:we(),kind:"table",x:2.4,z:-1.2,rot:15},{id:we(),kind:"chair",x:1.6,z:-1,rot:-70},{id:we(),kind:"box",x:-3.2,z:1.4,rot:20}],keys:e,shot:{aspect:"16:9",duration:8,fps:24,lens:35,shake:0}}}function jo(n){n.shot.duration=ce(n.shot.duration,4,30),n.shot.shake=ce(n.shot.shake||0,0,100);const t=new Set(n.figures.map(e=>e.label));for(const e of n.keys)e.t=ce(e.t,0,n.shot.duration),e.look&&!t.has(e.look)&&(e.look=null);for(const e of n.figures)e.path&&(e.path.t0=ce(e.path.t0,0,n.shot.duration-.25),e.path.t1=ce(e.path.t1,e.path.t0+.25,n.shot.duration));n.keys.sort((e,i)=>e.t-i.t),n.keys[0]&&(n.keys[0].cut=!1)}function Rl(n){const t=n;return!t||t.v!==1||!Array.isArray(t.figures)||!Array.isArray(t.keys)||!t.shot?null:(t.props=Array.isArray(t.props)?t.props:[],jo(t),t)}const th="tml_previz_v1";class C_{constructor(){this.past=[],this.future=[],this.liveBase=null,this.listeners=new Set,this.saveTimer=0;let t=null;try{const e=localStorage.getItem(th);e&&(t=Rl(JSON.parse(e)))}catch{t=null}this.p=t||Su()}on(t){this.listeners.add(t)}emit(t){for(const e of this.listeners)e(t);clearTimeout(this.saveTimer),this.saveTimer=window.setTimeout(()=>{try{localStorage.setItem(th,JSON.stringify(this.p))}catch{}},400)}commit(t,e="edit"){const i=JSON.stringify(this.p);t(this.p),jo(this.p),JSON.stringify(this.p)!==i&&(this.past.push(i),this.past.length>150&&this.past.shift(),this.future=[],this.emit(e))}live(t){this.liveBase===null&&(this.liveBase=JSON.stringify(this.p)),t(this.p),this.emit("live")}end(){this.liveBase!==null&&(jo(this.p),JSON.stringify(this.p)!==this.liveBase&&(this.past.push(this.liveBase),this.future=[]),this.liveBase=null,this.emit("edit"))}replace(t){this.commit(e=>Object.assign(e,t),"replace")}canUndo(){return this.past.length>0}canRedo(){return this.future.length>0}undo(){const t=this.past.pop();t&&(this.future.push(JSON.stringify(this.p)),this.p=JSON.parse(t),this.emit("undo"))}redo(){const t=this.future.pop();t&&(this.past.push(JSON.stringify(this.p)),this.p=JSON.parse(t),this.emit("undo"))}}const eh={type:"change"},Cl={type:"start"},yu={type:"end"},Br=new fa,nh=new Nn,P_=Math.cos(70*rr.DEG2RAD),Te=new N,je=2*Math.PI,ee={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},ja=1e-6;class L_ extends Lf{constructor(t,e=null){super(t,e),this.state=ee.NONE,this.target=new N,this.cursor=new N,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:_s.ROTATE,MIDDLE:_s.DOLLY,RIGHT:_s.PAN},this.touches={ONE:ms.ROTATE,TWO:ms.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new N,this._lastQuaternion=new yi,this._lastTargetPosition=new N,this._quat=new yi().setFromUnitVectors(t.up,new N(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Pc,this._sphericalDelta=new Pc,this._scale=1,this._panOffset=new N,this._rotateStart=new At,this._rotateEnd=new At,this._rotateDelta=new At,this._panStart=new At,this._panEnd=new At,this._panDelta=new At,this._dollyStart=new At,this._dollyEnd=new At,this._dollyDelta=new At,this._dollyDirection=new N,this._mouse=new At,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=I_.bind(this),this._onPointerDown=D_.bind(this),this._onPointerUp=N_.bind(this),this._onContextMenu=G_.bind(this),this._onMouseWheel=O_.bind(this),this._onKeyDown=z_.bind(this),this._onTouchStart=k_.bind(this),this._onTouchMove=B_.bind(this),this._onMouseDown=U_.bind(this),this._onMouseMove=F_.bind(this),this._interceptControlDown=H_.bind(this),this._interceptControlUp=V_.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(t){this._cursorStyle=t,t==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.ownerDocument.addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=ee.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.ownerDocument.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.ownerDocument.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(eh),this.update(),this.state=ee.NONE}pan(t,e){this._pan(t,e),this.update()}dollyIn(t){this._dollyIn(t),this.update()}dollyOut(t){this._dollyOut(t),this.update()}rotateLeft(t){this._rotateLeft(t),this.update()}rotateUp(t){this._rotateUp(t),this.update()}update(t=null){const e=this.object.position;Te.copy(e).sub(this.target),Te.applyQuaternion(this._quat),this._spherical.setFromVector3(Te),this.autoRotate&&this.state===ee.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(i)&&isFinite(s)&&(i<-Math.PI?i+=je:i>Math.PI&&(i-=je),s<-Math.PI?s+=je:s>Math.PI&&(s-=je),i<=s?this._spherical.theta=Math.max(i,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+s)/2?Math.max(i,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const a=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=a!=this._spherical.radius}if(Te.setFromSpherical(this._spherical),Te.applyQuaternion(this._quatInverse),e.copy(this.target).add(Te),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let a=null;if(this.object.isPerspectiveCamera){const o=Te.length();a=this._clampDistance(o*this._scale);const c=o-a;this.object.position.addScaledVector(this._dollyDirection,c),this.object.updateMatrixWorld(),r=!!c}else if(this.object.isOrthographicCamera){const o=new N(this._mouse.x,this._mouse.y,0);o.unproject(this.object);const c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=c!==this.object.zoom;const l=new N(this._mouse.x,this._mouse.y,0);l.unproject(this.object),this.object.position.sub(l).add(o),this.object.updateMatrixWorld(),a=Te.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;a!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(a).add(this.object.position):(Br.origin.copy(this.object.position),Br.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Br.direction))<P_?this.object.lookAt(this.target):(nh.setFromNormalAndCoplanarPoint(this.object.up,this.target),Br.intersectPlane(nh,this.target))))}else if(this.object.isOrthographicCamera){const a=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),a!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>ja||8*(1-this._lastQuaternion.dot(this.object.quaternion))>ja||this._lastTargetPosition.distanceToSquared(this.target)>ja?(this.dispatchEvent(eh),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?je/60*this.autoRotateSpeed*t:je/60/60*this.autoRotateSpeed}_getZoomScale(t){const e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){Te.setFromMatrixColumn(e,0),Te.multiplyScalar(-t),this._panOffset.add(Te)}_panUp(t,e){this.screenSpacePanning===!0?Te.setFromMatrixColumn(e,1):(Te.setFromMatrixColumn(e,0),Te.crossVectors(this.object.up,Te)),Te.multiplyScalar(t),this._panOffset.add(Te)}_pan(t,e){const i=this.domElement;if(this.object.isPerspectiveCamera){const s=this.object.position;Te.copy(s).sub(this.target);let r=Te.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*r/i.clientHeight,this.object.matrix),this._panUp(2*e*r/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const i=this.domElement.getBoundingClientRect(),s=t-i.left,r=e-i.top,a=i.width,o=i.height;this._mouse.x=s/a*2-1,this._mouse.y=-(r/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientY),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(je*this._rotateDelta.x/e.clientHeight),this._rotateUp(je*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.zoomToCursor&&(this._performCursorZoom=!0,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(je*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-je*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(je*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-je*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),i=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._rotateStart.set(i,s)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),i=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panStart.set(i,s)}}_handleTouchStartDolly(t){const e=this._getSecondPointerPosition(t),i=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(i*i+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{const i=this._getSecondPointerPosition(t),s=.5*(t.pageX+i.x),r=.5*(t.pageY+i.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(je*this._rotateDelta.x/e.clientHeight),this._rotateUp(je*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),i=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panEnd.set(i,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){const e=this._getSecondPointerPosition(t),i=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(i*i+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const a=(t.pageX+e.x)*.5,o=(t.pageY+e.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new At,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){const e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){const e=t.deltaMode,i={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}}function D_(n){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(n.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(n)&&(this._addPointer(n),n.pointerType==="touch"?this._onTouchStart(n):this._onMouseDown(n),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function I_(n){this.enabled!==!1&&(n.pointerType==="touch"?this._onTouchMove(n):this._onMouseMove(n))}function N_(n){switch(this._removePointer(n),this._pointers.length){case 0:this.domElement.releasePointerCapture(n.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(yu),this.state=ee.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:const t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function U_(n){let t;switch(n.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case _s.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(n),this.state=ee.DOLLY;break;case _s.ROTATE:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=ee.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=ee.ROTATE}break;case _s.PAN:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=ee.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=ee.PAN}break;default:this.state=ee.NONE}this.state!==ee.NONE&&this.dispatchEvent(Cl)}function F_(n){switch(this.state){case ee.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(n);break;case ee.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(n);break;case ee.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(n);break}}function O_(n){this.enabled===!1||this.enableZoom===!1||this.state!==ee.NONE||(n.preventDefault(),this.dispatchEvent(Cl),this._handleMouseWheel(this._customWheelEvent(n)),this.dispatchEvent(yu))}function z_(n){this.enabled!==!1&&this._handleKeyDown(n)}function k_(n){switch(this._trackPointer(n),this._pointers.length){case 1:switch(this.touches.ONE){case ms.ROTATE:if(this.enableRotate===!1){this.state=ee.NONE;break}this._handleTouchStartRotate(n),this.state=ee.TOUCH_ROTATE;break;case ms.PAN:if(this.enablePan===!1){this.state=ee.NONE;break}this._handleTouchStartPan(n),this.state=ee.TOUCH_PAN;break;default:this.state=ee.NONE}break;case 2:switch(this.touches.TWO){case ms.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(n),this.state=ee.TOUCH_DOLLY_PAN;break;case ms.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(n),this.state=ee.TOUCH_DOLLY_ROTATE;break;default:this.state=ee.NONE}break;default:this.state=ee.NONE}this.state!==ee.NONE&&this.dispatchEvent(Cl)}function B_(n){switch(this._trackPointer(n),this.state){case ee.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(n),this.update();break;case ee.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(n),this.update();break;case ee.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(n),this.update();break;case ee.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(n),this.update();break;default:this.state=ee.NONE}}function G_(n){this.enabled!==!1&&n.preventDefault()}function H_(n){n.key==="Control"&&(this._controlActive=!0,this.domElement.ownerDocument.addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function V_(n){n.key==="Control"&&(this._controlActive=!1,this.domElement.ownerDocument.removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}const Fn={stand:1,walk:.99,run:.95,sit:.73,kneel:.72};function As(n){return n.path?Math.hypot(n.path.x-n.x,n.path.z-n.z):0}function xe(n,t){const e=As(n);if(!n.path||e<.05)return{x:n.x,z:n.z,rot:n.rot,pose:n.pose,moving:!1,phase:0};const{t0:i,t1:s}=n.path,r=ce((t-i)/Math.max(.01,s-i),0,1),a=n.pose==="run",o=t>i&&t<s,c=n.pose==="walk"||n.pose==="run"?"stand":n.pose;return{x:n.x+(n.path.x-n.x)*r,z:n.z+(n.path.z-n.z)*r,rot:Math.atan2(n.path.x-n.x,n.path.z-n.z)*180/Math.PI,pose:o?a?"run":"walk":c,moving:o,phase:r*e/(a?2.6:1.45)*Math.PI*2}}function Eu(n,t){const e=xe(n,t);return new N(e.x,n.height*Fn[e.pose]*.8,e.z)}function Ri(n){return n==="16:9"?16/9:n==="9:16"?9/16:n==="2.39:1"?2.39:1}function si(n,t){const e=t>=1?Math.min(36,24*t)/t:Math.min(36,24/t);return 2*Math.atan(e/2/n)/Ut}function W_(n,t){const e=si(n,t)*Ut;return 2*Math.atan(Math.tan(e/2)*t)/Ut}function X_(n,t){switch(n){case"in":return 2*t*t-t*t*t;case"out":return t+t*t-t*t*t;case"inout":return t*t*(3-2*t);default:return t}}const $_=()=>({pos:new N(0,1.6,5),target:new N(0,1.4,0),roll:0,lens:35}),Xs=n=>new N(n[0],n[1],n[2]);function Y_(n,t,e,i,s){const r=t.distanceTo(e);if(r<1e-6)return t.clone();const a=1e-4,o=0,c=o+Math.max(a,Math.sqrt(n.distanceTo(t))),l=c+Math.sqrt(r),h=l+Math.max(a,Math.sqrt(e.distanceTo(i))),f=c+(l-c)*s,p=(v,b,y,w)=>v.clone().multiplyScalar((w-f)/(w-y)).add(b.clone().multiplyScalar((f-y)/(w-y))),m=p(n,t,o,c),g=p(t,e,c,l),M=p(e,i,l,h),d=p(m,g,o,l),u=p(g,M,c,h);return p(d,u,c,l)}function ih(n,t,e){const i=n[t],s=n[t+1],r=t>0?n[t-1]:i.clone().multiplyScalar(2).sub(s),a=t+2<n.length?n[t+2]:s.clone().multiplyScalar(2).sub(i);return Y_(r,i,s,a,e)}function gs(n,t,e){const i=t.look?n.figures.find(s=>s.label===t.look):null;return i?Eu(i,e):Xs(t.target)}function Gs(n,t){return Math.sin(n*1.9+t*12.9)*.5+Math.sin(n*4.3+t*78.2)*.3+Math.sin(n*9.1+t*37.7)*.14+Math.sin(n*17.3+t*5.1)*.06}function Cn(n,t,e=!1){const i=q_(n,t),s=e?(n.shot.shake||0)/100:0;if(s>0){const r=i.target.clone().sub(i.pos),a=r.length()||1;r.normalize();const o=new N().crossVectors(r,new N(0,1,0));o.lengthSq()<1e-6&&o.set(1,0,0),o.normalize();const c=new N().crossVectors(o,r),l=1.5*Ut*s;i.target.addScaledVector(o,Math.tan(Gs(t,1)*l)*a).addScaledVector(c,Math.tan(Gs(t,2)*l)*a),i.pos.addScaledVector(o,Gs(t*.8,3)*.035*s).addScaledVector(c,Gs(t*.8,4)*.03*s),i.roll+=Gs(t*.9,5)*1.1*s}return i}function Ti(n){const t=[];for(const e of n)e.cut&&t.length?t.push([e]):t.length?t[t.length-1].push(e):t.push([e]);return t}function q_(n,t){const e=Ti(n.keys);let i=e[0]||[];for(const p of e)p[0].t<=t+1e-6&&(i=p);if(!i.length)return $_();if(i.length===1||t<=i[0].t){const p=i[0];return{pos:Xs(p.pos),target:gs(n,p,t),roll:p.roll,lens:p.lens}}const s=i[i.length-1];if(t>=s.t)return{pos:Xs(s.pos),target:gs(n,s,t),roll:s.roll,lens:s.lens};let r=0;for(;r<i.length-2&&t>=i[r+1].t;)r++;const a=i[r],o=i[r+1],c=o.t-a.t,l=c>1e-6?X_(a.ease,(t-a.t)/c):1,h=ih(i.map(p=>Xs(p.pos)),r,l),f=a.look||o.look?gs(n,a,t).lerp(gs(n,o,t),l*l*(3-2*l)):ih(i.map(p=>Xs(p.target)),r,l);return{pos:h,target:f,roll:a.roll+(o.roll-a.roll)*l,lens:a.lens+(o.lens-a.lens)*l}}function tl(n,t,e){n.position.copy(t.pos);const i=t.target.clone().sub(t.pos).normalize();Math.abs(i.y)>.999?n.up.set(0,0,-1):n.up.set(0,1,0),n.lookAt(t.target),t.roll&&n.rotateZ(-t.roll*Ut),n.fov=si(t.lens,e),n.aspect=e,n.updateProjectionMatrix()}const qe=1,wn=new pa({color:12104877,roughness:.88,metalness:0}),ps=new pa({color:10262931,roughness:.9,metalness:0});function Ne(n,t,e=0){const i=new Oe(n,t);return i.position.y=e,i.castShadow=!0,i.receiveShadow=!0,i}const Fi=(n,t)=>new bl(n,t,6,14),K_={stand:{hipL:0,hipR:0,kneeL:0,kneeR:0,shL:0,shR:0,elL:8,elR:8,lean:0,pelvis:.99},walk:{hipL:24,hipR:-18,kneeL:6,kneeR:28,shL:-22,shR:24,elL:18,elR:22,lean:3,pelvis:.97},run:{hipL:55,hipR:-28,kneeL:35,kneeR:95,shL:-50,shR:55,elL:90,elR:90,lean:14,pelvis:.92},sit:{hipL:90,hipR:90,kneeL:90,kneeR:90,shL:18,shR:18,elL:55,elR:55,lean:-4,pelvis:.54,seat:!0},kneel:{hipL:0,hipR:90,kneeL:90,kneeR:90,shL:10,shR:10,elL:30,elR:30,lean:4,pelvis:.55}};function Z_(n,t){const e=Math.sin(t),i=Math.cos(t),s=n?46:26,r=n?100:48,a=n?52:24,o=n?10:2,c=n?18:6;return{hipL:s*e+o,hipR:-s*e+o,kneeL:c+r*Math.max(0,i),kneeR:c+r*Math.max(0,-i),shL:-a*e,shR:a*e,elL:n?90:20,elR:n?90:20,lean:n?14:3,pelvis:(n?.93:.97)-.02*Math.abs(e)}}function J_(n,t){const e=document.createElement("canvas");e.width=e.height=128;const i=e.getContext("2d");i.fillStyle=t,i.beginPath(),i.arc(64,64,56,0,Math.PI*2),i.fill(),i.fillStyle="#111",i.font="bold 74px system-ui, sans-serif",i.textAlign="center",i.textBaseline="middle",i.fillText(n,64,68);const s=new mf(e);s.colorSpace=un;const r=new uf(new Jh({map:s,depthTest:!1,transparent:!0}));return r.scale.set(.34,.34,1),r.renderOrder=10,r.layers.set(qe),r}function Jn(n=0,t=0,e=0){const i=new ei;return i.position.set(n,t,e),i}function Q_(n){const t=vu[n.label],e=new pa({color:t,roughness:.55,emissive:t,emissiveIntensity:.18}),i=Jn(),s=Jn();i.add(s);const r=Jn(0,.99,0);s.add(r);const a=Ne(Fi(.12,.1),wn);a.rotation.z=Math.PI/2,r.add(a);const o=Jn(0,.02,0);r.add(o);const c=Ne(Fi(.15,.24),wn,.25);c.scale.set(1,1,.72),o.add(c);const l=Ne(new Bi(.158,.158,.1,24),e,.33);l.scale.set(1,1,.74),o.add(l),o.add(Ne(Fi(.05,.06),wn,.5));const h=Ne(new Wi(.105,24,16),wn,.67);h.scale.set(.92,1.08,1),o.add(h);const f=Ne(new wl(.025,.06,10),wn,.665);f.rotation.x=Math.PI/2,f.position.z=.105,o.add(f);const p=z=>{const C=Jn(.2*z,.44,0);C.rotation.z=.1*z,C.add(Ne(Fi(.048,.2),wn,-.14));const H=Jn(0,-.29,0);return C.add(H),H.add(Ne(Fi(.043,.18),wn,-.13)),H.add(Ne(new Wi(.05,14,10),wn,-.28)),o.add(C),{sh:C,el:H}},m=z=>{const C=Jn(.1*z,-.04,0);C.add(Ne(Fi(.075,.3),wn,-.225));const H=Jn(0,-.45,0);C.add(H),H.add(Ne(Fi(.06,.33),wn,-.225));const $=Ne(new Hn(.1,.06,.24),wn,-.47);return $.position.z=.06,H.add($),r.add(C),{hip:C,knee:H}},g=p(1),M=p(-1),d=m(1),u=m(-1),v=Ne(new Hn(.46,.44,.44),ps,.22);v.position.z=-.06,s.add(v);const b=new zi({color:t,transparent:!0,opacity:.55,depthWrite:!1}),y=new Oe(new aa(.4,.46,48),b);y.rotation.x=-Math.PI/2,y.position.y=.012,y.layers.set(qe);const w=new Oe(new Tl(.07,3),b);w.position.set(0,.55,0),w.rotation.z=Math.PI/2,y.add(w),w.layers.set(qe),i.add(y);const T=J_(n.label,t);i.add(T);const _=Jn(),E=new Oe(new aa(.2,.34,40),b);E.rotation.x=-Math.PI/2,E.position.y=.014;const L=new Oe(new Bi(.02,.02,1.1,8),new zi({color:t}));L.position.y=.55;const R=new Oe(new Hn(.34,.2,.02),new zi({color:t}));R.position.set(.17,1,0);const I=new Oe(new Bi(.42,.42,1.2,12),new zi({visible:!1}));I.position.y=.6,_.add(E,L,R,I),_.traverse(z=>z.layers.set(qe)),_.userData={kind:"dest",id:n.id};const F=new jh(new ve,new Ef({color:t,dashSize:.25,gapSize:.15,depthTest:!1,transparent:!0}));return F.layers.set(qe),F.renderOrder=4,i.userData={kind:"figure",id:n.id},{root:i,body:s,pelvis:r,spine:o,seat:v,ring:y,ringMat:b,label:T,dest:_,destLine:F,hipL:d.hip,hipR:u.hip,kneeL:d.knee,kneeR:u.knee,shL:g.sh,shR:M.sh,elL:g.el,elR:M.el}}function j_(n,t,e,i){const s=e.moving?Z_(e.pose==="run",e.phase):K_[e.pose],r=t.height/1.8;n.root.position.set(e.x,0,e.z),n.root.rotation.y=e.rot*Ut,n.dest.visible=n.destLine.visible=!!t.path,t.path&&(n.dest.position.set(t.path.x,0,t.path.z),n.destLine.geometry.dispose(),n.destLine.geometry=new ve().setFromPoints([new N(t.x,.02,t.z),new N(t.path.x,.02,t.path.z)]),n.destLine.computeLineDistances()),n.body.scale.setScalar(r),n.pelvis.position.y=s.pelvis,n.spine.rotation.x=s.lean*Ut,n.hipL.rotation.x=-s.hipL*Ut,n.hipR.rotation.x=-s.hipR*Ut,n.kneeL.rotation.x=s.kneeL*Ut,n.kneeR.rotation.x=s.kneeR*Ut,n.shL.rotation.x=-s.shL*Ut,n.shR.rotation.x=-s.shR*Ut,n.elL.rotation.x=-s.elL*Ut,n.elR.rotation.x=-s.elR*Ut,n.seat.visible=!!s.seat,n.label.position.y=t.height*Fn[e.pose]+.28,n.ringMat.opacity=i?1:.45,n.ring.scale.setScalar(i?1.12:1)}const tx={box:[.6,.6],table:[1.4,.8],chair:[.45,.45],door:[1.14,.6],wall:[4,.15],sofa:[1.9,.85],bed:[1.6,2.05],bar:[2.4,.6],car:[1.8,4.3],mic:[.4,.4],tree:[1.2,1.2],column:[.6,.6]};function ex(n){const t=new ei,e=(s,r,a,o,c,l)=>{const h=Ne(new Hn(s,r,a),ps);h.position.set(o,c,l),t.add(h)};if(n==="box"&&e(.6,.6,.6,0,.3,0),n==="table"){e(1.4,.05,.8,0,.74,0);for(const s of[-.64,.64])for(const r of[-.34,.34])e(.05,.72,.05,s,.36,r)}if(n==="chair"){e(.45,.05,.45,0,.45,0);for(const s of[-.2,.2])for(const r of[-.2,.2])e(.04,.44,.04,s,.22,r);e(.45,.5,.04,0,.73,-.21)}if(n==="door"){e(.1,2.15,.14,-.52,1.075,0),e(.1,2.15,.14,.52,1.075,0),e(1.14,.1,.14,0,2.2,0);const s=new ei;s.position.set(-.46,0,0),s.rotation.y=-.5;const r=Ne(new Hn(.92,2.08,.04),ps);r.position.set(.46,1.04,0),s.add(r),t.add(s)}n==="wall"&&e(4,2.6,.15,0,1.3,0);const i=(s,r,a,o,c,l=0)=>{const h=Ne(new Bi(s,s,r,20),ps);h.position.set(a,o,c),h.rotation.z=l,t.add(h)};if(n==="sofa"){e(1.9,.42,.85,0,.21,0),e(1.9,.45,.2,0,.64,-.325);for(const s of[-.85,.85])e(.2,.62,.85,s,.31,0)}if(n==="bed"&&(e(1.6,.45,2,0,.225,0),e(1.6,1,.08,0,.5,-1.02),e(1.3,.12,.4,0,.5,-.7)),n==="bar"&&e(2.4,1.05,.6,0,.525,0),n==="car"){e(1.8,.62,4.3,0,.66,0),e(1.6,.52,2.1,0,1.22,-.2);for(const s of[-.9,.9])for(const r of[-1.4,1.4])i(.33,.22,s,.33,r,Math.PI/2)}if(n==="mic"){i(.16,.03,0,.015,0),i(.014,1.45,0,.74,0);const s=Ne(new Wi(.045,12,8),ps);s.position.set(0,1.5,0),t.add(s)}if(n==="tree"){i(.16,2.3,0,1.15,0);const s=Ne(new Wi(1.25,14,10),ps);s.position.set(0,3.2,0),t.add(s)}return n==="column"&&i(.28,3.2,0,1.6,0),t}function sh(n,t,e){const i=Math.tan(W_(n,t)*Ut/2)*e,s=Math.tan(si(n,t)*Ut/2)*e,r=[[-i,-s,-e],[i,-s,-e],[i,s,-e],[-i,s,-e]],a=[],o=(l,h)=>a.push(...l,...h);for(const l of r)o([0,0,0],l);for(let l=0;l<4;l++)o(r[l],r[(l+1)%4]);o([-i*.4,s*1.08,-e],[0,s*1.5,-e]),o([0,s*1.5,-e],[i*.4,s*1.08,-e]);const c=new ve;return c.setAttribute("position",new ae(a,3)),c}class nx{constructor(t,e){this.scene=new nf,this.dirCam=new Ze(50,1,.05,400),this.shotCam=new Ze(40,16/9,.05,400),this.figs=new Map,this.props=new Map,this.helpers=new ei,this.keyGroup=new ei,this.tmpCam=new Ze,this.ray=new Cf,this.dirRect={x:0,y:0,w:1,h:1};const i=new jc({canvas:t,antialias:!0,alpha:!0});i.setPixelRatio(Math.min(window.devicePixelRatio,2)),i.shadowMap.enabled=!0,i.shadowMap.type=xs,i.setScissorTest(!0),this.renderer=i;const s=7237747;this.scene.background=new Xt(s),this.scene.fog=new yl(s,22,70);const r=new Oe(new Ts(200,200),new pa({color:9145744,roughness:1}));r.rotation.x=-Math.PI/2,r.receiveShadow=!0,this.scene.add(r);const a=new Pf(40,40,5593180,7106419);a.position.y=.003,a.material.transparent=!0,a.material.opacity=.8,this.scene.add(a),this.scene.add(new bf(15921904,4869200,1.25));const o=new Af(16774374,2.6);o.position.set(5,9,6),o.castShadow=!0,o.shadow.mapSize.set(2048,2048);const c=o.shadow.camera;c.left=c.bottom=-14,c.right=c.top=14,c.near=1,c.far=40,o.shadow.bias=-4e-4,o.shadow.normalBias=.02,this.scene.add(o),this.helpers.layers.set(qe),this.scene.add(this.helpers),this.helpers.add(this.keyGroup),this.pathLine=new qr(new ve,new Ss({color:15245882,depthTest:!1,transparent:!0})),this.pathLine.renderOrder=5,this.pathLine.layers.set(qe),this.helpers.add(this.pathLine),this.cur=new qr(new ve,new Ss({color:16731469,depthTest:!1,transparent:!0})),this.cur.renderOrder=6,this.cur.layers.set(qe),this.helpers.add(this.cur),this.targetDot=new Oe(new Wi(.05,12,8),new zi({color:16731469,depthTest:!1,transparent:!0})),this.targetDot.renderOrder=6,this.targetDot.layers.set(qe),this.helpers.add(this.targetDot),this.dirCam.layers.enable(qe),this.ray.layers.enable(qe),this.dirCam.position.set(4.6,3.6,6.2),this.controls=new L_(this.dirCam,e),this.controls.target.set(0,.9,-.6),this.controls.enableDamping=!0,this.controls.dampingFactor=.12,this.controls.maxPolarAngle=Math.PI*.495,this.controls.minDistance=.4,this.controls.maxDistance=60,this.controls.update()}setSize(t,e){this.renderer.setSize(t,e,!1)}syncScene(t,e,i){const s=new Set;for(const a of t.figures){s.add(a.id);let o=this.figs.get(a.id);o&&o.root.userData.label!==a.label&&(this.scene.remove(o.root,o.dest,o.destLine),o=void 0),o||(o=Q_(a),o.root.userData.label=a.label,this.figs.set(a.id,o),this.scene.add(o.root,o.dest,o.destLine)),j_(o,a,xe(a,i),a.id===e)}for(const[a,o]of this.figs)s.has(a)||(this.scene.remove(o.root,o.dest,o.destLine),this.figs.delete(a));const r=new Set;for(const a of t.props){r.add(a.id);let o=this.props.get(a.id);o&&o.userData.kindName!==a.kind&&(this.scene.remove(o),o=void 0),o||(o=ex(a.kind),o.userData={kind:"prop",id:a.id,kindName:a.kind},this.props.set(a.id,o),this.scene.add(o)),this.placeProp(o,a,a.id===e)}for(const[a,o]of this.props)r.has(a)||(this.scene.remove(o),this.props.delete(a))}placeProp(t,e,i){t.position.set(e.x,0,e.z),t.rotation.y=e.rot*Ut;let s=t.getObjectByName("sel");if(i&&!s){const[r,a]=tx[e.kind];s=new Oe(new Ts(r+.24,a+.24),new zi({color:15245882,transparent:!0,opacity:.4,depthWrite:!1})),s.name="sel",s.rotation.x=-Math.PI/2,s.position.y=.012,s.layers.set(qe),t.add(s)}!i&&s&&t.remove(s)}syncPath(t,e,i){const s=t.keys,r=[];for(const a of Ti(s)){if(a.length<2)continue;const o=a[0].t,c=a[a.length-1].t,l=Math.max(24,Math.round((c-o)*40));let h=Cn(t,o).pos;for(let f=1;f<=l;f++){const p=Cn(t,o+(c-o)*f/l).pos;r.push(h,p),h=p}}this.pathLine.geometry.dispose(),this.pathLine.geometry=new ve().setFromPoints(r);for(const a of[...this.keyGroup.children])this.keyGroup.remove(a),a.geometry.dispose();for(const a of s){const o=a.id===i,c=new qr(sh(a.lens,e,o?.55:.4),new Ss({color:o?16777215:15245882,depthTest:!1,transparent:!0,opacity:o?1:.85}));c.renderOrder=5,c.layers.set(qe),this.placeLike(c,{pos:new N(...a.pos),target:gs(t,a,a.t),roll:a.roll,lens:a.lens},e),this.keyGroup.add(c)}}syncCurrent(t,e){this.cur.geometry.dispose(),this.cur.geometry=sh(t.lens,e,.7),this.placeLike(this.cur,t,e),this.targetDot.position.copy(t.target)}placeLike(t,e,i){tl(this.tmpCam,e,i),t.position.copy(this.tmpCam.position),t.quaternion.copy(this.tmpCam.quaternion)}ndc(t,e){const i=this.dirRect;return new At((t-i.x)/i.w*2-1,-((e-i.y)/i.h)*2+1)}pick(t,e){this.ray.setFromCamera(this.ndc(t,e),this.dirCam);const i=[...[...this.figs.values()].flatMap(r=>r.dest.visible?[r.dest,r.root]:[r.root]),...this.props.values()],s=this.ray.intersectObjects(i,!0);for(const r of s){let a=r.object;for(;a&&!a.userData.id;)a=a.parent;if(a)return{kind:a.userData.kind,id:a.userData.id}}return null}floorPoint(t,e){this.ray.setFromCamera(this.ndc(t,e),this.dirCam);const i=new N;return this.ray.ray.intersectPlane(new Nn(new N(0,1,0),0),i)?i:null}exporter(t,e){const i=document.createElement("canvas"),s=new jc({canvas:i,antialias:!0,preserveDrawingBuffer:!0});s.setPixelRatio(1),s.setSize(t,e,!1),s.shadowMap.enabled=!0,s.shadowMap.type=xs;const r=new Ze,a=[];this.scene.traverse(c=>{const l=c;l.isDirectionalLight&&l.castShadow&&a.push({l,map:l.shadow.map})});const o=a.map(()=>null);return{canvas:i,render:(c,l,h)=>{this.syncScene(c,null,l),tl(r,Cn(c,l,!0),h),a.forEach((f,p)=>f.l.shadow.map=o[p]),s.render(this.scene,r),a.forEach((f,p)=>{o[p]=f.l.shadow.map,f.l.shadow.map=f.map})},dispose:()=>{o.forEach(c=>c==null?void 0:c.dispose()),s.dispose(),s.forceContextLoss()}}}helpersOn(t){t?this.dirCam.layers.enable(qe):this.dirCam.layers.disable(qe)}clearAll(t,e){this.renderer.setViewport(0,0,t,e),this.renderer.setScissor(0,0,t,e),this.renderer.setClearColor(0,0),this.renderer.clear()}draw(t,e,i,s=!1){const r=i-e.y-e.h;this.renderer.setViewport(e.x,r,e.w,e.h),this.renderer.setScissor(e.x,r,e.w,e.h),s?(this.renderer.setClearColor(0,1),this.renderer.clear()):this.renderer.render(this.scene,t)}}const el=[{id:"dollyIn",gr:"Dolly in",note:"πλησιάζει"},{id:"dollyOut",gr:"Dolly out",note:"απομακρύνεται"},{id:"truckL",gr:"Truck αριστερά",note:"πλάγια"},{id:"truckR",gr:"Truck δεξιά",note:"πλάγια"},{id:"orbit90",gr:"Orbit 90°",note:"τόξο"},{id:"orbit180",gr:"Orbit 180°",note:"μισός κύκλος"},{id:"orbit360",gr:"Orbit 360°",note:"πλήρης κύκλος"},{id:"craneUp",gr:"Crane up",note:"ανεβαίνει"},{id:"craneDown",gr:"Crane down",note:"κατεβαίνει"},{id:"pushTilt",gr:"Push-in με tilt up",note:"χαμηλά και κοντά"},{id:"pullReveal",gr:"Pull-back reveal",note:"αποκάλυψη"},{id:"whip",gr:"Whip pan",note:"απότομο pan"},{id:"vertigo",gr:"Vertigo",note:"dolly zoom"},{id:"tracking",gr:"Tracking",note:"δίπλα σε όποιον περπατάει"},{id:"overhead",gr:"Overhead",note:"κάθετα από πάνω"},{id:"follow",gr:"Follow",note:"από πίσω του καθώς περπατάει"},{id:"lead",gr:"Leading",note:"μπροστά του, πηγαίνει πίσω"},{id:"ots",gr:"Over the shoulder",note:"από τον ώμο προς τον άλλον"},{id:"spiral",gr:"Spiral in",note:"orbit 180 που κλείνει"},{id:"hero",gr:"Hero low angle",note:"χαμηλά, αργό push"},{id:"crash",gr:"Crash zoom",note:"απότομο zoom in"},{id:"zoomIn",gr:"Αργό zoom in",note:"35 σε 85mm"},{id:"zoomOut",gr:"Αργό zoom out",note:"85 σε 35mm"},{id:"panReveal",gr:"Pan αποκάλυψη",note:"αργό pan πάνω του"},{id:"tiltUp",gr:"Tilt up",note:"από τα πόδια στο πρόσωπο"},{id:"dutch",gr:"Dutch push",note:"πλησιάζει και γέρνει"},{id:"topSpin",gr:"Overhead spin",note:"από πάνω με περιστροφή"},{id:"lockWide",gr:"Σταθερό wide",note:"ακίνητη κάμερα"},{id:"lockMed",gr:"Σταθερό medium",note:"ακίνητη κάμερα"},{id:"lockClose",gr:"Σταθερό κοντινό",note:"ακίνητη κάμερα"}];function ix(n,t,e){const i=n.shot.duration,s=Ri(n.shot.aspect),r=n.shot.lens;if(["tracking","follow","lead"].includes(t)&&!e.path){const d=e.rot*Ut,u=Math.min(14,1.25*i);e.path={x:+(e.x+Math.sin(d)*u).toFixed(2),z:+(e.z+Math.cos(d)*u).toFixed(2),t0:0,t1:i},e.pose!=="run"&&(e.pose="walk")}const a=xe(e,0),o=e.height*Fn[a.pose==="walk"||a.pose==="run"?"stand":a.pose],c=(e.path?xe(e,(e.path.t0+e.path.t1)/2).rot:a.rot)*Ut,l=o*.8,h=(d,u=r)=>Math.max(.45,d*o/(2*Math.tan(si(u,s)*Ut/2))),f=(d,u,v)=>[+(a.x+Math.sin(c+d*Ut)*u).toFixed(3),+v.toFixed(3),+(a.z+Math.cos(c+d*Ut)*u).toFixed(3)],p=[a.x,+l.toFixed(3),a.z],m=e.label;let g=[];const M=d=>{const u=Math.round(d/45),v=h(1.15);for(let b=0;b<=u;b++)g.push({u:b/u,pos:f((d===360?0:-d/2)+d*b/u,v,l+.1),look:m,ease:b===0?"in":b===u-1?"out":"linear"})};switch(t){case"dollyIn":g=[{u:0,pos:f(0,h(1.7),l),look:m,ease:"inout"},{u:1,pos:f(0,h(.5),l),look:m}];break;case"dollyOut":g=[{u:0,pos:f(0,h(.5),l),look:m,ease:"inout"},{u:1,pos:f(0,h(1.7),l),look:m}];break;case"truckL":case"truckR":{const d=h(1.2),u=t==="truckR"?1:-1,v=_=>{const E=Math.cos(c)*_*u,L=-Math.sin(c)*_*u,R=f(0,d,l);return[[+(R[0]+E).toFixed(3),R[1],+(R[2]+L).toFixed(3)],[+(a.x+E).toFixed(3),p[1],+(a.z+L).toFixed(3)]]},[b,y]=v(-2),[w,T]=v(2);g=[{u:0,pos:b,target:y,ease:"inout"},{u:1,pos:w,target:T}];break}case"orbit90":M(90);break;case"orbit180":M(180);break;case"orbit360":M(360);break;case"craneUp":g=[{u:0,pos:f(0,h(1.3),.45),look:m,ease:"inout"},{u:1,pos:f(0,h(1.3)*.9,o+2),look:m}];break;case"craneDown":g=[{u:0,pos:f(0,h(1.3)*.9,o+2),look:m,ease:"inout"},{u:1,pos:f(0,h(1.3),.45),look:m}];break;case"pushTilt":g=[{u:0,pos:f(0,h(1.5),o*.75),target:[a.x,+(o*.55).toFixed(3),a.z],ease:"inout"},{u:1,pos:f(0,Math.max(.8,h(.45)),o*.35),target:[a.x,+(o*.92).toFixed(3),a.z]}];break;case"pullReveal":g=[{u:0,pos:f(0,h(.28),o*.92),target:[a.x,+(o*.92).toFixed(3),a.z],ease:"in"},{u:.5,pos:f(8,h(1.2),o*.95),target:p,ease:"out"},{u:1,pos:f(14,h(3),o+.9),target:p}];break;case"whip":{const d=f(0,h(1.2),l),u=h(1.2),v=[+(d[0]-Math.sin(c-80*Ut)*u).toFixed(3),p[1],+(d[2]-Math.cos(c-80*Ut)*u).toFixed(3)];g=[{u:0,pos:d,target:v},{u:.45,pos:d,target:v,ease:"inout"},{u:.5,pos:d,target:p},{u:1,pos:d,target:p}];break}case"vertigo":g=[85,62,45,32,24].map((d,u)=>({u:u/4,pos:f(0,h(1.05,d),l),look:m,lens:d,ease:u===0?"in":u===3?"out":"linear"}));break;case"tracking":{const d=e.path,u=h(1.25),v=Math.cos(c)*u,b=-Math.sin(c)*u;g=[{u:d.t0/i,pos:[+(e.x+v).toFixed(3),+l.toFixed(3),+(e.z+b).toFixed(3)],look:m},{u:d.t1/i,pos:[+(d.x+v).toFixed(3),+l.toFixed(3),+(d.z+b).toFixed(3)],look:m}];break}case"follow":case"lead":{const d=e.path,u=h(1.2),v=t==="follow"?-1:1,b=Math.sin(c)*u*v,y=Math.cos(c)*u*v;g=[{u:d.t0/i,pos:[+(e.x+b).toFixed(3),+l.toFixed(3),+(e.z+y).toFixed(3)],look:m},{u:d.t1/i,pos:[+(d.x+b).toFixed(3),+l.toFixed(3),+(d.z+y).toFixed(3)],look:m}];break}case"ots":{const d=n.figures.filter(y=>y!==e).sort((y,w)=>Math.hypot(y.x-a.x,y.z-a.z)-Math.hypot(w.x-a.x,w.z-a.z))[0],u=d?Math.atan2(d.x-a.x,d.z-a.z):c,v=d?[d.x,+(d.height*.85).toFixed(3),d.z]:[+(a.x+Math.sin(c)*3).toFixed(3),+l.toFixed(3),+(a.z+Math.cos(c)*3).toFixed(3)],b=(y,w)=>[+(a.x+Math.sin(u+y*Ut)*w).toFixed(3),+(o*.93).toFixed(3),+(a.z+Math.cos(u+y*Ut)*w).toFixed(3)];g=[{u:0,pos:b(154,1.7),target:v,lens:50,look:d?d.label:null,ease:"inout"},{u:1,pos:b(150,1.2),target:v,lens:50,look:d?d.label:null}];break}case"spiral":for(let d=0;d<=4;d++)g.push({u:d/4,pos:f(-90+45*d,h(1.7)+(h(.55)-h(1.7))*d/4,l+.05*d),look:m,ease:d===0?"in":d===3?"out":"linear"});break;case"hero":g=[{u:0,pos:f(0,h(1.15),.35),target:[a.x,+(o*.8).toFixed(3),a.z],ease:"inout"},{u:1,pos:f(0,h(.7),.5),target:[a.x,+(o*.9).toFixed(3),a.z]}];break;case"crash":{const d=f(0,h(2.2,24),l);g=[{u:0,pos:d,look:m,lens:24},{u:.46,pos:d,look:m,lens:24,ease:"in"},{u:.5,pos:d,look:m,lens:85},{u:1,pos:d,look:m,lens:85}];break}case"zoomIn":case"zoomOut":{const d=f(0,h(1.6,35),l),[u,v]=t==="zoomIn"?[35,85]:[85,35];g=[{u:0,pos:d,look:m,lens:u,ease:"inout"},{u:1,pos:d,look:m,lens:v}];break}case"panReveal":{const d=f(0,h(1.3),l),u=h(1.3),v=[+(d[0]-Math.sin(c+65*Ut)*u).toFixed(3),p[1],+(d[2]-Math.cos(c+65*Ut)*u).toFixed(3)];g=[{u:0,pos:d,target:v,ease:"inout"},{u:1,pos:d,target:p}];break}case"tiltUp":{const d=f(0,h(.5),o*.5);g=[{u:0,pos:d,target:[a.x,.12,a.z],ease:"inout"},{u:1,pos:d,target:[a.x,+(o*.93).toFixed(3),a.z]}];break}case"dutch":g=[{u:0,pos:f(0,h(1.4),l),look:m,ease:"inout"},{u:1,pos:f(0,h(.5),l),look:m,roll:18}];break;case"topSpin":g=[0,1,2,3].map(d=>({u:d/3,pos:[a.x,6.5-d*.5,a.z+.02],target:[a.x,0,a.z],roll:d*40,ease:d===0?"in":d===2?"out":"linear"}));break;case"lockWide":case"lockMed":case"lockClose":{const d=t==="lockWide"?2.3:t==="lockMed"?.58:.2,u=t==="lockClose"?o*.93:l,v=[a.x,+u.toFixed(3),a.z],b=f(t==="lockWide"?12:0,h(d),u);g=[{u:0,pos:b,target:v},{u:1,pos:b,target:v}];break}case"overhead":g=[{u:0,pos:[a.x,7,a.z+.02],target:[a.x,0,a.z],ease:"inout"},{u:1,pos:[a.x,4.6,a.z+.02],target:[a.x,0,a.z]}];break}n.keys=g.map(d=>({id:we(),t:Math.round(d.u*i*n.shot.fps)/n.shot.fps,pos:d.pos,target:d.target||p,roll:d.roll||0,lens:d.lens||r,ease:d.ease||"linear",look:d.look||null,cut:!!d.cut}))}function to(n,t,e,i,s){const r=(a,o,c,l)=>a*l-o*c;for(const a of n.props)if(a.kind==="wall"){const o=a.rot*Ut,c=a.x-Math.cos(o)*2.1,l=a.z+Math.sin(o)*2.1,h=a.x+Math.cos(o)*2.1,f=a.z-Math.sin(o)*2.1,p=r(i-t,s-e,h-c,f-l);if(Math.abs(p)<1e-6)continue;const m=r(c-t,l-e,h-c,f-l)/p,g=r(c-t,l-e,i-t,s-e)/p;if(m>0&&m<.97&&g>0&&g<1)return!0}else if(a.kind!=="mic"&&a.kind!=="chair"&&a.kind!=="box"){const o=i-t,c=s-e,l=o*o+c*c||1,h=Math.max(0,Math.min(.85,((a.x-t)*o+(a.z-e)*c)/l)),f=a.kind==="car"?1.6:a.kind==="tree"||a.kind==="column"?.5:.9;if(Math.hypot(t+o*h-a.x,e+c*h-a.z)<f)return!0}return!1}const nl=[{id:"punch",gr:"Wide, medium, κοντινό",note:"3 πλάνα που κλείνουν"},{id:"reverse",gr:"Πλάνο και κόντρα πλάνο",note:"over the shoulder, 4 cuts"},{id:"coverage",gr:"Κάλυψη διαλόγου",note:"master, OTS, κοντινά"},{id:"action",gr:"Action montage",note:"5 γρήγορα πλάνα με κίνηση"},{id:"mv",gr:"Music video cuts",note:"6 πλάνα, γωνίες και μεγέθη"},{id:"reveal",gr:"Λεπτομέρεια σε wide",note:"πολύ κοντινό, medium, γενικό"},{id:"around",gr:"Γύρω γύρω",note:"4 πλευρές, ίδιο μέγεθος"},{id:"angles",gr:"Ύψη κάμερας",note:"χαμηλά, μάτια, ψηλά, overhead"}];function sx(n,t,e){const i=n.shot.duration,s=Ri(n.shot.aspect),r=n.shot.fps,a=xe(e,0),o=e.height*Fn[a.pose==="walk"||a.pose==="run"?"stand":a.pose],c=(g,M,d=o)=>Math.max(.45,g*d/(2*Math.tan(si(M,s)*Ut/2))),l=n.figures.filter(g=>g!==e).sort((g,M)=>Math.hypot(g.x-a.x,g.z-a.z)-Math.hypot(M.x-a.x,M.z-a.z))[0],h=[],f=(g,M,d,u,v,b)=>{const y=L=>{const R=xe(d,g*i),I=(R.rot+L)*Ut,F=c(u.k,u.lens,d.height);return to(n,R.x+Math.sin(I)*F,R.z+Math.cos(I)*F,R.x,R.z)},w=u.y<=3.2&&y(u.az)&&!y(-u.az)?-1:1,T=(L,R,I,F)=>{const z=xe(d,L),C=d.height*Fn[z.pose],H=(z.rot+R.az*w)*Ut,$=R.y>3.2?.05:c(R.k,R.lens,C),V=b||d,et=xe(V,L);return{id:we(),t:Math.round(L*r)/r,cut:I,ease:F,roll:R.roll||0,lens:R.lens,pos:[+(z.x+Math.sin(H)*$).toFixed(3),+(R.y>3.2?R.y*C*.55+2:R.y*C).toFixed(3),+(z.z+Math.cos(H)*$).toFixed(3)],target:[et.x,+(V.height*Fn[et.pose]*(R.aim??.8)).toFixed(3),et.z],look:R.aim===void 0&&R.y<=3.2?V.label:null}},_=g*i,E=M*i-1/r;h.push(T(_,u,h.length>0,v?"inout":"linear")),v&&h.push(T(E,{...u,...v},!1,"linear"))},p=(g,M,d,u,v)=>{const b=xe(d,g*i),y=xe(u,g*i),w=Math.atan2(y.x-b.x,y.z-b.z),T=d.height*Fn[b.pose],_=(R,I)=>[+(b.x+Math.sin(w+R*Ut)*I).toFixed(3),+(T*.93).toFixed(3),+(b.z+Math.cos(w+R*Ut)*I).toFixed(3)],E=[y.x,+(u.height*Fn[y.pose]*.86).toFixed(3),y.z],L=(R,I,F,z)=>({id:we(),t:Math.round(R*r)/r,cut:F,ease:z,roll:0,lens:50,pos:I,target:E,look:null});h.push(L(g*i,_(152*v,1.45),h.length>0,"inout"),L(M*i-1/r,_(150*v,1.25),!1,"linear"))},m=l||e;switch(t){case"punch":f(0,.4,e,{az:8,k:2.3,y:.82,lens:24},{k:1.8}),f(.4,.72,e,{az:-14,k:.62,y:.82,lens:35},{k:.5}),f(.72,1,e,{az:6,k:.21,y:.92,lens:85,aim:.93},{k:.16});break;case"reverse":p(0,.28,e,m===e?e:m,1),l?(p(.28,.52,l,e,-1),p(.52,.76,e,l,1),f(.76,1,l,{az:-12,k:.22,y:.92,lens:85,aim:.93},{k:.19},l)):f(.28,1,e,{az:10,k:.3,y:.9,lens:50,aim:.92});break;case"coverage":if(l){const g=(a.x+l.x)/2,M=(a.z+l.z)/2,d=Math.hypot(l.x-a.x,l.z-a.z),u=Math.atan2(l.x-a.x,l.z-a.z)+Math.PI/2,v=Math.max(c(1.5,35),d*1.25),b=to(n,g+Math.sin(u)*v,M+Math.cos(u)*v,g,M)&&!to(n,g-Math.sin(u)*v,M-Math.cos(u)*v,g,M)?-1:1,y=T=>[+(g+Math.sin(u)*T*b).toFixed(3),+(o*.75).toFixed(3),+(M+Math.cos(u)*T*b).toFixed(3)],w=[+g.toFixed(3),+(o*.72).toFixed(3),+M.toFixed(3)];h.push({id:we(),t:0,cut:!1,ease:"inout",roll:0,lens:35,pos:y(v),target:w,look:null},{id:we(),t:Math.round((.26*i-1/r)*r)/r,cut:!1,ease:"linear",roll:0,lens:35,pos:y(v*.88),target:w,look:null})}else f(0,.26,e,{az:20,k:1.9,y:.75,lens:35},{k:1.7});l?(p(.26,.44,e,l,1),p(.44,.62,l,e,-1),f(.62,.81,l,{az:-14,k:.24,y:.92,lens:85,aim:.93})):f(.26,.62,e,{az:-20,k:.6,y:.82,lens:50}),f(l?.81:.62,1,e,{az:14,k:.24,y:.92,lens:85,aim:.93},{k:.2});break;case"action":f(0,.22,e,{az:15,k:1.9,y:.18,lens:18},{k:1.5}),f(.22,.42,e,{az:90,k:.9,y:.75,lens:35},{az:70}),f(.42,.58,e,{az:0,k:.2,y:.92,lens:85,aim:.93}),f(.58,.78,e,{az:0,k:1,y:4,lens:24},{roll:25}),f(.78,1,e,{az:180,k:1.2,y:.9,lens:24},{k:.8});break;case"mv":f(0,.2,e,{az:-30,k:1.6,y:.2,lens:18},{az:0}),f(.2,.34,e,{az:10,k:.2,y:.92,lens:85,aim:.93}),f(.34,.5,e,{az:90,k:.6,y:.82,lens:50},{k:.5}),f(.5,.64,e,{az:0,k:1,y:4,lens:24},{roll:40}),f(.64,.8,e,{az:200,k:.9,y:.95,lens:35},{az:160}),f(.8,1,e,{az:-8,k:.33,y:.86,lens:50,aim:.9,roll:-8},{k:.26,roll:0});break;case"reveal":f(0,.3,e,{az:12,k:.1,y:.93,lens:135,aim:.93}),f(.3,.6,e,{az:-15,k:.6,y:.82,lens:50},{k:.66}),f(.6,1,e,{az:20,k:3.6,y:1.5,lens:24},{k:4.4,y:2});break;case"around":[0,90,180,-90].forEach((g,M)=>f(M/4,(M+1)/4,e,{az:g+10,k:1,y:.82,lens:35},{az:g-10}));break;case"angles":f(0,.25,e,{az:10,k:1.3,y:.15,lens:24}),f(.25,.5,e,{az:-10,k:.9,y:.88,lens:35}),f(.5,.75,e,{az:20,k:1.5,y:2,lens:35}),f(.75,1,e,{az:0,k:1,y:4,lens:24});break}n.keys=h}const Gr=n=>[{kind:"wall",x:-2,z:n,rot:0},{kind:"wall",x:2,z:n,rot:0}],il=[{id:"table",gr:"Διάλογος στο τραπέζι",note:"δύο καθιστοί, αργό τόξο",scene:{duration:10,handheld:0,figures:[{label:"A",x:-.95,z:0,facing:90,pose:"sit",height:1.8},{label:"B",x:.95,z:0,facing:-90,pose:"sit",height:1.68}],props:[{kind:"table",x:0,z:0,rot:90},...Gr(-3.5)],camera:[{t:0,around:[0,0],azimuth:0,distance:4.2,height:1.3,look:[0,1,0],lens:35,ease:"in"},{t:5,around:[0,0],azimuth:-35,distance:3.2,height:1.25,look:[.3,1.05,0],lens:35,ease:"linear"},{t:10,around:"A",azimuth:145,distance:1.5,height:1.42,look:"B",lens:50,ease:"out"}]}},{id:"walktalk",gr:"Walk and talk",note:"δύο περπατάνε, η κάμερα μπροστά τους",scene:{duration:10,handheld:25,figures:[{label:"A",x:-.45,z:-6,facing:0,pose:"walk",height:1.8,path:{x:-.45,z:6,t0:0,t1:10}},{label:"B",x:.45,z:-6.2,facing:0,pose:"walk",height:1.7,path:{x:.45,z:5.8,t0:0,t1:10}}],props:[{kind:"wall",x:-2.4,z:-2,rot:90},{kind:"wall",x:-2.4,z:2.5,rot:90},{kind:"tree",x:2.6,z:-3,rot:0},{kind:"tree",x:2.9,z:3,rot:0}],camera:[{t:0,around:"A",azimuth:-8,size:"medium_wide",height:1.5,look:"A",lens:35,ease:"linear"},{t:10,around:"A",azimuth:-8,size:"medium",height:1.5,look:"A",lens:35,ease:"linear"}]}},{id:"enter",gr:"Είσοδος από πόρτα",note:"μπαίνει και έρχεται προς εμάς",scene:{duration:8,handheld:0,figures:[{label:"A",x:0,z:-5.6,facing:0,pose:"walk",height:1.8,path:{x:0,z:-.5,t0:1,t1:5.5}}],props:[{kind:"door",x:0,z:-5,rot:0},{kind:"wall",x:-2.6,z:-5,rot:0},{kind:"wall",x:2.6,z:-5,rot:0},{kind:"sofa",x:-2.4,z:-1.5,rot:90},{kind:"table",x:2.3,z:-2.4,rot:0}],camera:[{t:0,around:[0,-.5],azimuth:12,distance:5,height:1.4,look:[0,1.3,-5],lens:24,ease:"inout"},{t:5.5,around:[0,-.5],azimuth:12,distance:3.2,height:1.45,look:"A",lens:35,ease:"out"},{t:8,around:"A",azimuth:10,size:"medium_close",height:1.55,look:"A",lens:50,ease:"linear"}]}},{id:"chase",gr:"Καταδίωξη",note:"δύο τρέχουν, tracking στο πλάι",scene:{duration:6,handheld:65,figures:[{label:"A",x:-9,z:0,facing:90,pose:"run",height:1.78,path:{x:9,z:0,t0:0,t1:6}},{label:"B",x:-12.5,z:.6,facing:90,pose:"run",height:1.84,path:{x:6.5,z:.4,t0:0,t1:6}}],props:[{kind:"car",x:-3,z:-3,rot:90},{kind:"box",x:2,z:-1.6,rot:20},{kind:"column",x:6,z:-2.2,rot:0},{kind:"column",x:-7,z:-2.2,rot:0},{kind:"wall",x:0,z:-5,rot:0},{kind:"wall",x:4,z:-5,rot:0},{kind:"wall",x:-4,z:-5,rot:0}],camera:[{t:0,around:"A",azimuth:-70,size:"full",height:1.2,look:"A",lens:24,ease:"linear"},{t:6,around:"A",azimuth:-110,size:"full",height:1.2,look:"A",lens:24,ease:"linear"}]}},{id:"standoff",gr:"Αντιπαράθεση",note:"πρόσωπο με πρόσωπο, από τον ώμο σε προφίλ",scene:{duration:10,handheld:10,figures:[{label:"A",x:-1.6,z:0,facing:90,pose:"stand",height:1.82},{label:"B",x:1.6,z:0,facing:-90,pose:"stand",height:1.78}],props:[{kind:"column",x:-3.5,z:-3,rot:0},{kind:"column",x:3.5,z:-3,rot:0},...Gr(-5)],camera:[{t:0,around:"A",azimuth:150,distance:1.4,height:1.65,look:"B",lens:50,ease:"in"},{t:5,around:[0,0],azimuth:-60,distance:3.6,height:1.5,look:[0,1.4,0],lens:50,ease:"out"},{t:10,around:[0,0],azimuth:0,distance:5.5,height:1.2,look:[0,1.3,0],lens:35,ease:"linear"}]}},{id:"singer",gr:"Τραγουδιστής και μπάντα",note:"music video, χαμηλό orbit",scene:{duration:12,handheld:15,figures:[{label:"A",x:0,z:0,facing:0,pose:"stand",height:1.8},{label:"B",x:-2.2,z:-2,facing:15,pose:"stand",height:1.78},{label:"C",x:2.2,z:-2,facing:-15,pose:"stand",height:1.75},{label:"D",x:0,z:-3.2,facing:0,pose:"sit",height:1.8}],props:[{kind:"mic",x:0,z:.35,rot:0},{kind:"box",x:-3.4,z:-2.6,rot:0},{kind:"box",x:3.4,z:-2.6,rot:0},...Gr(-5.5)],camera:[{t:0,around:"A",azimuth:-80,size:"full",height:.6,look:"A",lens:24,ease:"in"},{t:3,around:"A",azimuth:-40,size:"medium_wide",height:.7,look:"A",lens:24,ease:"linear"},{t:6,around:"A",azimuth:0,size:"medium",height:.9,look:"A",lens:24,ease:"linear"},{t:9,around:"A",azimuth:40,size:"medium_wide",height:.7,look:"A",lens:24,ease:"out"},{t:12,around:"A",azimuth:80,size:"full",height:.6,look:"A",lens:24,ease:"linear"}]}},{id:"solo",gr:"Performance σόλο",note:"orbit 360 που ανεβαίνει",scene:{duration:12,handheld:0,figures:[{label:"A",x:0,z:0,facing:0,pose:"stand",height:1.78}],props:[{kind:"column",x:-4,z:-4,rot:0},{kind:"column",x:4,z:-4,rot:0},{kind:"column",x:-4,z:4,rot:0},{kind:"column",x:4,z:4,rot:0}],camera:[0,1,2,3,4,5,6,7,8].map(n=>({t:n*1.5,around:"A",azimuth:n*45,size:n<5?"full":"medium_wide",height:.6+n*.3,look:"A",lens:35,ease:n===0?"in":n===7?"out":"linear"}))}},{id:"meet",gr:"Συνάντηση",note:"ο ένας πλησιάζει, crane down σε δίπλανο",scene:{duration:10,handheld:0,figures:[{label:"A",x:-6,z:0,facing:90,pose:"walk",height:1.8,path:{x:-.9,z:0,t0:.5,t1:5.5}},{label:"B",x:.6,z:0,facing:-90,pose:"stand",height:1.7}],props:[{kind:"tree",x:2.5,z:-3,rot:0},{kind:"tree",x:-4,z:-3.5,rot:0},{kind:"car",x:4.5,z:-1,rot:20}],camera:[{t:0,around:[0,0],azimuth:0,distance:9,height:5,look:[-1.5,1,0],lens:24,ease:"inout"},{t:6,around:[0,0],azimuth:0,distance:4.5,height:1.5,look:[-.1,1.3,0],lens:35,ease:"out"},{t:10,around:[0,0],azimuth:0,distance:3.3,height:1.45,look:[-.1,1.35,0],lens:35,ease:"linear"}]}},{id:"car",gr:"Δίπλα στο αυτοκίνητο",note:"κοντινό που ανοίγει και αποκαλύπτει",scene:{duration:8,handheld:0,figures:[{label:"A",x:0,z:1.3,facing:20,pose:"stand",height:1.8}],props:[{kind:"car",x:.2,z:0,rot:90},{kind:"tree",x:-4,z:-3,rot:0},{kind:"wall",x:0,z:-4,rot:0},{kind:"wall",x:4,z:-4,rot:0}],camera:[{t:0,around:"A",azimuth:5,size:"close",height:1.6,look:[0,1.62,1.3],lens:50,ease:"in"},{t:4,around:"A",azimuth:15,size:"medium_wide",height:1.5,look:"A",lens:50,ease:"out"},{t:8,around:"A",azimuth:25,size:"wide",height:1.9,look:"A",lens:35,ease:"linear"}]}},{id:"alone",gr:"Μόνος στον χώρο",note:"καθιστός, overhead που κατεβαίνει",scene:{duration:10,handheld:0,figures:[{label:"A",x:0,z:0,facing:0,pose:"sit",height:1.78}],props:[{kind:"bed",x:2.6,z:-1.8,rot:0},{kind:"chair",x:-2,z:-1.5,rot:40},...Gr(-3.5),{kind:"wall",x:4,z:-1.5,rot:90}],camera:[{t:0,around:[0,.05],azimuth:0,distance:.05,height:8,look:[0,0,0],lens:24,ease:"inout"},{t:10,around:[0,.05],azimuth:0,distance:.05,height:3.6,look:[0,0,0],lens:24,ease:"linear"}]}}],Dt=n=>new Uint8Array([n>>>24&255,n>>>16&255,n>>>8&255,n&255]),on=n=>new Uint8Array([n>>>8&255,n&255]),di=n=>new Uint8Array(n),Qn=n=>Uint8Array.from(n,t=>t.charCodeAt(0));function sl(n){const t=new Uint8Array(n.reduce((i,s)=>i+s.length,0));let e=0;for(const i of n)t.set(i,e),e+=i.length;return t}const In=(n,...t)=>{const e=sl(t);return sl([Dt(e.length+8),Qn(n),e])},ln=(n,t,...e)=>In(n,Dt(t),...e),rh=sl([Dt(65536),Dt(0),Dt(0),Dt(0),Dt(65536),Dt(0),Dt(0),Dt(0),Dt(1073741824)]);function rx(n,t){const i=t.fps*100,s=n.length,r=s*100,a=In("ftyp",Qn("isom"),Dt(512),Qn("isom"),Qn("iso2"),Qn("avc1"),Qn("mp41")),o=p=>{const m=In("avc1",di(6),on(1),di(16),on(t.width),on(t.height),Dt(4718592),Dt(4718592),Dt(0),on(1),di(32),on(24),on(65535),In("avcC",t.avcC)),g=n.map((y,w)=>y.key?w+1:0).filter(Boolean),M=In("stbl",ln("stsd",0,Dt(1),m),ln("stts",0,Dt(1),Dt(s),Dt(100)),ln("stss",0,Dt(g.length),...g.map(Dt)),ln("stsc",0,Dt(1),Dt(1),Dt(s),Dt(1)),ln("stsz",0,Dt(0),Dt(s),...n.map(y=>Dt(y.data.length))),ln("stco",0,Dt(1),Dt(p))),d=In("minf",ln("vmhd",1,di(8)),In("dinf",ln("dref",0,Dt(1),ln("url ",1))),M),u=In("mdia",ln("mdhd",0,Dt(0),Dt(0),Dt(i),Dt(r),on(21956),on(0)),ln("hdlr",0,Dt(0),Qn("vide"),di(12),Qn("VideoHandler\0")),d),v=ln("tkhd",3,Dt(0),Dt(0),Dt(1),Dt(0),Dt(r),di(8),on(0),on(0),on(0),on(0),rh,Dt(t.width<<16),Dt(t.height<<16)),b=ln("mvhd",0,Dt(0),Dt(0),Dt(i),Dt(r),Dt(65536),on(256),di(10),rh,di(24),Dt(2));return In("moov",b,In("trak",v,u))},c=o(0).length,l=o(a.length+c+8),h=n.reduce((p,m)=>p+m.data.length,0),f=[a,l,Dt(h+8),Qn("mdat")];for(const p of n)f.push(p.data);return new Blob(f,{type:"video/mp4"})}function _a(n){switch(n.shot.aspect){case"9:16":return{w:1080,h:1920};case"2.39:1":return{w:1920,h:804};case"1:1":return{w:1080,h:1080};default:return{w:1920,h:1080}}}const xa=n=>Math.round(n.shot.duration*n.shot.fps),ax=["avc1.640028","avc1.4d0028","avc1.42e028","avc1.640032","avc1.42001f"];async function bu(n){if(!("VideoEncoder"in window)||!("VideoFrame"in window))return null;const{w:t,h:e}=_a(n);for(const i of ax)try{if((await VideoEncoder.isConfigSupported({codec:i,width:t,height:e,bitrate:1e7,framerate:n.shot.fps,avc:{format:"avc"}})).supported)return i}catch{}return null}async function ox(n,t,e,i){const s=await bu(t);if(!s)throw new Error("nosupport");const{w:r,h:a}=_a(t),o=t.shot.fps,c=xa(t),l=n.exporter(r,a),h=[];let f=null,p=null,m=-1;const g=new VideoEncoder({output:(u,v)=>{var w;const b=(w=v==null?void 0:v.decoderConfig)==null?void 0:w.description;b&&!f&&(f=new Uint8Array(b instanceof ArrayBuffer?b:b.buffer.slice(0))),u.timestamp<m&&(p=new Error("order")),m=u.timestamp;const y=new Uint8Array(u.byteLength);u.copyTo(y),h.push({data:y,key:u.type==="key"})},error:u=>p=u});g.configure({codec:s,width:r,height:a,bitrate:r*a>15e5?12e6:8e6,framerate:o,avc:{format:"avc"},latencyMode:"quality"});const M=new Set(Ti(t.keys).slice(1).map(u=>Math.round(u[0].t*o))),d=Ri(t.shot.aspect);try{for(let u=0;u<c;u++){if(i.now)throw new Error("stopped");if(p)throw p;l.render(t,u/o,d);const v=new VideoFrame(l.canvas,{timestamp:Math.round(u*1e6/o),duration:Math.round(1e6/o)});for(g.encode(v,{keyFrame:u%(o*2)===0||M.has(u)}),v.close(),e(u+1,c),(g.encodeQueueSize>3||u%4===0)&&await new Promise(b=>setTimeout(b,0));g.encodeQueueSize>6;)await new Promise(b=>setTimeout(b,8))}if(await g.flush(),p)throw p;if(!f||h.length!==c)throw new Error("encode");return rx(h,{width:r,height:a,fps:o,avcC:f})}finally{g.state!=="closed"&&g.close(),l.dispose()}}async function lx(n,t,e){const{w:i,h:s}=_a(t),r=n.exporter(i,s),a=[];try{for(const o of e)r.render(t,o,Ri(t.shot.aspect)),a.push(await new Promise((c,l)=>r.canvas.toBlob(h=>h?c(h):l(new Error("png")),"image/png")))}finally{r.dispose()}return a}const ah=[],oh=[{text:"Ο Νίκος μπαίνει από την πόρτα και περπατάει ως το τραπέζι όπου κάθεται η Μαρία. Η κάμερα τον ακολουθεί από πίσω και καταλήγει σε over the shoulder πάνω της.",scene:{duration:8,handheld:20,figures:[{label:"A",name:"Νίκος",x:0,z:-4.5,facing:0,pose:"walk",height:1.82,path:{x:.3,z:.6,t0:.5,t1:5}},{label:"B",name:"Μαρία",x:.9,z:1.9,facing:200,pose:"sit",height:1.68,path:null}],props:[{kind:"door",x:0,z:-5,rot:0},{kind:"wall",x:-2.6,z:-5,rot:0},{kind:"wall",x:2.6,z:-5,rot:0},{kind:"table",x:.9,z:1.3,rot:0}],camera:[{t:0,around:"A",azimuth:180,size:"medium_wide",height:1.6,look:"A",lens:35,ease:"in"},{t:5,around:"A",azimuth:180,size:"medium_wide",height:1.6,look:"A",lens:35,ease:"inout"},{t:8,around:"A",azimuth:150,distance:1.3,height:1.6,look:"B",lens:50,ease:"linear"}],notes:"Έβαλα τον Νίκο να μπαίνει από την πόρτα και τη Μαρία καθιστή στο τραπέζι. Η κάμερα τον ακολουθεί από πίσω και κλείνει σε over the shoulder."}}],cx="claude-opus-5-5",rl="tml_previz_claude_key",Tu=()=>{try{return localStorage.getItem(rl)||""}catch{return""}},wu=n=>{try{n?localStorage.setItem(rl,n):localStorage.removeItem(rl)}catch{}},hx=`You are a film director's previz assistant. From a scene description (usually in Greek) you design the blocking and the camera work (one continuous move, or several shots with cuts when asked), and answer with a single JSON object and nothing else: no prose, no markdown fences.

WORLD
- Metres. The floor is the XZ plane, Y is up. Keep everything within 8 m of the origin; put the main action near (0, 0).
- "facing" is a compass angle in degrees: 0 looks toward +Z, 90 toward +X, 180 toward -Z, -90 toward -X.
- Up to 4 figures, labels "A", "B", "C", "D" in order of importance. Give each a short "name" taken from the description when it has one.
- A figure that walks or runs gets "path": {"x", "z", "t0", "t1"} (seconds). It moves in a straight line from its x, z to the path point and faces the direction of travel. Walking is about 1.3 m/s, running about 4 m/s; choose distance and times to match. A figure with a path uses pose "walk" or "run".
- Props give the space and the parallax: "box" (0.6 m cube), "table" (1.4 x 0.8 m), "chair", "door" (a door frame 1.1 m wide), "wall" (4 m long, 2.6 m high, 15 cm thick, running along its local X axis; "rot" turns it), "sofa" (1.9 m wide, its back toward -Z), "bed" (1.6 x 2 m), "bar" (a counter 2.4 m long, 1.05 m high), "car" (4.3 m long along its local Z), "mic" (a microphone stand), "tree", "column". Use only what the scene needs, at most 10. Never put a wall between the camera and its subject.

CAMERA
- "camera" is a list of 2 to 14 keyframes sorted by "t". The first is at t = 0 and the last at t = duration. The camera flies a smooth curve through them.
- Each keyframe is placed relative to an anchor: "around" is a figure label, or a floor point [x, z].
- "azimuth" in degrees, measured from the anchor figure's facing at that time: 0 = directly in front of the figure, 90 = at the figure's left side, -90 = at its right side, 180 = directly behind it. For a floor-point anchor it is a compass angle.
- Distance is given by "size", how much of the anchor figure the lens shows: "extreme_wide", "wide", "full", "medium_wide", "medium", "medium_close", "close", "extreme_close". For a floor-point anchor give "distance" in metres instead.
- "height": camera height in metres (1.5 is eye level, 0.4 is low, 3+ is high, 6+ with size "wide" and "look" at the figure is overhead).
- "look": a figure label (the camera stays locked on that figure, even while it walks) or a point [x, y, z]. Default: the anchor.
- "lens": one of 14, 18, 24, 35, 50, 85, 135 (full frame). "ease": "linear", "in", "out" or "inout", for the stretch up to the next keyframe. "roll": degrees, usually 0.
- Cuts: when the description asks for cuts, a montage, a shot list or several shots, add "cut": true to the first keyframe of every shot after the first. The camera jumps to it instead of travelling. A shot is then one keyframe (a static shot, held until the next cut) or two (a move: the second one a frame before the next cut). Change size AND angle between consecutive shots (at least 30 degrees of azimuth), keep the camera on one side of the line between two people talking, and give each shot at least 1.5 seconds. Without such a request, make one continuous shot.
- Recipes. Orbit: keyframes every 45 degrees of azimuth round the same figure, same size. Dolly in or out: same azimuth, size changes. Crane: height changes. Tracking: same azimuth and size at the walker's start and end times, look = the walker. Follow: azimuth 180 on the walker. Leading: azimuth 0 on the walker. Over the shoulder of A onto B: around "A", azimuth 150 or -150, "distance" 1.3, height 1.6, look "B", lens 50. Whip pan: two keyframes 0.4 s apart at the same place with different "look". Dolly zoom: lens 85 to 24 while size stays the same.
- Hold a framing by repeating a keyframe. Give the move a clear start, development and end; do not add moves the description does not ask for.

ANSWER (JSON only)
{"duration": 4 to 30, "handheld": 0 to 100, "figures": [{"label": "A", "name": "", "x": 0, "z": 0, "facing": 0, "pose": "stand|sit|walk|run|kneel", "height": 1.5 to 2.0, "path": null}], "props": [{"kind": "wall", "x": 0, "z": -4, "rot": 0}], "camera": [{"t": 0, "around": "A", "azimuth": 0, "size": "full", "height": 1.5, "look": "A", "lens": 35, "ease": "inout", "roll": 0, "cut": false}], "notes": "one or two sentences in Greek, friendly, saying what you set up and any choice you made that the description left open"}`;function ux(){let n="";return ah.length&&(n+=`

THE DIRECTOR'S STANDING PREFERENCES (follow them unless the description says otherwise)
${ah.map(t=>`- ${t}`).join(`
`)}`),oh.length&&(n+=`

SCENES THIS DIRECTOR APPROVED (match their taste in distances, lenses and timing; do not copy them when the description differs)
${oh.map(t=>`Description: ${t.text}
Answer: ${JSON.stringify(t.scene)}`).join(`

`)}`),n}const dx={extreme_wide:4.2,wide:2.3,full:1.35,medium_wide:.9,medium:.58,medium_close:.36,close:.21,extreme_close:.11},fx=["stand","sit","walk","run","kneel"],px=["box","table","chair","door","wall","sofa","bed","bar","car","mic","tree","column"],mx=["linear","in","out","inout"],gx=[14,18,24,35,50,85,135],pe=(n,t)=>typeof n=="number"&&isFinite(n)?n:t,cn=n=>+n.toFixed(2);function va(n,t){const e=Math.round(ce(pe(n.duration,t.shot.duration),4,30)*2)/2,i=[];for(const l of(Array.isArray(n.figures)?n.figures:[]).slice(0,4)){const h=Qo[i.length],f=fx.includes(l.pose)?l.pose:"stand",p={id:we(),label:h,name:typeof l.name=="string"?l.name.slice(0,24):"",x:cn(ce(pe(l.x,0),-15,15)),z:cn(ce(pe(l.z,0),-15,15)),rot:Math.round(pe(l.facing,0)),height:cn(ce(pe(l.height,1.75),1.5,2)),pose:f},m=l.path;if(m&&typeof m=="object"){const g=ce(pe(m.t0,0),0,e-.25);p.path={x:cn(ce(pe(m.x,p.x),-15,15)),z:cn(ce(pe(m.z,p.z),-15,15)),t0:g,t1:ce(pe(m.t1,e),g+.25,e)},f!=="run"&&(p.pose="walk")}i.push(p)}const s=new Map;(Array.isArray(n.figures)?n.figures:[]).slice(0,4).forEach((l,h)=>s.set(String(l.label||Qo[h]),i[h]));const r=l=>typeof l=="string"&&s.get(l)||null,a=(Array.isArray(n.props)?n.props:[]).filter(l=>px.includes(l.kind)).slice(0,12).map(l=>({id:we(),kind:l.kind,x:cn(ce(pe(l.x,0),-18,18)),z:cn(ce(pe(l.z,0),-18,18)),rot:Math.round(pe(l.rot,0))})),o=Ri(t.shot.aspect),c=[];for(const l of(Array.isArray(n.camera)?n.camera:[]).slice(0,16)){const h=Math.round(ce(pe(l.t,0),0,e)*t.shot.fps)/t.shot.fps,f=gx.reduce((L,R)=>Math.abs(R-pe(l.lens,35))<Math.abs(L-pe(l.lens,35))?R:L,35),p=r(l.around)||(Array.isArray(l.around)?null:i[0]||null);let m=0,g=0,M=0,d=1.75;if(p){const L=xe(p,h);m=L.x,g=L.z,M=L.rot,d=p.height*Fn[L.pose]}else Array.isArray(l.around)&&(m=pe(l.around[0],0),g=pe(l.around[1],0));const u=dx[String(l.size)]||0,v=ce(typeof l.distance=="number"?l.distance:u?u*d/(2*Math.tan(si(f,o)*Ut/2)):4,.4,40),b=(M+pe(l.azimuth,0))*Ut,y=ce(pe(l.height,d*.85),.1,30),w=y>5&&!l.distance?Math.min(v,.6):v,T=[cn(m+Math.sin(b)*w),cn(y),cn(g+Math.cos(b)*w)],_=r(l.look)||(l.look===void 0||l.look===null?p:null),E=_?Eu(_,h).toArray().map(cn):Array.isArray(l.look)?[pe(l.look[0],m),pe(l.look[1],1.2),pe(l.look[2],g)]:[cn(m),1.2,cn(g)];c.push({id:we(),t:h,pos:T,target:E,roll:ce(pe(l.roll,0),-45,45),lens:f,ease:mx.includes(l.ease)?l.ease:"linear",look:_?_.label:null,cut:l.cut===!0})}if(c.sort((l,h)=>l.t-h.t),!i.length||c.length<1)throw new Error("Η απάντηση δεν είχε φιγούρες ή κάμερα. Δοκίμασε να το περιγράψεις λίγο πιο αναλυτικά.");return{v:1,figures:i,props:a,keys:c,shot:{...t.shot,duration:e,lens:c[0].lens,shake:Math.round(ce(pe(n.handheld,0),0,100)/5)*5}}}function _x(n){const t=n.indexOf("{"),e=n.lastIndexOf("}");if(t<0||e<=t)throw new Error("Το Claude δεν απάντησε με σκηνή. Δοκίμασε ξανά.");return JSON.parse(n.slice(t,e+1))}async function lh(n,t,e,i){const s={"content-type":"application/json","x-api-key":n,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},r={model:cx,max_tokens:16e3,system:hx+ux(),messages:[{role:"user",content:`Frame: ${e.shot.aspect}. Scene description:
${t}`}]};return i&&(s["anthropic-beta"]="server-side-fallback-2026-07-01",r.fallbacks="default"),fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:s,body:JSON.stringify(r)})}async function xx(n,t,e){var o,c;let i;try{i=await lh(n,t,e,!0),i.status===400&&(i=await lh(n,t,e,!1))}catch{throw new Error("Δεν υπάρχει σύνδεση με το Claude. Έλεγξε το internet και δοκίμασε ξανά.")}if(!i.ok){let l="";try{l=((c=(o=await i.json())==null?void 0:o.error)==null?void 0:c.message)||""}catch{}throw i.status===401?new Error("Το κλειδί δεν είναι σωστό. Έλεγξέ το και δοκίμασε ξανά."):i.status===429?new Error("Πολλά αιτήματα ή τελείωσε το υπόλοιπο του κλειδιού. Δοκίμασε σε λίγο."):i.status>=500?new Error("Το Claude είναι φορτωμένο αυτή τη στιγμή. Δοκίμασε ξανά σε λίγο."):new Error(`Claude ${i.status}${l?`: ${l}`:""}`)}const s=await i.json();if(s.stop_reason==="refusal")throw new Error("Το Claude αρνήθηκε αυτή την περιγραφή. Δοκίμασε να τη γράψεις αλλιώς.");const r=(s.content||[]).filter(l=>l.type==="text").map(l=>l.text||"").join(""),a=_x(r);return{project:va(a,e),notes:typeof a.notes=="string"?a.notes:""}}const vx="Follow the camera movement of @Video1 exactly; use it for camera motion and blocking only, ignore its look, materials and lighting.",Mx={stand:"standing",sit:"sitting",walk:"walking",run:"running",kneel:"kneeling"},ch=n=>((n+180)%360+360)%360-180,Zr=n=>/^[aeiou]/i.test(n)?"an":"a",Hs=(n,t)=>Math.max(t,Math.round(n/t)*t),Oi=n=>{const t=Math.max(.5,Math.round(n*2)/2);return`${Number.isInteger(t)?t:t.toFixed(1)} m`},Sx=n=>n.length>1?n.slice(0,-1).join(", ")+" and "+n[n.length-1]:n[0]||"";function xi(n){return n.target.clone().sub(n.pos).normalize()}function Ma(n,t){return n.height*Fn[xe(n,t).pose]}function On(n,t){const e=xe(n,t);return new N(e.x,Ma(n,t)*.6,e.z)}function Au(n,t){const e=new Ze(si(n.lens,t),t,.05,400);return e.position.copy(n.pos),Math.abs(xi(n).y)>.999&&e.up.set(0,0,-1),e.lookAt(n.target),e.updateMatrixWorld(),e}function yx(n,t,e){let i=null,s=1.5;for(const r of n.figures){const a=xe(r,e),o=Math.hypot(t.target.x-a.x,t.target.z-a.z);o<s&&(s=o,i=r)}return i}function hh(n,t,e,i){const s=Ma(t,e),o=2*n.pos.distanceTo(On(t,e))*Math.tan(si(n.lens,i)*Ut/2)/s;return o>3.2?"extreme wide shot":o>1.7?"wide shot":o>1.08?"full shot":o>.7?"medium wide shot":o>.44?"medium shot":o>.27?"medium close-up":o>.15?"close-up":"extreme close-up"}function ki(n,t,e){const i=t?Ma(t,e)*.93:1.6,s=Math.asin(rr.clamp(xi(n).y,-1,1))/Ut,r=n.pos.y;return s<-62?"overhead":r>i+.7||s<-20?"high angle":r<i*.6||r<i-.45&&s>6?"low angle":"eye level"}function al(n,t,e){const i=xe(t,e),s=new N(Math.sin(i.rot*Ut),0,Math.cos(i.rot*Ut)),r=new N(n.pos.x-i.x,0,n.pos.z-i.z);if(r.lengthSq()<.04)return"top view";r.normalize();const a=Math.acos(rr.clamp(s.dot(r),-1,1))/Ut,c=new N(s.z,0,-s.x).dot(r)>0?"left":"right";return a<25?"front view":a<70?`three-quarter front view from the ${c}`:a<110?`${c} profile`:a<155?`three-quarter back view from the ${c}`:"back view"}function Ru(n,t,e){const s=[],r=[];for(let U=0;U<=32;U++)r.push(t+(e-t)*U/32),s.push(Cn(n,r[U]));const a=s[0],o=s[32],c=Math.max(.001,e-t),l=yx(n,s[16],r[16]),h=l?l.label:"",f=U=>{const X=xe(l,r[U]);return new N(X.x,0,X.z)};let p=0,m=0,g=0;for(let U=1;U<=32;U++){p+=s[U].pos.distanceTo(s[U-1].pos);const X=xi(s[U-1]),J=xi(s[U]);if(Math.hypot(X.x,X.z)>.05&&Math.hypot(J.x,J.z)>.05&&(g+=ch(Math.atan2(J.x,-J.z)/Ut-Math.atan2(X.x,-X.z)/Ut)),l){const dt=s[U-1].pos.clone().sub(f(U-1)),Tt=s[U].pos.clone().sub(f(U));Math.hypot(dt.x,dt.z)>.3&&Math.hypot(Tt.x,Tt.z)>.3&&(m+=ch(Math.atan2(Tt.x,Tt.z)/Ut-Math.atan2(dt.x,dt.z)/Ut))}}const M=xi(a),d=xi(o),u=(Math.asin(rr.clamp(d.y,-1,1))-Math.asin(rr.clamp(M.y,-1,1)))/Ut,v=o.pos.clone().sub(a.pos),b=new N(M.x,0,M.z);b.lengthSq()<1e-6&&b.set(0,0,-1),b.normalize();const y=new N().crossVectors(b,new N(0,1,0)).normalize(),w=v.dot(y),T=v.dot(b),_=v.y,E=[];let L=!1,R=!1;if(l){const U=f(32).sub(f(0));R=U.length()>.8;const X=new N(v.x,0,v.z);if(R&&X.clone().sub(U).length()<.4*U.length()+.3){L=!0;const J=s[16].pos.clone().sub(f(16)).setY(0).normalize(),dt=J.dot(U.clone().normalize()),Tt=xe(l,r[16]).pose==="run"?"runs":"walks";if(dt>.6)E.push({key:"lead",base:`leading shot, camera moving backward ahead of ${h} as ${h} ${Tt} toward it`,ger:`leading ${h}`});else if(dt<-.6)E.push({key:"follow",base:`follow shot, camera moving behind ${h} as ${h} ${Tt} away`,ger:`following ${h} from behind`});else{const K=new N(U.z,0,-U.x).dot(J)>0?"left":"right";E.push({key:"track-"+K,base:`tracking shot alongside ${h}, camera on ${h}'s ${K} side moving parallel as ${h} ${Tt}`,ger:`tracking alongside ${h}`})}}}const I=!!l&&Math.abs(m)>=15&&(R||Math.abs(g)>=.5*Math.abs(m));if(I){const U=m>0?"right":"left",X=Hs(Math.abs(m),15);E.push({key:"arc-"+U,base:`arc ${U} ${X} degrees around ${h}`,ger:`arcing ${U} ${X} degrees around ${h}`})}let F=null,z=0;if(l){const U=a.pos.distanceTo(On(l,t)),X=o.pos.distanceTo(On(l,e));if(z=Math.abs(X-U),X<U*.87&&U-X>.3?F="in":X>U*1.15&&X-U>.3&&(F="out"),F&&p<.3&&(F=null),R&&!L){const J=On(l,t).sub(a.pos).setY(0).normalize(),dt=v.dot(J);F=dt>.5?"in":dt<-.5?"out":null,z=Math.abs(dt)}}else Math.abs(T)>.5&&Math.abs(T)>Math.abs(w)&&(F=T>0?"in":"out",z=Math.abs(T));const C=o.lens/a.lens,H=C>1.12?"in":C<.89?"out":null,$=`${Math.round(a.lens)}mm to ${Math.round(o.lens)}mm`,V=!!l&&Math.abs(Math.log(o.pos.distanceTo(On(l,e))/o.lens/(a.pos.distanceTo(On(l,t))/a.lens)))<.3;if(F&&H&&F!==H&&V){const U=F==="out"?"camera dollies out while the lens zooms in":"camera dollies in while the lens zooms out",X=h?` on ${h}`:"";E.push({key:"vertigo",base:`dolly zoom${X} (vertigo effect), ${U} from ${$}, the subject stays the same size while the background ${F==="in"?"stretches away":"compresses"}`,ger:`dolly zooming (vertigo effect, ${F==="out"?"out while zooming in":"in while zooming out"})`})}else{if(F){const X=h&&!I?F==="in"?` on ${h}`:` from ${h}`:"",J=z>.7?` about ${Oi(z)}`:"";E.push({key:"dolly-"+F,base:`dolly ${F}${X}${J}`,ger:`dollying ${F}${J}`})}const U=H&&c<1.2&&(C>1.8||C<.55);H&&E.push({key:(U?"crash-":"zoom-")+H,base:`${U?"crash zoom":"zoom"} ${H} from ${$}`,ger:`${U?"crash zooming":"zooming"} ${H} from ${$}`})}if(!I&&!L&&Math.abs(w)>.5&&Math.abs(w)>Math.abs(T)*.6){const U=w>0?"right":"left";E.push({key:"truck-"+U,base:`truck ${U} about ${Oi(Math.abs(w))}`,ger:`trucking ${U} about ${Oi(Math.abs(w))}`})}if(Math.abs(_)>.45){const U=_>0?"up":"down",X=ki(a,l,t),J=ki(o,l,e),dt=J!==X?`, reaching ${J==="eye level"?"eye level":Zr(J)+" "+J}`:"",Tt=` from about ${Oi(a.pos.y)} to ${Oi(o.pos.y)} high`;E.push({key:"crane-"+U,base:`crane ${U}${Tt}${dt}`,ger:`craning ${U}${Tt}${dt}`})}if(!I&&!L&&Math.abs(g)>12){const U=g>0?"right":"left",X=Math.abs(g)/c>110,J=Hs(Math.abs(g),15),dt=R&&p<.5?` following ${h}`:"";E.push(X?{key:"whip-"+U,base:`whip pan ${U} ${J} degrees with motion blur${h?`, landing on ${h}`:""}`,ger:`whip panning ${U}`}:{key:"pan-"+U,base:`pan ${U} ${J} degrees${dt}`,ger:`panning ${U} ${J} degrees${dt}`})}if(Math.abs(u)>12&&!E.some(U=>U.key.startsWith("whip"))){const U=u>0?"up":"down",X=Hs(Math.abs(u),5);E.push({key:"tilt-"+U,base:`tilt ${U} ${X} degrees`,ger:`tilting ${U} ${X} degrees`})}const et=o.roll-a.roll;if(Math.abs(et)>4){const U=Math.round(o.roll),X=ki(o,l,e)==="overhead";X&&E.push({key:"spin",base:`rotate the frame ${et>0?"clockwise":"counterclockwise"} ${Hs(Math.abs(et),5)} degrees while looking straight down`,ger:`rotating the frame ${et>0?"clockwise":"counterclockwise"} ${Hs(Math.abs(et),5)} degrees`});const J=Math.abs(U)<2?"roll back to level":`roll ${U>0?"clockwise":"counterclockwise"} into a ${Math.abs(U)} degree dutch angle`,dt=Math.abs(U)<2?"rolling back to level":`rolling into a ${Math.abs(U)} degree dutch angle`;X||E.push({key:"roll",base:J,ger:dt})}return{moves:E,sig:E.map(U=>U.key).join("+")+"|"+(l?l.id:""),subject:l,start:a,end:o,lin:p/c,ang:Math.max(Math.abs(m),I?0:Math.abs(g)*.6)/c,path:p}}function Ex(n){return!n.moves.length||n.moves[0].key.startsWith("whip")||n.moves[0].key.startsWith("crash")?"":n.moves[0].key.startsWith("arc")?n.ang>70?"fast ":n.ang<20?"slow ":"steady ":n.lin>1.5||n.ang>70?"fast ":n.lin<.45&&n.ang<22?"slow ":"steady "}function bx(n,t){const e=n==="in"||n==="inout",i=t==="out"||t==="inout";return e&&i?", easing in and out":e?", easing in from a standstill":i?", easing out to a stop":", at constant speed"}function uh(n,t,e,i,s,r=e,a=""){const o=Ri(n.shot.aspect),c=r,l=Ru(n,t,c),h=a||`${vn(t)}-${vn(e)}s`,f=l.subject||Tx(n,l.end,c,o),p=Math.round(l.start.lens),m=Math.round(l.end.lens),g=[],M=l.moves.some(b=>b.key.startsWith("zoom")||b.key.startsWith("crash")||b.key==="vertigo");if(g.push(M?`${p}mm to ${m}mm`:`${m}mm`),l.moves.some(b=>b.key.startsWith("crane"))){const b=ki(l.end,f,c);ki(l.start,f,t)===b&&g.push(b==="overhead"?"overhead top-down view throughout":`${b} throughout`)}else{const b=ki(l.start,f,t),y=ki(l.end,f,c),w=`camera about ${Oi(l.end.pos.y)} high`;g.push(b===y?`${y} (${w})`:`${b} to ${y}`)}if(f){const b=hh(l.start,f,t,o),y=hh(l.end,f,c,o);g.push(b===y?`holding ${Zr(y)} ${y} of ${f.label}`:`from ${Zr(b)} ${b} to ${Zr(y)} ${y} of ${f.label}`);const w=xi(l.end),T=l.end.pos.distanceTo(On(f,c)),_=n.figures.find(R=>{if(R===f)return!1;const I=xe(R,c),F=new N(I.x,l.end.pos.y,I.z).sub(l.end.pos),z=F.length();return z<1.9&&z<T&&F.normalize().dot(w)>.72});_&&g.push(`over ${_.label}'s shoulder, ${_.label} soft in the foreground with their back to camera`);const E=al(l.start,f,t),L=al(l.end,f,c);g.push(E===L?`seeing ${f.label} in ${L}`:`going from ${f.label}'s ${E} to ${L}`)}if(!l.moves.length){const b=l.subject?` on ${l.subject.label}`:"";return`${h}: static locked-off shot${b}, ${g.join(", ")}.`}const[d,...u]=l.moves,v=u.length?" while "+Sx(u.map(b=>b.ger)):"";return`${h}: ${Ex(l)}${d.base}${v}${bx(i,s)}, ${g.join(", ")}.`}function Tx(n,t,e,i){const s=Au(t,i);let r=null,a=1/0;for(const o of n.figures){const c=On(o,e).project(s);if(c.z>1||Math.abs(c.x)>1||Math.abs(c.y)>1)continue;const l=Math.hypot(c.x,c.y);l<a&&(a=l,r=o)}return r}function eo(n,t,e){const i=Ri(n.shot.aspect),s=Cn(n,e),r=Au(s,i),a=xe(t,e),o=new N(a.x,Ma(t,e)*.85,a.z).project(r);if(o.z>1||Math.abs(o.x)>1.05||Math.abs(o.y)>1.3)return"out of frame";const c=o.x<-.33?"frame left":o.x>.33?"frame right":"center frame",l=s.pos.distanceTo(On(t,e)),h=n.figures.filter(p=>p!==t).map(p=>s.pos.distanceTo(On(p,e))),f=h.length?h.every(p=>l<p-.6)?" in the foreground":h.every(p=>l>p+.6)?" in the background":"":"";return c+f}function wx(n,t,e){const i=al(Cn(n,e),t,e);return i==="front view"?"facing camera":i==="back view"?"back to camera":i.includes("profile")?"in profile":i.includes("front")?"turned three-quarters to camera":"turned three-quarters away from camera"}function Ax(n){const t=n.shot.duration,e=[];for(const i of[...n.figures].sort((s,r)=>s.label.localeCompare(r.label))){const s=i.name?`${i.label} (${i.name})`:i.label,r=As(i),a=eo(n,i,0);if(!i.path||r<.3){const L=a==="out of frame"?"":`, ${wx(n,i,0)}`;e.push(`${s}: ${Mx[i.pose]} ${a}${L}, stays in place for the whole shot.`);continue}const{t0:o,t1:c}=i.path,l=i.pose==="run",h=r/Math.max(.1,c-o),f=l?h>4.5?"sprints":"runs":h>1.9?"walks briskly":h<.7?"walks slowly":"walks",p=(o+c)/2,m=Cn(n,p),g=xi(m).setY(0);g.lengthSq()<1e-6&&g.set(0,0,-1),g.normalize();const M=new N().crossVectors(g,new N(0,1,0)),d=new N(i.path.x-i.x,0,i.path.z-i.z),u=d.dot(M),v=d.dot(g),b=u>0?"left to right":"right to left",y=v<0?"toward camera":"away from camera",w=Math.abs(u)>Math.abs(v)*1.6?`across the frame from ${b}`:Math.abs(v)>Math.abs(u)*1.6?y:`diagonally ${y}, moving ${b}`,T=o>.2?`stands ${a} until ${vn(o)}s, then `:`starts ${a} and `;let _=c<t-.2?`, stops at ${vn(c)}s ${eo(n,i,c)}`:`, ending ${eo(n,i,t)}`;const E=n.figures.find(L=>L!==i&&Math.hypot(xe(L,c).x-i.path.x,xe(L,c).z-i.path.z)<1.3);E&&(_+=`, next to ${E.label}`),e.push(`${s}: ${T}${f} about ${Oi(r)} ${w} from ${vn(o)}s to ${vn(c)}s${_}.`)}return e}function Rx(n){return n<=0?" Stabilized camera, no shake.":n<34?" Subtle handheld camera with a slight natural shake.":n<67?" Handheld camera with a natural, breathing shake.":" Rough handheld camera with strong, nervous shake."}function dh(n,t){const e=[];for(const i of t){const s=Ru(n,i.t0,i.end).sig,r=e[e.length-1];r&&r.sig===s?(r.t1=i.t1,r.end=i.end,r.last=i.ease):e.push({t0:i.t0,t1:i.t1,end:i.end,first:i.ease,last:i.ease,sig:s})}return e}function Pl(n){const t=n.keys,e=n.shot.duration,i=Ti(t),s=i.length>1,r=s?`${i.length} shots with hard cuts, ${vn(e)} seconds in total, ${n.shot.aspect}.`:`One continuous ${vn(e)} second shot, ${n.shot.aspect}, no cuts.`,a=[vx,"",`${r}${Rx(n.shot.shake)}`],o=Ax(n);if(o.length&&a.push("","Blocking:",...o),a.push("",s?"Shots:":"Camera:"),s)i.forEach((c,l)=>{const h=l===0?0:c[0].t,f=i[l+1]?i[l+1][0].t:e,p=i[l+1]?f-.002:f,m=[];c[0].t-h>.05&&m.push({t0:h,t1:c[0].t,ease:"linear",end:c[0].t});for(let M=0;M<c.length-1;M++)c[M+1].t-c[M].t>.01&&m.push({t0:c[M].t,t1:c[M+1].t,ease:c[M].ease,end:c[M+1].t});const g=c[c.length-1].t;f-g>.12||!m.length?m.push({t0:g,t1:f,ease:"linear",end:p}):m[m.length-1].t1=f,dh(n,m).forEach((M,d)=>{const u=d===0?`Shot ${l+1} (${vn(h)}-${vn(f)}s)${l?", hard cut":""}`:`  then, ${vn(M.t0)}-${vn(M.t1)}s`;a.push(uh(n,M.t0,M.t1,M.first,M.last,Math.min(M.end,p),u))})}),a.push("","Cut only at the times listed, with hard cuts and no transitions. Keep the characters, wardrobe, lighting and location identical in every shot, and no extra camera moves inside a shot.");else{const c=[];if(t.length<2)c.push({t0:0,t1:e,ease:"linear",end:e});else{t[0].t>.05&&c.push({t0:0,t1:t[0].t,ease:"linear",end:t[0].t});for(let h=0;h<t.length-1;h++)t[h+1].t-t[h].t>.01&&c.push({t0:t[h].t,t1:t[h+1].t,ease:t[h].ease,end:t[h+1].t});const l=t[t.length-1].t;e-l>.05&&c.push({t0:l,t1:e,ease:"linear",end:e})}for(const l of dh(n,c))a.push(uh(n,l.t0,l.t1,l.first,l.last));a.push("","Keep the motion smooth and continuous, with no cuts and no extra camera moves.")}return a.join(`
`).replace(/[\u2013\u2014]/g,"-")}const se=n=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${n}</svg>`,Lt={undo:se('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),redo:se('<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>'),play:se('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>'),pause:se('<path d="M8 5v14M16 5v14" stroke-width="3"/>'),loop:se('<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>'),person:se('<circle cx="12" cy="5" r="2.5"/><path d="M12 8v7M8 11h8M12 15l-3 6M12 15l3 6"/>'),cube:se('<path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/>'),key:se('<path d="M12 3 21 12 12 21 3 12z"/>'),lens:se('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>'),frame:se('<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><rect x="8" y="9" width="8" height="6" rx="1"/>'),text:se('<path d="M4 6h16M4 12h16M4 18h10"/>'),sliders:se('<path d="M4 6h10M18 6h2M4 18h4M12 18h8"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="18" r="2"/><path d="M4 12h2M10 12h10"/><circle cx="8" cy="12" r="2"/>'),close:se('<path d="M6 6l12 12M18 6 6 18"/>'),trash:se('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),eye:se('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),refresh:se('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),target:se('<circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'),rotL:se('<path d="M4 4v6h6"/><path d="M4.5 10A8 8 0 1 1 6 17"/>'),rotR:se('<path d="M20 4v6h-6"/><path d="M19.5 10A8 8 0 1 0 18 17"/>'),wand:se('<path d="M4 20 15 9M14 4v3M12.5 5.5h3M19 9v3M17.5 10.5h3M8 3v2M7 4h2"/><path d="m15 9 1.5-1.5"/>'),help:se('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/>'),walk:se('<circle cx="13" cy="4.5" r="2"/><path d="M13 8l-3 4 3 3v6M10 12l-3 1M13 10l3 2 2-1M10 16l-3 5"/>'),spark:se('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>'),check:se('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),down:se('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'),film:se('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 10h4M3 14h4M17 10h4M17 14h4"/>'),image:se('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m5 18 5-5 3 3 3-3 3 3"/>'),folder:se('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),copy:se('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>')},Yt=n=>document.getElementById(n),Cx=Yt("app"),Cu=Yt("stage"),Rs=Yt("dirView"),fh=Yt("shotView"),Cs=Yt("pip"),Ll=Yt("inspector"),$i=Yt("track"),Je=Yt("modal"),Bt=new C_,Gt=new nx(Yt("gl"),Rs),cr=window.matchMedia("(max-width: 820px)"),tt={time:0,playing:!1,loop:!0,sel:null,view:"director",frame:!1,camPanel:!1};let Sn=!0;const wt=()=>Bt.p,Zs=()=>Ri(wt().shot.aspect),Pu=n=>ce(Math.round(n*wt().shot.fps)/wt().shot.fps,0,wt().shot.duration),hr=n=>wt().figures.find(t=>t.id===n),Sa=n=>wt().props.find(t=>t.id===n),Yi=n=>wt().keys.find(t=>t.id===n);function Zi(n,t){document.querySelectorAll(n).forEach(e=>e.innerHTML=t)}Zi('[data-a="undo"]',Lt.undo);Zi('[data-a="redo"]',Lt.redo);Zi('[data-a="loop"]',Lt.loop);Zi('[data-a="add-prop"]',`${Lt.cube}<span>Αντικείμενο</span>`);Zi('[data-a="presets"]',`${Lt.wand}<span>Έτοιμα</span>`);Zi('[data-a="help"]',Lt.help);Zi("#aiBtn",`${Lt.spark}<span>Σκηνή με AI</span>`);Yt("promptBtn").innerHTML=`${Lt.text}<span>Prompt</span>`;Yt("exportBtn").innerHTML=`${Lt.down}<span>Export</span>`;Yt("addKey").innerHTML=`${Lt.key}<span>Keyframe</span>`;function Ke(n="edit"){var e;const t=wt();tt.sel&&!(tt.sel.kind==="figure"?hr(tt.sel.id):tt.sel.kind==="prop"?Sa(tt.sel.id):Yi(tt.sel.id))&&(tt.sel=null),tt.time=ce(tt.time,0,t.shot.duration),Gt.syncPath(t,Zs(),((e=tt.sel)==null?void 0:e.kind)==="key"?tt.sel.id:null),Du(),n!=="live"&&Lx(),vi(),Sn=!0}Bt.on(n=>Ke(n));function vi(){var s;const n=wt();Cx.className=`view-${tt.view}${tt.frame?" framing":""}${Px()?" ins-open":""}`,document.querySelectorAll('[data-a="undo"]').forEach(r=>r.disabled=!Bt.canUndo()),document.querySelectorAll('[data-a="redo"]').forEach(r=>r.disabled=!Bt.canRedo()),document.querySelectorAll("#viewSeg button").forEach(r=>r.classList.toggle("on",r.dataset.v===tt.view)),Yt("shotPill").innerHTML=`${Lt.sliders}<span>${n.shot.aspect} · ${Ve(n.shot.duration,n.shot.duration%1?1:0)}s · ${n.shot.fps}fps</span>`,Yt("playBtn").innerHTML=tt.playing?Lt.pause:Lt.play,Yt("loopBtn").classList.toggle("on",tt.loop);const t=Yt("addFig");t.innerHTML=`${Lt.person}<span>Φιγούρα</span>`,t.disabled=n.figures.length>=4;const e=((s=tt.sel)==null?void 0:s.kind)==="key"?Yi(tt.sel.id):null;Yt("lensBtn").innerHTML=`${Lt.lens}<span>Κάμερα · ${e?e.lens:n.shot.lens}mm</span>`,Yt("lensBtn").classList.toggle("on",!tt.sel&&tt.camPanel),Yt("frameBtn").innerHTML=`${Lt.frame}<span>Κάδρο φακού</span>`,Yt("frameBtn").classList.toggle("on",tt.frame),Yt("tc").textContent=xu(tt.time,n.shot.fps),Cs.style.aspectRatio=String(Zs()),Cs.style.width=Zs()<1?"24%":Zs()>2?"46%":"40%";const i=Cn(n,tt.time);Yt("shotInfo").textContent=`${Math.round(i.lens)}mm · ${n.shot.aspect}`,Yt("dirInfo").textContent=tt.frame?`μέσα από τον φακό · ${Lu()}mm`:"ελεύθερη κάμερα"}const Px=()=>!cr.matches||!!tt.sel||tt.camPanel,Lu=()=>{var t;const n=((t=tt.sel)==null?void 0:t.kind)==="key"?Yi(tt.sel.id):null;return n?n.lens:wt().shot.lens};function Du(){const n=wt(),t=n.shot.duration,e=$i.clientWidth<360,i=t>20?e?5:2:t>10&&e||e?2:1;let s="";for(let a=0;a<=t+1e-6;a+=i)s+=`<i style="left:${a/t*100}%"><b>${a}</b></i>`;Yt("ruler").innerHTML=s,Yt("keys").innerHTML=n.keys.map((a,o)=>{var c;return`<button class="kf${((c=tt.sel)==null?void 0:c.kind)==="key"&&tt.sel.id===a.id?" on":""}${a.cut?" cut":""}" data-key="${a.id}" style="left:${a.t/t*100}%" aria-label="Keyframe ${o+1}"></button>`}).join("");const r=Ti(n.keys);Yt("span").innerHTML=r.map((a,o)=>{const c=a[0].t,l=a[a.length-1].t,h=r[o+1]?r[o+1][0].t:r.length>1?t:l;return`<i style="left:${c/t*100}%;width:${(l-c)/t*100}%"></i><i class="hold" style="left:${l/t*100}%;width:${(h-l)/t*100}%"></i>`}).join(""),Dl()}function Dl(){Yt("head").style.left=`${tt.time/wt().shot.duration*100}%`,Yt("tc").textContent=xu(tt.time,wt().shot.fps)}function ol(n){const t=$i.getBoundingClientRect();return Pu((n-t.left)/t.width*wt().shot.duration)}let tn=null;$i.addEventListener("pointerdown",n=>{const t=n.target.closest("[data-key]");$i.setPointerCapture(n.pointerId),tt.playing=!1,t?(tn={id:t.dataset.key,x:n.clientX,moved:!1},zn({kind:"key",id:tn.id})):(tn={id:null,x:n.clientX,moved:!0},qi(ol(n.clientX))),vi()});$i.addEventListener("pointermove",n=>{if(!tn)return;if(!tn.id)return qi(ol(n.clientX));if(!tn.moved&&Math.abs(n.clientX-tn.x)<5)return;tn.moved=!0;const t=ol(n.clientX),e=tn.id;Bt.live(i=>{const s=i.keys.find(r=>r.id===e);s&&(s.t=t)}),qi(t)});const Iu=()=>{if(tn){if(tn.id)if(tn.moved)Bt.end();else{const n=Yi(tn.id);n&&qi(n.t)}tn=null}};$i.addEventListener("pointerup",Iu);$i.addEventListener("pointercancel",Iu);function qi(n){tt.time=ce(n,0,wt().shot.duration),Dl();const t=Cn(wt(),tt.time);Yt("shotInfo").textContent=`${Math.round(t.lens)}mm · ${wt().shot.aspect}`,Sn=!0}const Rn=(n,t,e)=>`<div class="chips">${t.map(i=>`<button class="chip${String(i.v)===String(e)?" on":""}" data-a="${n}" data-v="${i.v}">${bi(i.t)}</button>`).join("")}</div>`,ph=(n,t)=>Rn(n,T_.map(e=>({v:e,t:`${e}`})),t),Hr=(n,t)=>`<div class="ins-head">${t?`<span class="dot" style="background:${t}"></span>`:""}<b>${n}</b><button class="ico sm" data-a="close" aria-label="Κλείσιμο">${Lt.close}</button></div>`;function Lx(){var e;const n=tt.sel;let t="";if((n==null?void 0:n.kind)==="figure"){const i=hr(n.id);t=Hr(`Φιγούρα ${i.label}${i.name?` · ${bi(i.name)}`:""}`,vu[i.label])+`<div class="fld"><span>Στάση</span>${Rn("pose",A_.map(s=>({v:s.id,t:s.gr})),i.pose)}</div>`+mh(i.rot)+`<div class="fld"><span>Ύψος <em id="hv">${Ve(i.height,2)} m</em></span><input type="range" min="1.5" max="2" step="0.01" value="${i.height}" data-k="height"></div>`+Dx(i)+`<div class="row"><button class="pill" data-a="center">${Lt.target}<span>Κέντρο εδώ</span></button><div class="grow"></div><button class="pill danger" data-a="del">${Lt.trash}<span>Διαγραφή</span></button></div>`}else if((n==null?void 0:n.kind)==="prop"){const i=Sa(n.id),s=((e=Mu.find(r=>r.id===i.kind))==null?void 0:e.gr)||"";t=Hr(s)+mh(i.rot)+`<div class="row"><button class="pill" data-a="center">${Lt.target}<span>Κέντρο εδώ</span></button><div class="grow"></div><button class="pill danger" data-a="del">${Lt.trash}<span>Διαγραφή</span></button></div>`}else if((n==null?void 0:n.kind)==="key"){const i=Yi(n.id),s=wt().keys.indexOf(i),r=s===wt().keys.length-1;t=Hr(`Keyframe ${s+1} / ${wt().keys.length} · ${Ve(i.t,2)} s`)+`<div class="fld"><span>Φακός (mm)</span>${ph("klens",i.lens)}</div>`+(r?"":`<div class="fld"><span>Μετάβαση ως το επόμενο</span>${Rn("kease",R_.map(a=>({v:a.id,t:a.gr})),i.ease)}</div>`)+(s===0?"":`<div class="fld"><span>Πώς φτάνει εδώ η κάμερα</span>${Rn("kcut",[{v:"0",t:"Με κίνηση"},{v:"1",t:"Με cut (νέο πλάνο)"}],i.cut?"1":"0")}</div>`)+`<div class="fld"><span>Η κάμερα κοιτάει</span>${Rn("klook",[{v:"",t:"Ελεύθερα"},...wt().figures.map(a=>({v:a.label,t:`Κλειδωμένη στο ${a.label}`}))],i.look||"")}</div><div class="fld"><span>Roll <em id="rv">${Math.round(i.roll)}°</em></span><input type="range" min="-45" max="45" step="1" value="${i.roll}" data-k="roll"></div><div class="row wrap"><button class="pill" data-a="goto">${Lt.eye}<span>Δες από εδώ</span></button><button class="pill" data-a="kupdate">${Lt.refresh}<span>Ενημέρωσε από την τρέχουσα θέση</span></button></div><div class="row"><div class="grow"></div><button class="pill danger" data-a="del">${Lt.trash}<span>Διαγραφή</span></button></div>`}else{const i=wt().keys;t=Hr("Κάμερα")+`<div class="fld"><span>Φακός για νέο keyframe (mm)</span>${ph("lens",wt().shot.lens)}</div><div class="fld"><span>Handheld <em id="shv">${Nu(wt().shot.shake)}</em></span><input type="range" min="0" max="100" step="5" value="${wt().shot.shake}" data-k="shake"></div><button class="pill wide" data-a="presets">${Lt.wand}<span>Έτοιμες κινήσεις και σκηνές</span></button><p class="hint">Στήσε τη Director view όπως θες το κάδρο, διάλεξε χρόνο στο timeline και πάτα Keyframe. Με το Κάδρο φακού βλέπεις ακριβώς ό,τι γράφει η κάμερα.</p><button class="pill main wide" data-a="add-key">${Lt.key}<span>Πρόσθεσε keyframe από την τρέχουσα θέση</span></button>`+(i.length?`<div class="fld"><span>Keyframes</span><div class="chips">${i.map((s,r)=>`<button class="chip" data-a="pick-key" data-v="${s.id}">${r+1} · ${Ve(s.t,1)}s · ${s.lens}mm</button>`).join("")}</div></div>`:"")}Ll.innerHTML=t}const Nu=n=>n<=0?"κλειστό":`${n} · ${n<34?"ελαφρύ":n<67?"φυσικό":"έντονο"}`;function Dx(n){const t=wt().shot.duration;if(!n.path)return`<div class="fld"><span>Κίνηση</span><button class="pill wide" data-a="path-add">${Lt.walk}<span>Να περπατήσει ως ένα σημείο</span></button></div>`;const e=As(n)/Math.max(.1,n.path.t1-n.path.t0);return`<div class="fld"><span>Κίνηση <em id="pinfo">${Ve(As(n),1)} m · ${Ve(e,1)} m/s</em></span>${Rn("gait",[{v:"walk",t:"Περπάτημα"},{v:"run",t:"Τρέξιμο"}],n.pose==="run"?"run":"walk")}<p class="hint">Σύρε τη σημαία στη Director για να ορίσεις πού φτάνει.</p></div><div class="fld"><span>Ξεκινά <em id="p0v">${Ve(n.path.t0,1)} s</em></span><input type="range" min="0" max="${t}" step="0.25" value="${n.path.t0}" data-k="pt0"></div><div class="fld"><span>Φτάνει <em id="p1v">${Ve(n.path.t1,1)} s</em></span><input type="range" min="0" max="${t}" step="0.25" value="${n.path.t1}" data-k="pt1"></div><button class="pill" data-a="path-del">${Lt.close}<span>Χωρίς κίνηση</span></button>`}const mh=n=>`<div class="fld"><span>Περιστροφή <em id="rotv">${Math.round(n)}°</em></span><div class="row"><button class="ico" data-a="rot" data-v="-45" aria-label="45° αριστερά">${Lt.rotL}</button><input type="range" min="-180" max="180" step="5" value="${n}" data-k="rot"><button class="ico" data-a="rot" data-v="45" aria-label="45° δεξιά">${Lt.rotR}</button></div></div>`;Ll.addEventListener("input",n=>{const t=n.target,e=t.dataset.k,i=tt.sel;if(!e)return;const s=Number(t.value);if(e==="shake"){Bt.live(a=>a.shot.shake=s),Yt("shv").textContent=Nu(s);return}if(!i)return;Bt.live(a=>{if(i.kind==="key"){const c=a.keys.find(l=>l.id===i.id);c&&e==="roll"&&(c.roll=s);return}if(i.kind==="prop"){const c=a.props.find(l=>l.id===i.id);c&&e==="rot"&&(c.rot=s);return}const o=a.figures.find(c=>c.id===i.id);o&&(e==="rot"&&(o.rot=s),e==="height"&&(o.height=s),o.path&&e==="pt0"&&(o.path.t0=Math.min(s,o.path.t1-.25)),o.path&&e==="pt1"&&(o.path.t1=Math.max(s,o.path.t0+.25)))});const r={rot:"rotv",height:"hv",roll:"rv",pt0:"p0v",pt1:"p1v"}[e];Yt(r).textContent=e==="height"?`${Ve(s,2)} m`:e==="pt0"||e==="pt1"?`${Ve(s,1)} s`:`${Math.round(s)}°`,(e==="pt0"||e==="pt1")&&qi(s)});Ll.addEventListener("change",n=>{n.target.dataset.k&&Bt.end()});function zn(n){tt.sel=n,n&&(tt.camPanel=!1),Ke("sel")}function Js(n,t,e){const i=Gt.controls,s=new N(n,t,e).sub(i.target);i.target.add(s),Gt.dirCam.position.add(s),i.update(),Sn=!0}function Ix(){const n=Gt.controls.target;return new N(n.x,0,n.z)}function gh(){const n=Ix(),t=[...wt().figures.map(e=>[e.x,e.z]),...wt().props.map(e=>[e.x,e.z])];for(let e=0;e<12;e++)for(let i=0;i<8;i++){const s=n.x+(e?Math.cos(i/8*Math.PI*2)*e*.9:0),r=n.z+(e?Math.sin(i/8*Math.PI*2)*e*.9:0);if(t.every(([a,o])=>Math.hypot(a-s,o-r)>.9))return new N(s,0,r);if(!e)break}return n}function Uu(){const n=wt(),t=Pu(tt.time),e=Gt.dirCam.position.toArray().map(a=>+a.toFixed(3)),i=Gt.controls.target.toArray().map(a=>+a.toFixed(3)),s=n.keys.find(a=>Math.abs(a.t-t)<.5/n.shot.fps);let r=(s==null?void 0:s.id)||we();Bt.commit(a=>{const o=a.keys.find(c=>c.id===r);o?Object.assign(o,{pos:e,target:i}):a.keys.push({id:r,t,pos:e,target:i,roll:0,lens:a.shot.lens,ease:"linear"})}),zn({kind:"key",id:r}),xn(s?"Το keyframe ενημερώθηκε":"Νέο keyframe")}async function la(n,t){var i,s,r;const e=tt.sel;switch(n){case"undo":return Bt.undo();case"redo":return Bt.redo();case"view":return tt.view=t,Ke("sel");case"play":return!tt.playing&&tt.time>=wt().shot.duration-.001&&(tt.time=0),tt.playing=!tt.playing,vi();case"loop":return tt.loop=!tt.loop,vi();case"frame":return tt.frame=!tt.frame,Sn=!0,vi();case"camera":return cr.matches&&!tt.sel&&tt.camPanel?(tt.camPanel=!1,Ke("sel")):(tt.sel=null,tt.camPanel=!0,Ke("sel"));case"close":return tt.sel=null,tt.camPanel=!1,Ke("sel");case"add-key":return Uu();case"pick-key":{const a=Yi(t);return a&&qi(a.t),zn({kind:"key",id:t})}case"add-fig":{const a=new Set(wt().figures.map(h=>h.label)),o=Qo.find(h=>!a.has(h));if(!o)return;const c=gh(),l=we();return Bt.commit(h=>h.figures.push({id:l,label:o,x:+c.x.toFixed(2),z:+c.z.toFixed(2),rot:0,height:1.75,pose:"stand"})),zn({kind:"figure",id:l})}case"add-prop":return nn(`<h2>Πρόσθεσε αντικείμενο</h2><div class="grid">${Mu.map(a=>`<button class="pill" data-a="new-prop" data-v="${a.id}">${Lt.cube}<span>${a.gr}</span></button>`).join("")}</div><div class="foot"><button class="pill" data-a="modal-close">Κλείσιμο</button></div>`);case"new-prop":{hn();const a=gh(),o=we();return Bt.commit(c=>c.props.push({id:o,kind:t,x:+a.x.toFixed(2),z:+a.z.toFixed(2),rot:0})),zn({kind:"prop",id:o})}case"presets":return io();case"ready-tab":return $s=t,io();case"ready-scene":{const a=il.find(c=>c.id===t);if(!a)return;const o=va(a.scene,wt());return Bt.replace(o),hn(),tt.sel=null,tt.frame=!1,tt.time=0,tt.playing=!0,Js(0,.9,0),Ke("sel"),xn(`${a.gr}. Δεν σου κάνει; Αναίρεση.`)}case"preset-fig":return mi=t,io();case"cuts":{const a=wt().figures.find(c=>c.id===mi)||wt().figures[0];if(!a)return;const o=(i=nl.find(c=>c.id===t))==null?void 0:i.gr;return Bt.commit(c=>{const l=c.figures.find(h=>h.id===a.id);l&&sx(c,t,l)}),hn(),tt.sel=null,tt.frame=!1,tt.time=0,tt.playing=!0,Ke("sel"),xn(`${o}: ${Ti(wt().keys).length} πλάνα. Δεν σου κάνει; Αναίρεση.`)}case"kcut":return Bt.commit(a=>{const o=a.keys.find(c=>c.id===(e==null?void 0:e.id));o&&(o.cut=t==="1")});case"preset":{const a=wt().figures.find(c=>c.id===mi)||wt().figures[0];if(!a)return;const o=(s=el.find(c=>c.id===t))==null?void 0:s.gr;return Bt.commit(c=>{const l=c.figures.find(h=>h.id===a.id);l&&ix(c,t,l)}),hn(),tt.sel=null,tt.frame=!1,tt.time=0,tt.playing=!0,Ke("sel"),xn(`${o} γύρω από το ${a.label}. Δεν σου κάνει; Αναίρεση.`)}case"help":return Fu();case"export":return Ou();case"ex-video":return Fx();case"ex-stop":cl.now=!0;return;case"ex-save":return js&&so([js.blob],[js.name]);case"ex-frame":{const a=wt(),o=(xa(a)-1)/a.shot.fps,c=Ti(a.keys),l=t==="start"?[0]:t==="end"?[o]:c.map((f,p)=>p?f[0].t:0),h=t==="start"?["previz-start.png"]:t==="end"?["previz-end.png"]:l.map((f,p)=>`previz-shot-${p+1}.png`);tt.playing=!1;try{const f=await lx(Gt,a,l);Sn=!0,await so(f,h)}catch{xn("Το καρέ δεν βγήκε. Δοκίμασε ξανά.")}return}case"ex-project":return so([new Blob([JSON.stringify(wt(),null,1)],{type:"application/json"})],["scene.previz.json"]);case"ex-open":return Yt("fileIn").click();case"share":return await ll(_h()),hn(),xn("Το link της σκηνής αντιγράφηκε");case"approve":return kx();case"approve-copy":{const a=(((r=Je.querySelector("#apText"))==null?void 0:r.value)||"").trim();return await ll(`ΣΩΣΤΟ ΠΛΑΝΟ
${a||"(χωρίς σημείωση)"}

${Pl(wt())}

${_h()}`),hn(),xn("Αντιγράφηκε. Επικόλλησέ το στο Claude.")}case"ai":return Qs();case"ai-run":return Nx();case"ai-key":return wu(""),Qs();case"path-add":return Bt.commit(a=>{const o=a.figures.find(l=>l.id===(e==null?void 0:e.id));if(!o)return;const c=o.rot*Math.PI/180;o.path={x:+(o.x+Math.sin(c)*4).toFixed(2),z:+(o.z+Math.cos(c)*4).toFixed(2),t0:0,t1:Math.min(a.shot.duration,3)},o.pose!=="run"&&(o.pose="walk")});case"path-del":return Bt.commit(a=>{const o=a.figures.find(c=>c.id===(e==null?void 0:e.id));o&&(o.path=null,o.pose="stand")});case"gait":return Bt.commit(a=>{const o=a.figures.find(c=>c.id===(e==null?void 0:e.id));o&&(o.pose=t)});case"klook":return Bt.commit(a=>{const o=a.keys.find(c=>c.id===(e==null?void 0:e.id));o&&(o.look=t||null)});case"pose":return Bt.commit(a=>{const o=a.figures.find(c=>c.id===(e==null?void 0:e.id));o&&(o.pose=t,o.path&&t!=="walk"&&t!=="run"&&(o.path=null))});case"rot":return Bt.commit(a=>{const o=(e==null?void 0:e.kind)==="figure"?a.figures.find(c=>c.id===e.id):a.props.find(c=>c.id===(e==null?void 0:e.id));o&&(o.rot=((o.rot+Number(t)+180)%360+360)%360-180)});case"center":{const a=(e==null?void 0:e.kind)==="figure"?hr(e.id):null,o=(e==null?void 0:e.kind)==="prop"?Sa(e.id):null;if(a){const c=xe(a,tt.time);Js(c.x,a.height*.55,c.z)}else o&&Js(o.x,.6,o.z);return}case"del":return e?(Bt.commit(a=>{e.kind==="figure"&&(a.figures=a.figures.filter(o=>o.id!==e.id)),e.kind==="prop"&&(a.props=a.props.filter(o=>o.id!==e.id)),e.kind==="key"&&(a.keys=a.keys.filter(o=>o.id!==e.id))}),zn(null)):void 0;case"lens":return Bt.commit(a=>a.shot.lens=Number(t));case"klens":return Bt.commit(a=>{const o=a.keys.find(c=>c.id===(e==null?void 0:e.id));o&&(o.lens=Number(t))});case"kease":return Bt.commit(a=>{const o=a.keys.find(c=>c.id===(e==null?void 0:e.id));o&&(o.ease=t)});case"goto":{const a=(e==null?void 0:e.kind)==="key"?Yi(e.id):null;return a?(Gt.dirCam.position.set(...a.pos),Gt.controls.target.copy(gs(wt(),a,a.t)),Gt.controls.update(),tt.frame=!0,qi(a.t),vi()):void 0}case"kupdate":{const a=(e==null?void 0:e.kind)==="key"?e.id:"";return Bt.commit(o=>{const c=o.keys.find(l=>l.id===a);c&&(c.pos=Gt.dirCam.position.toArray().map(l=>+l.toFixed(3)),c.target=Gt.controls.target.toArray().map(l=>+l.toFixed(3)))}),xn("Το keyframe ενημερώθηκε")}case"settings":return no();case"aspect":return Bt.commit(a=>a.shot.aspect=t),no();case"fps":return Bt.commit(a=>a.shot.fps=Number(t)),no();case"clear-keys":return Bt.commit(a=>a.keys=[]),hn(),xn("Τα keyframes καθάρισαν");case"example":return Bt.replace(Su()),tt.time=0,hn(),zn(null);case"prompt":return Ux();case"copy":return Bx();case"modal-close":return hn()}}document.addEventListener("click",n=>{const t=n.target.closest("[data-a]");!t||t.disabled||la(t.dataset.a,t.dataset.v)});function nn(n){Je.innerHTML=`<div class="card">${n}</div>`,Je.hidden=!1}function hn(){Je.hidden=!0,Je.innerHTML=""}Je.addEventListener("click",n=>{n.target===Je&&hn()});function no(){const n=wt().shot;nn(`<h2>Πλάνο</h2><div class="fld"><span>Aspect</span>${Rn("aspect",w_.map(e=>({v:e,t:e})),n.aspect)}</div><div class="fld"><span>Διάρκεια <em id="dv">${Ve(n.duration,1)} s</em></span><input type="range" min="4" max="30" step="0.5" value="${n.duration}" id="durIn"></div><div class="fld"><span>Καρέ το δευτερόλεπτο</span>${Rn("fps",[24,25].map(e=>({v:e,t:`${e} fps`})),n.fps)}</div><p class="hint">Αλλάζοντας τη διάρκεια, τα keyframes απλώνονται ή μαζεύονται αναλογικά.</p><div class="foot"><button class="pill" data-a="help">${Lt.help}<span>Οδηγίες</span></button><button class="pill" data-a="share">${Lt.copy}<span>Link σκηνής</span></button><button class="pill" data-a="export">${Lt.down}<span>Export</span></button><button class="pill" data-a="clear-keys">${Lt.trash}<span>Κενό πλάνο</span></button><button class="pill" data-a="example">${Lt.refresh}<span>Το παράδειγμα</span></button><div class="grow"></div><button class="pill main" data-a="modal-close">Έτοιμο</button></div>`);const t=Je.querySelector("#durIn");t.addEventListener("input",()=>Yt("dv").textContent=`${Ve(Number(t.value),1)} s`),t.addEventListener("change",()=>{const e=Number(t.value);Bt.commit(i=>{const s=e/i.shot.duration;for(const r of i.keys)r.t=Math.round(r.t*s*i.shot.fps)/i.shot.fps;for(const r of i.figures)r.path&&(r.path.t0=Math.round(r.path.t0*s*4)/4,r.path.t1=Math.round(r.path.t1*s*4)/4);i.shot.duration=e}),tt.time=ce(tt.time*1,0,e)})}let mi="",$s="moves";function io(){var t;const n=wt().figures;n.length||($s="scenes"),((t=tt.sel)==null?void 0:t.kind)==="figure"&&Je.hidden&&(mi=tt.sel.id),n.some(e=>e.id===mi)||(mi=n[0].id),nn("<h2>Έτοιμα</h2>"+Rn("ready-tab",[{v:"moves",t:`Κινήσεις κάμερας · ${el.length}`},{v:"cuts",t:`Μοντάζ με cuts · ${nl.length}`},{v:"scenes",t:`Ολόκληρες σκηνές · ${il.length}`}],$s)+`<button class="pill wide ai" data-a="ai">${Lt.spark}<span>Ή περιέγραψε τη σκηνή με λόγια και στήνεται μόνη της</span></button>`+($s==="moves"?`<div class="fld"><span>Γύρω από</span>${Rn("preset-fig",n.map(e=>({v:e.id,t:`Φιγούρα ${e.label}`})),mi)}</div><div class="grid">${el.map(e=>`<button class="pill two" data-a="preset" data-v="${e.id}"><b>${e.gr}</b><small>${e.note}</small></button>`).join("")}</div><p class="hint">Η κίνηση αντικαθιστά τα keyframes του πλάνου, με τον φακό και τη διάρκεια που έχεις ορίσει. Μετά τα πειράζεις όπως θες.</p>`:$s==="cuts"?`<div class="fld"><span>Πάνω σε</span>${Rn("preset-fig",n.map(e=>({v:e.id,t:`Φιγούρα ${e.label}`})),mi)}</div><div class="grid">${nl.map(e=>`<button class="pill two" data-a="cuts" data-v="${e.id}"><b>${e.gr}</b><small>${e.note}</small></button>`).join("")}</div><p class="hint">Πολλά πλάνα με cut μέσα στην ίδια διάρκεια. Τα πλάνα διαλόγου παίρνουν και τη φιγούρα που είναι πιο κοντά. Αντικαθιστά τα keyframes.</p>`:`<div class="grid">${il.map(e=>`<button class="pill two" data-a="ready-scene" data-v="${e.id}"><b>${e.gr}</b><small>${e.note}</small></button>`).join("")}</div><p class="hint">Η σκηνή αντικαθιστά ό,τι έχεις στήσει: φιγούρες, χώρο και κίνηση κάμερας. Με την Αναίρεση γυρνάς πίσω.</p>`)+'<div class="foot"><div class="grow"></div><button class="pill" data-a="modal-close">Κλείσιμο</button></div>')}function Qs(n=""){var s;let t="";try{t=localStorage.getItem("tml_previz_ai_text")||""}catch{}const e=(s=Je.querySelector("#aiText"))==null?void 0:s.value,i=!!Tu();nn(`<h2>Σκηνή με AI</h2><p class="hint">Γράψε τη σκηνή όπως θα την έλεγες στον οπερατέρ: ποιοι είναι, πού στέκονται, τι κάνουν και πώς κινείται η κάμερα. Το Claude στήνει φιγούρες, χώρο και κίνηση, και μετά τα διορθώνεις με το χέρι.</p><textarea id="aiText" class="write" placeholder="Π.χ. Ο Νίκος μπαίνει από την πόρτα και περπατάει ως το τραπέζι όπου κάθεται η Μαρία. Η κάμερα τον ακολουθεί από πίσω και καταλήγει σε over the shoulder πάνω της. 8 δευτερόλεπτα, 35mm.">${bi(e??t)}</textarea>`+(i?"":'<div class="fld"><span>Κλειδί Claude API</span><input id="aiKey" class="write" type="password" autocomplete="off" placeholder="sk-ant-..."><p class="hint">Μένει μόνο σε αυτή τη συσκευή. Το φτιάχνεις στο console.anthropic.com, στο API keys.</p></div>')+(n?`<p class="err">${bi(n)}</p>`:"")+`<div class="foot">${i?'<button class="pill" data-a="ai-key">Άλλαξε κλειδί</button>':""}<div class="grow"></div><button class="pill" data-a="modal-close">Κλείσιμο</button><button class="pill main" data-a="ai-run" id="aiRun">${Lt.spark}<span>Στήσε τη σκηνή</span></button></div>`)}async function Nx(){var s,r;const n=(((s=Je.querySelector("#aiText"))==null?void 0:s.value)||"").trim(),t=(((r=Je.querySelector("#aiKey"))==null?void 0:r.value)||"").trim();t&&wu(t);const e=Tu();if(!n)return Qs("Γράψε πρώτα τη σκηνή.");if(!e)return Qs("Βάλε το κλειδί Claude API.");try{localStorage.setItem("tml_previz_ai_text",n)}catch{}const i=Yt("aiRun");i.disabled=!0,i.innerHTML='<span class="spin"></span><span>Στήνω τη σκηνή, ως ένα λεπτό…</span>';try{const{project:a,notes:o}=await xx(e,n,wt());Bt.replace(a),hn(),tt.sel=null,tt.frame=!1,tt.time=0,tt.playing=!0;const c=a.figures[0];Js(c.x,.9,c.z),Ke("sel"),o&&nn(`<h2>Έτοιμη η σκηνή</h2><p class="note">${bi(o)}</p><p class="hint">Δεν σου κάνει; Πάτα Αναίρεση και γυρνάς εκεί που ήσουν.</p><div class="foot"><div class="grow"></div><button class="pill" data-a="ai">Γράψ' το αλλιώς</button><button class="pill main" data-a="modal-close">Να το δω</button></div>`)}catch(a){Je.hidden||Qs(a instanceof Error?a.message:"Κάτι πήγε στραβά. Δοκίμασε ξανά.")}}function Fu(){const n=(t,e,i)=>`<div class="step"><i>${t}</i><div><b>${e}</b><p>${i}</p></div></div>`;nn("<h2>Πώς δουλεύει</h2>"+n(1,"Στήσε τη σκηνή","Σύρε τις φιγούρες με το δάχτυλο. Πάτα μία για στάση, ύψος, περιστροφή ή για να περπατήσει ως ένα σημείο.")+n(2,"Διάλεξε κάτι έτοιμο","Στα Έτοιμα (το ραβδάκι) έχει κινήσεις κάμερας όπως orbit, dolly, crane, vertigo, και ολόκληρες σκηνές όπως διάλογος, walk and talk, καταδίωξη.")+n(3,"Ή φτιάξ'τη δική σου","Γύρνα τη Director view, διάλεξε χρόνο στο timeline και πάτα Keyframe. Με το Κάδρο φακού βλέπεις ό,τι γράφει η κάμερα.")+n(4,"Ή γράψ'την με λόγια","Στο Σκηνή με AI περιγράφεις τη σκηνή και το Claude στήνει φιγούρες, χώρο και κίνηση κάμερας. Θέλει ένα κλειδί Claude API.")+n(5,"Πάρε το prompt","Το Prompt γράφει στα αγγλικά την κίνηση της κάμερας και των χαρακτήρων, έτοιμο για Seedance.")+'<div class="foot"><div class="grow"></div><button class="pill main" data-a="modal-close">Πάμε</button></div>')}function Ux(){const n=Pl(wt());nn(`<h2>Prompt</h2><p class="hint">Ανέβασε το βίντεο reference ως @Video1 και επικόλλησε αυτό το κείμενο.</p><textarea id="promptText" readonly spellcheck="false">${bi(n)}</textarea><div class="foot"><button class="pill" data-a="export">${Lt.down}<span>Export βίντεο</span></button><button class="pill" data-a="approve">${Lt.check}<span>Σωστό πλάνο</span></button><div class="grow"></div><button class="pill" data-a="modal-close">Κλείσιμο</button><button class="pill main" data-a="copy" id="copyBtn">${Lt.copy}<span>Αντιγραφή</span></button></div>`)}async function ll(n){try{await navigator.clipboard.writeText(n)}catch{const t=document.createElement("textarea");t.value=n,document.body.appendChild(t),t.select(),document.execCommand("copy"),t.remove()}}const cl={now:!1};let js=null;async function so(n,t){var i;const e=n.map((s,r)=>new File([s],t[r],{type:s.type}));if(cr.matches&&((i=navigator.canShare)!=null&&i.call(navigator,{files:e})))try{await navigator.share({files:e});return}catch(s){if(s.name==="AbortError")return}for(const s of e){const r=document.createElement("a");r.href=URL.createObjectURL(s),r.download=s.name,document.body.appendChild(r),r.click(),r.remove(),setTimeout(()=>URL.revokeObjectURL(r.href),2e4),await new Promise(a=>setTimeout(a,250))}}function Ou(){const n=wt(),{w:t,h:e}=_a(n),i=Ti(n.keys).length;nn(`<h2>Export</h2><p class="hint">${t} x ${e} · ${Ve(n.shot.duration,n.shot.duration%1?1:0)} s · ${n.shot.fps} fps · ${xa(n)} καρέ${i>1?` · ${i} πλάνα`:""}</p><button class="pill main wide" data-a="ex-video">${Lt.film}<span>Βίντεο reference (MP4)</span></button><p class="hint">Η Shot view καρέ καρέ, χωρίς τίποτα πάνω στο κάδρο. Το ανεβάζεις στο Seedance ως @Video1.</p><div class="fld"><span>Καρέ σε PNG</span><div class="row wrap"><button class="pill" data-a="ex-frame" data-v="start">${Lt.image}<span>Start frame</span></button><button class="pill" data-a="ex-frame" data-v="end">${Lt.image}<span>End frame</span></button>${i>1?`<button class="pill" data-a="ex-frame" data-v="shots">${Lt.image}<span>Πρώτο καρέ κάθε πλάνου</span></button>`:""}</div></div><div class="fld"><span>Αρχείο σκηνής</span><div class="row wrap"><button class="pill" data-a="ex-project">${Lt.down}<span>Αποθήκευση</span></button><button class="pill" data-a="ex-open">${Lt.folder}<span>Άνοιγμα αρχείου</span></button></div></div><div class="foot"><div class="grow"></div><button class="pill" data-a="modal-close">Κλείσιμο</button></div>`)}async function Fx(){const n=wt();if(!await bu(n))return nn('<h2>Export</h2><p class="big">Αυτός ο browser δεν γράφει MP4.</p><p class="hint">Θέλει Chrome, Edge ή Safari 16.4 και νεότερο. Τα καρέ PNG και το αρχείο σκηνής δουλεύουν παντού.</p><div class="foot"><div class="grow"></div><button class="pill main" data-a="export">Πίσω</button></div>');tt.playing=!1,cl.now=!1,js=null,vi(),nn('<h2>Γράφω το βίντεο</h2><div class="bar"><i id="exBar"></i></div><p class="hint" id="exTxt">Ξεκινάω…</p><p class="hint">Κράτα την οθόνη ανοιχτή μέχρι να τελειώσει.</p><div class="foot"><div class="grow"></div><button class="pill" data-a="ex-stop">Άκυρο</button></div>');const t=performance.now();try{const e=await ox(Gt,n,(s,r)=>{const a=document.getElementById("exBar");a&&(a.style.width=`${s/r*100}%`);const o=document.getElementById("exTxt");o&&(o.textContent=`Καρέ ${s} από ${r}`)},cl);js={blob:e,name:"previz-reference.mp4"};const i=Math.round((performance.now()-t)/1e3);nn(`<h2>Έτοιμο το βίντεο</h2><video class="preview" src="${URL.createObjectURL(e)}" controls loop muted playsinline autoplay></video><p class="hint">${xa(n)} καρέ · ${Ve(e.size/1048576,1)} MB · γράφτηκε σε ${i} s</p><div class="foot"><div class="grow"></div><button class="pill" data-a="export">Πίσω</button><button class="pill main" data-a="ex-save">${Lt.down}<span>Αποθήκευση</span></button></div>`)}catch(e){const i=e.message;i==="stopped"?Ou():nn(`<h2>Export</h2><p class="big">Το βίντεο δεν γράφτηκε.</p><p class="hint">${i==="order"||i==="encode"?"Ο κωδικοποιητής αυτής της συσκευής έδωσε κάτι που δεν διαβάζεται.":"Η συσκευή δεν άντεξε την κωδικοποίηση."} Δοκίμασε μικρότερη διάρκεια ή από υπολογιστή.</p><div class="foot"><div class="grow"></div><button class="pill main" data-a="export">Πίσω</button></div>`)}Sn=!0}Yt("fileIn").addEventListener("change",async n=>{var i;const t=n.target,e=(i=t.files)==null?void 0:i[0];if(t.value="",!!e)try{const s=JSON.parse(await e.text()),r=s&&s.v===1?Rl(s):va(s,wt());if(!r)throw new Error("bad");Bt.replace(r),hn(),tt.sel=null,tt.time=0,Ke("sel"),xn("Άνοιξε η σκηνή. Η Αναίρεση φέρνει την προηγούμενη.")}catch{xn("Αυτό το αρχείο δεν είναι σκηνή του Previz")}});function Ox(n){let t="";for(const e of new TextEncoder().encode(n))t+=String.fromCharCode(e);return btoa(t).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}function zx(n){const t=atob(n.replace(/-/g,"+").replace(/_/g,"/"));return new TextDecoder().decode(Uint8Array.from(t,e=>e.charCodeAt(0)))}const _h=()=>`${location.origin}${location.pathname}#p=${Ox(JSON.stringify(wt()))}`;function zu(){const n=/^#(p|ai)=(.+)$/.exec(location.hash);if(!n)return!1;history.replaceState(null,"",location.pathname+location.search);try{const t=JSON.parse(zx(n[2])),e=n[1]==="p"?Rl(t):va(t,wt());if(!e)throw new Error("bad");Bt.replace(e),tt.sel=null,tt.frame=!1,tt.time=0,tt.playing=!0;const i=e.figures[0];i&&Js(i.x,.9,i.z),Ke("sel");const s=n[1]==="ai"&&typeof t.notes=="string"?t.notes:"Άνοιξε η σκηνή από το link.";nn(`<h2>Νέα σκηνή</h2><p class="note">${bi(s)}</p><p class="hint">Θες αυτό που είχες πριν; Πάτα Αναίρεση.</p><div class="foot"><div class="grow"></div><button class="pill main" data-a="modal-close">Να το δω</button></div>`)}catch{xn("Το link της σκηνής δεν διαβάζεται")}return!0}window.addEventListener("hashchange",zu);function kx(){let n="";try{n=localStorage.getItem("tml_previz_ai_text")||""}catch{}nn(`<h2>Σωστό πλάνο</h2><p class="hint">Γράψε με δυο λόγια τι είναι το πλάνο και τι σου αρέσει σε αυτό. Αντιγράφεται μαζί με τη σκηνή, το επικολλάς στο Claude και γίνεται παράδειγμα για τις επόμενες σκηνές.</p><textarea id="apText" class="write" placeholder="Π.χ. Έτσι θέλω το over the shoulder: 50mm, κοντά στον ώμο, η κάμερα λίγο πιο χαμηλά από τα μάτια.">${bi(n)}</textarea><div class="foot"><div class="grow"></div><button class="pill" data-a="modal-close">Κλείσιμο</button><button class="pill main" data-a="approve-copy">${Lt.copy}<span>Αντιγραφή για το Claude</span></button></div>`)}async function Bx(){const n=Je.querySelector("#promptText");if(!n)return;await ll(n.value);const t=Yt("copyBtn");t.innerHTML=`${Lt.copy}<span>Αντιγράφηκε</span>`,setTimeout(()=>t.innerHTML=`${Lt.copy}<span>Αντιγραφή</span>`,1600)}let xh=0;function xn(n){let t=document.getElementById("toast");t||(t=document.createElement("div"),t.id="toast",document.body.appendChild(t)),t.textContent=n,t.classList.add("show"),clearTimeout(xh),xh=window.setTimeout(()=>t==null?void 0:t.classList.remove("show"),1400)}let Gi=null,fi=null,ca=0;Cu.addEventListener("pointerdown",n=>{var e;if(!Rs.contains(n.target)||n.target===Cs)return;if(ca++,ca>1){fi=null;return}const t=Gt.pick(n.clientX,n.clientY);if(t){const i=t.kind==="prop"?null:hr(t.id),s=t.kind==="prop"?Sa(t.id):t.kind==="dest"?i==null?void 0:i.path:i,r=Gt.floorPoint(n.clientX,n.clientY);if(!s||!r)return;Gt.controls.enabled=!1,Gi={kind:t.kind,id:t.id,fx:r.x,fz:r.z,ox:s.x,oz:s.z,pid:n.pointerId},Rs.setPointerCapture(n.pointerId);const a={kind:t.kind==="prop"?"prop":"figure",id:t.id};((e=tt.sel)==null?void 0:e.id)!==t.id&&zn(a)}else fi={x:n.clientX,y:n.clientY,t:performance.now(),pid:n.pointerId}},!0);Rs.addEventListener("pointermove",n=>{if(!Gi||n.pointerId!==Gi.pid)return;const t=Gt.floorPoint(n.clientX,n.clientY);if(!t)return;const e=Gi,i=+ce(e.ox+t.x-e.fx,-19,19).toFixed(2),s=+ce(e.oz+t.z-e.fz,-19,19).toFixed(2);Bt.live(o=>{const c=e.kind==="prop"?null:o.figures.find(h=>h.id===e.id),l=e.kind==="prop"?o.props.find(h=>h.id===e.id):e.kind==="dest"?c==null?void 0:c.path:c;l&&(l.x=i,l.z=s)});const r=e.kind==="prop"?null:hr(e.id),a=document.getElementById("pinfo");r!=null&&r.path&&a&&(a.textContent=`${Ve(As(r),1)} m · ${Ve(As(r)/Math.max(.1,r.path.t1-r.path.t0),1)} m/s`)});const ku=n=>{ca=Math.max(0,ca-1),Gi&&n.pointerId===Gi.pid&&(Gi=null,Gt.controls.enabled=!0,Bt.end()),fi&&n.pointerId===fi.pid&&(n.type==="pointerup"&&Math.hypot(n.clientX-fi.x,n.clientY-fi.y)<6&&performance.now()-fi.t<350&&tt.sel&&zn(null),fi=null)};window.addEventListener("pointerup",ku);window.addEventListener("pointercancel",ku);Cs.addEventListener("click",()=>la("view","shot"));window.addEventListener("keydown",n=>{const t=n.target.tagName;if(t==="INPUT"||t==="TEXTAREA")return;const e=n.metaKey||n.ctrlKey;if(e&&n.key.toLowerCase()==="z")return n.preventDefault(),n.shiftKey?Bt.redo():Bt.undo();if(e&&n.key.toLowerCase()==="y")return Bt.redo();if(n.key===" ")return n.preventDefault(),la("play",void 0);if(n.key.toLowerCase()==="k")return Uu();if(n.key==="Escape")return Je.hidden?zn(null):hn();if((n.key==="Delete"||n.key==="Backspace")&&tt.sel)return la("del",void 0)});function ro(n,t){const e=n.getBoundingClientRect();return{x:e.left-t.left,y:e.top-t.top,w:e.width,h:e.height}}function ao(n,t){let e=n.w,i=e/t;return i>n.h&&(i=n.h,e=i*t),{x:n.x+(n.w-e)/2,y:n.y+(n.h-i)/2,w:e,h:i}}const oo=n=>n.offsetParent!==null&&n.clientWidth>0;let vh=0,Mh=0,Sh=performance.now();function Gx(){const n=Cu.getBoundingClientRect(),t=Math.round(n.width),e=Math.round(n.height);(t!==vh||e!==Mh)&&(Gt.setSize(t,e),vh=t,Mh=e,Du()),Gt.clearAll(t,e);const i=Zs();Gt.syncScene(wt(),tt.sel&&tt.sel.kind!=="key"?tt.sel.id:null,tt.time);const s=Cn(wt(),tt.time,!0);if(tl(Gt.shotCam,s,i),Gt.syncCurrent(s,i),oo(Rs)){const r=ro(Rs,n),a=Gt.dirCam;if(tt.frame){const o=ao(r,i);Gt.draw(a,r,e,!0),a.fov=si(Lu(),i),a.aspect=i,a.updateProjectionMatrix(),Gt.helpersOn(!1),Gt.draw(a,o,e),Gt.dirRect={x:o.x+n.left,y:o.y+n.top,w:o.w,h:o.h}}else a.fov=50,a.aspect=r.w/Math.max(1,r.h),a.updateProjectionMatrix(),Gt.helpersOn(!0),Gt.draw(a,r,e),Gt.dirRect={x:r.x+n.left,y:r.y+n.top,w:r.w,h:r.h}}if(oo(fh)){const r=ro(fh,n);Gt.draw(Gt.shotCam,r,e,!0),Gt.draw(Gt.shotCam,ao(r,i),e)}if(oo(Cs)&&cr.matches){const r=ro(Cs,n);Gt.draw(Gt.shotCam,r,e,!0),Gt.draw(Gt.shotCam,ao(r,i),e)}}function Bu(n){const t=Math.min(.1,(n-Sh)/1e3);if(Sh=n,tt.playing){let e=tt.time+t;const i=wt().shot.duration;e>=i&&(tt.loop?e=e%i:(e=i,tt.playing=!1,vi())),tt.time=e,Dl(),Yt("shotInfo").textContent=`${Math.round(Cn(wt(),e).lens)}mm · ${wt().shot.aspect}`,Sn=!0}Gt.controls.update()&&(Sn=!0),Sn&&(Sn=!1,Gx()),requestAnimationFrame(Bu)}Gt.controls.addEventListener("change",()=>Sn=!0);window.addEventListener("resize",()=>{Sn=!0,Ke("sel")});cr.addEventListener("change",()=>Ke("sel"));Ke("init");const Hx=zu();try{!Hx&&!localStorage.getItem("tml_previz_seen")&&(localStorage.setItem("tml_previz_seen","1"),Fu())}catch{}requestAnimationFrame(Bu);window.previz={store:Bt,ui:tt,world:Gt,buildPrompt:()=>Pl(wt())};var yh;("serviceWorker"in navigator&&location.protocol==="https:"||location.hostname==="localhost")&&((yh=navigator.serviceWorker)==null||yh.register("../previz-sw.js",{scope:"./"}).then(()=>navigator.serviceWorker.ready).then(n=>{var e;const t=performance.getEntriesByType("resource").map(i=>i.name).filter(i=>i.startsWith(location.origin));(e=n.active)==null||e.postMessage({cache:[location.href,...t]})}).catch(()=>{}));
