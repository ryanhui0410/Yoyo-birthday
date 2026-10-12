/* CameraFX — Meitu-style real-time filter over a <video>.
   mode: 'raw' | 'beauty' | 'anime' */

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
varying vec2 uv;
uniform sampler2D tex;
uniform vec2  px;
uniform float smoothAmt;
uniform float bright;
uniform float warm;
uniform float posterize;   // 0 = off
uniform float edge;        // outline strength
uniform float animeShift;  // 0 = off, 1 = push colors toward anime palette

void main(){
  vec3 c = texture2D(tex, uv).rgb;

  /* 1. skin smoothing (7-tap blur) */
  vec3 blur = c;
  blur += texture2D(tex, uv + vec2( px.x, 0.0)).rgb;
  blur += texture2D(tex, uv + vec2(-px.x, 0.0)).rgb;
  blur += texture2D(tex, uv + vec2(0.0,  px.y)).rgb;
  blur += texture2D(tex, uv + vec2(0.0, -px.y)).rgb;
  blur += texture2D(tex, uv + px).rgb;
  blur += texture2D(tex, uv - px).rgb;
  blur /= 7.0;
  c = mix(c, blur, smoothAmt);

  /* 2. beauty lift */
  c += bright;
  c.r += warm; c.g += warm * 0.5;

  /* 3. anime palette: flatten tones, boost saturation slightly */
  if (animeShift > 0.5){
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(c, lum * vec3(1.12, 0.96, 1.05), 0.35);   // pinkish cast
    c = clamp((c - 0.5) * 1.18 + 0.5, 0.0, 1.0);      // saturation
  }

  /* 4. cel-shade: posterize + dark outline */
  if (posterize > 0.5){
    float l0 = dot(texture2D(tex, uv + vec2(-px.x*2.0, -px.y*2.0)).rgb, vec3(0.3));
    float l1 = dot(texture2D(tex, uv + vec2( px.x*2.0, -px.y*2.0)).rgb, vec3(0.3));
    float l2 = dot(texture2D(tex, uv + vec2(-px.x*2.0,  px.y*2.0)).rgb, vec3(0.3));
    float l3 = dot(texture2D(tex, uv + vec2( px.x*2.0,  px.y*2.0)).rgb, vec3(0.3));
    float g = abs(l0 - l3) + abs(l1 - l2);
    c = floor(c * posterize + 0.5) / posterize;
    c = mix(c, vec3(0.12, 0.07, 0.10), clamp(g * edge, 0.0, 1.0));
  }

  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`;

export default function CameraFX(video, canvas){
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) return null;
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);  
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog); gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER,
    new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = n => gl.getUniformLocation(prog, n);
  const U = { tex: u('tex'), px: u('px'), smoothAmt: u('smoothAmt'),
              bright: u('bright'), warm: u('warm'),
              posterize: u('posterize'), edge: u('edge'),
              animeShift: u('animeShift') };

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(U.tex, 0);

  const PRESETS = {
    raw:    { smoothAmt: 0,   bright: 0,    warm: 0,
              posterize: 0,  edge: 0,   animeShift: 0 },
    beauty: { smoothAmt: 0.75, bright: 0.07, warm: 0.05,
              posterize: 0,  edge: 0,   animeShift: 0 },
    anime:  { smoothAmt: 0.85, bright: 0.09, warm: 0.05,
              posterize: 9,  edge: 3.0, animeShift: 1 },
  };

  let raf, dead = false;
  let mode = 'anime';

  function applyMode(){
    const p = PRESETS[mode];
    gl.uniform1f(U.smoothAmt, p.smoothAmt);
    gl.uniform1f(U.bright,    p.bright);
    gl.uniform1f(U.warm,      p.warm);
    gl.uniform1f(U.posterize, p.posterize);
    gl.uniform1f(U.edge,      p.edge);
    gl.uniform1f(U.animeShift,p.animeShift);
  }

  function frame(){
    if (dead) return;
    raf = requestAnimationFrame(frame);
    if (video.readyState < 2) return;

    if (canvas.width !== video.videoWidth && video.videoWidth){
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
    gl.uniform2f(U.px, 1 / canvas.width, 1 / canvas.height);
    applyMode();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  frame();

  return {
    setMode(m){ if (PRESETS[m]) mode = m; },
    getMode(){ return mode; },
    stop(){ dead = true; cancelAnimationFrame(raf); },
  };
}