/* Anime4K WebGL core — browser adaptation of mobooru/anime4k.
 * Original project: https://github.com/mobooru/anime4k
 * Upstream Anime4K: https://github.com/bloc97/Anime4K
 * License: MIT
 */
/**
 * A real-time upscaler for anime content using WebGL.
 * Ported from https://github.com/bloc97/Anime4K by https://github.com/mobooru
 * Licensed under the MIT license.
 */
window.Anime4K = {
  gl: {
    createShader: function (gl, type, source) {
      var shader = gl.createShader(type)
      gl.shaderSource(shader, source)

      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader))
      }

      return shader
    },

    createProgram: function (gl, vertexSource, fragmentSource) {
      var program = gl.createProgram()

      var vertexShader = Anime4K.gl.createShader(gl, gl.VERTEX_SHADER, vertexSource)
      var fragmentShader = Anime4K.gl.createShader(gl, gl.FRAGMENT_SHADER, fragmentSource)

      gl.attachShader(program, vertexShader)
      gl.attachShader(program, fragmentShader)

      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program))
      }

      var wrapper = { program: program }

      var numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES)
      for (var i = 0; i < numAttributes; i++) {
        var attribute = gl.getActiveAttrib(program, i)
        wrapper[attribute.name] = gl.getAttribLocation(program, attribute.name)
      }
      var numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
      for (var i$1 = 0; i$1 < numUniforms; i$1++) {
        var uniform = gl.getActiveUniform(program, i$1)
        wrapper[uniform.name] = gl.getUniformLocation(program, uniform.name)
      }

      return wrapper
    },

    createTexture: function (gl, filter, data, width, height) {
      var texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
      if (data instanceof Uint8Array) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data)
      }
      gl.bindTexture(gl.TEXTURE_2D, null)
      return texture
    },

    bindTexture: function (gl, texture, unit) {
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, texture)
    },

    updateTexture: function (gl, texture, src) {
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
    },

    createBuffer: function (gl, data) {
      var buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
      return buffer
    },

    bindAttribute: function (gl, buffer, attribute, numComponents) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(attribute)
      gl.vertexAttribPointer(attribute, numComponents, gl.FLOAT, false, 0, 0)
    },

    bindFramebuffer: function (gl, framebuffer, texture) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
      if (texture) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
      }
    }
  },
  shaders: {
    quadVert: `
    precision mediump float;

    attribute vec2 a_pos;
    varying vec2 v_tex_pos;

    void main() {
        v_tex_pos = a_pos;
        gl_Position = vec4(1.0 - 2.0 * a_pos, 0, 1);
    }
    `,
    scaleFrag: `
    precision mediump float;

    uniform sampler2D u_texture;
    uniform vec2 u_size;
    varying vec2 v_tex_pos;

    vec4 interp(const vec2 uv) {
        vec2 px = 1.0 / u_size;
        vec2 vc = (floor(uv * u_size)) * px;
        vec2 f = fract(uv * u_size);
        vec4 tl = texture2D(u_texture, vc);
        vec4 tr = texture2D(u_texture, vc + vec2(px.x, 0));
        vec4 bl = texture2D(u_texture, vc + vec2(0, px.y));
        vec4 br = texture2D(u_texture, vc + px);
        return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);
    }

    void main() {
        gl_FragColor = interp(1.0 - v_tex_pos);
        //gl_FragColor = texture2D(u_texture, 1.0 - v_tex_pos);
    }
    `,
    lumFrag: `
    precision mediump float;

    uniform sampler2D u_texture;
    varying vec2 v_tex_pos;

    float getLum(vec4 rgb) {
        return (rgb.r + rgb.r + rgb.g + rgb.g + rgb.g + rgb.b) / 6.0;
    }

    void main() {
        vec4 rgb = texture2D(u_texture, 1.0 - v_tex_pos);
        float lum = getLum(rgb);
        gl_FragColor = vec4(lum);
    }
    `,
    pushFrag: `
    precision mediump float;

    uniform sampler2D u_texture;
    uniform sampler2D u_textureTemp;
    uniform float u_scale;
    uniform float u_bold;
    uniform vec2 u_pt;
    varying vec2 v_tex_pos;

    #define strength (min(u_scale / u_bold, 1.0))

    vec4 HOOKED_tex(vec2 pos) {
        return texture2D(u_texture, pos);
    }

    vec4 POSTKERNEL_tex(vec2 pos) {
        return texture2D(u_textureTemp, pos);
    }

    vec4 getLargest(vec4 cc, vec4 lightestColor, vec4 a, vec4 b, vec4 c) {
        vec4 newColor = cc * (1.0 - strength) + ((a + b + c) / 3.0) * strength;
        if (newColor.a > lightestColor.a) {
            return newColor;
        }
        return lightestColor;
    }

    vec4 getRGBL(vec2 pos) {
        return vec4(HOOKED_tex(pos).rgb, POSTKERNEL_tex(pos).x);
    }

    float min3v(vec4 a, vec4 b, vec4 c) {
        return min(min(a.a, b.a), c.a);
    }
    float max3v(vec4 a, vec4 b, vec4 c) {
        return max(max(a.a, b.a), c.a);
    }

    void main() {
        vec2 HOOKED_pos = v_tex_pos;

        vec2 d = u_pt;

        vec4 cc = getRGBL(HOOKED_pos);
        vec4 t = getRGBL(HOOKED_pos + vec2(0.0, -d.y));
        vec4 tl = getRGBL(HOOKED_pos + vec2(-d.x, -d.y));
        vec4 tr = getRGBL(HOOKED_pos + vec2(d.x, -d.y));

        vec4 l = getRGBL(HOOKED_pos + vec2(-d.x, 0.0));
        vec4 r = getRGBL(HOOKED_pos + vec2(d.x, 0.0));

        vec4 b = getRGBL(HOOKED_pos + vec2(0.0, d.y));
        vec4 bl = getRGBL(HOOKED_pos + vec2(-d.x, d.y));
        vec4 br = getRGBL(HOOKED_pos + vec2(d.x, d.y));

        vec4 lightestColor = cc;

        //Kernel 0 and 4
        float maxDark = max3v(br, b, bl);
        float minLight = min3v(tl, t, tr);

        if (minLight > cc.a && minLight > maxDark) {
            lightestColor = getLargest(cc, lightestColor, tl, t, tr);
        } else {
            maxDark = max3v(tl, t, tr);
            minLight = min3v(br, b, bl);
            if (minLight > cc.a && minLight > maxDark) {
                lightestColor = getLargest(cc, lightestColor, br, b, bl);
            }
        }

        //Kernel 1 and 5
        maxDark = max3v(cc, l, b);
        minLight = min3v(r, t, tr);

        if (minLight > maxDark) {
            lightestColor = getLargest(cc, lightestColor, r, t, tr);
        } else {
            maxDark = max3v(cc, r, t);
            minLight = min3v(bl, l, b);
            if (minLight > maxDark) {
                lightestColor = getLargest(cc, lightestColor, bl, l, b);
            }
        }

        //Kernel 2 and 6
        maxDark = max3v(l, tl, bl);
        minLight = min3v(r, br, tr);

        if (minLight > cc.a && minLight > maxDark) {
            lightestColor = getLargest(cc, lightestColor, r, br, tr);
        } else {
            maxDark = max3v(r, br, tr);
            minLight = min3v(l, tl, bl);
            if (minLight > cc.a && minLight > maxDark) {
                lightestColor = getLargest(cc, lightestColor, l, tl, bl);
            }
        }

        //Kernel 3 and 7
        maxDark = max3v(cc, l, t);
        minLight = min3v(r, br, b);

        if (minLight > maxDark) {
            lightestColor = getLargest(cc, lightestColor, r, br, b);
        } else {
            maxDark = max3v(cc, r, b);
            minLight = min3v(t, l, tl);
            if (minLight > maxDark) {
                lightestColor = getLargest(cc, lightestColor, t, l, tl);
            }
        }

        gl_FragColor = lightestColor;
    }
    `,
    gradFrag: `
    precision mediump float;

    uniform sampler2D u_texture;
    uniform sampler2D u_textureTemp;
    uniform vec2 u_pt;
    varying vec2 v_tex_pos;

    vec4 HOOKED_tex(vec2 pos) {
        return texture2D(u_texture, 1.0 - pos);
    }

    vec4 POSTKERNEL_tex(vec2 pos) {
        return texture2D(u_textureTemp, 1.0 - pos);
    }

    vec4 getRGBL(vec2 pos) {
        return vec4(HOOKED_tex(pos).rgb, POSTKERNEL_tex(pos).x);
    }

    void main() {
        vec2 HOOKED_pos = v_tex_pos;

        vec2 d = u_pt;

        //[tl  t tr]
        //[ l cc  r]
        //[bl  b br]
        vec4 cc = getRGBL(HOOKED_pos);
        vec4 t = getRGBL(HOOKED_pos + vec2(0.0, -d.y));
        vec4 tl = getRGBL(HOOKED_pos + vec2(-d.x, -d.y));
        vec4 tr = getRGBL(HOOKED_pos + vec2(d.x, -d.y));

        vec4 l = getRGBL(HOOKED_pos + vec2(-d.x, 0.0));
        vec4 r = getRGBL(HOOKED_pos + vec2(d.x, 0.0));

        vec4 b = getRGBL(HOOKED_pos + vec2(0.0, d.y));
        vec4 bl = getRGBL(HOOKED_pos + vec2(-d.x, d.y));
        vec4 br = getRGBL(HOOKED_pos + vec2(d.x, d.y));

        //Horizontal Gradient
        //[-1  0  1]
        //[-2  0  2]
        //[-1  0  1]
        float xgrad = (-tl.a + tr.a - l.a - l.a + r.a + r.a - bl.a + br.a);

        //Vertical Gradient
        //[-1 -2 -1]
        //[ 0  0  0]
        //[ 1  2  1]
        float ygrad = (-tl.a - t.a - t.a - tr.a + bl.a + b.a + b.a + br.a);

        gl_FragColor = vec4(1.0 - clamp(sqrt(xgrad * xgrad + ygrad * ygrad), 0.0, 1.0));
    }
    `,
    finalFrag: `
    precision mediump float;

    uniform sampler2D u_texture;
    uniform sampler2D u_textureTemp;
    uniform vec2 u_pt;
    uniform float u_scale;
    uniform float u_blur;
    varying vec2 v_tex_pos;

    #define strength (min(u_scale / u_blur, 1.0))

    vec4 HOOKED_tex(vec2 pos) {
        return texture2D(u_texture, vec2(pos.x, 1.0 - pos.y));
    }

    vec4 POSTKERNEL_tex(vec2 pos) {
        return texture2D(u_textureTemp, vec2(pos.x, 1.0 - pos.y));
    }

    vec4 getAverage(vec4 cc, vec4 a, vec4 b, vec4 c) {
        return cc * (1.0 - strength) + ((a + b + c) / 3.0) * strength;
    }

    vec4 getRGBL(vec2 pos) {
        return vec4(HOOKED_tex(pos).rgb, POSTKERNEL_tex(pos).x);
    }

    float min3v(vec4 a, vec4 b, vec4 c) {
        return min(min(a.a, b.a), c.a);
    }
    float max3v(vec4 a, vec4 b, vec4 c) {
        return max(max(a.a, b.a), c.a);
    }

    void main() {
        vec2 HOOKED_pos = v_tex_pos;

        vec2 d = u_pt;

        vec4 cc = getRGBL(HOOKED_pos);
        vec4 t = getRGBL(HOOKED_pos + vec2(0.0, -d.y));
        vec4 tl = getRGBL(HOOKED_pos + vec2(-d.x, -d.y));
        vec4 tr = getRGBL(HOOKED_pos + vec2(d.x, -d.y));

        vec4 l = getRGBL(HOOKED_pos + vec2(-d.x, 0.0));
        vec4 r = getRGBL(HOOKED_pos + vec2(d.x, 0.0));

        vec4 b = getRGBL(HOOKED_pos + vec2(0.0, d.y));
        vec4 bl = getRGBL(HOOKED_pos + vec2(-d.x, d.y));
        vec4 br = getRGBL(HOOKED_pos + vec2(d.x, d.y));

        //Kernel 0 and 4
        float maxDark = max3v(br, b, bl);
        float minLight = min3v(tl, t, tr);

        if (minLight > cc.a && minLight > maxDark) {
            gl_FragColor = getAverage(cc, tl, t, tr);
            return;
        } else {
            maxDark = max3v(tl, t, tr);
            minLight = min3v(br, b, bl);
            if (minLight > cc.a && minLight > maxDark) {
                gl_FragColor = getAverage(cc, br, b, bl);
                return;
            }
        }

        //Kernel 1 and 5
        maxDark = max3v(cc, l, b);
        minLight = min3v(r, t, tr);

        if (minLight > maxDark) {
            gl_FragColor = getAverage(cc, r, t, tr);
            return;
        } else {
            maxDark = max3v(cc, r, t);
            minLight = min3v(bl, l, b);
            if (minLight > maxDark) {
                gl_FragColor = getAverage(cc, bl, l, b);
                return;
            }
        }

        //Kernel 2 and 6
        maxDark = max3v(l, tl, bl);
        minLight = min3v(r, br, tr);

        if (minLight > cc.a && minLight > maxDark) {
            gl_FragColor = getAverage(cc, r, br, tr);
            return;
        } else {
            maxDark = max3v(r, br, tr);
            minLight = min3v(l, tl, bl);
            if (minLight > cc.a && minLight > maxDark) {
                gl_FragColor = getAverage(cc, l, tl, bl);
                return;
            }
        }

        //Kernel 3 and 7
        maxDark = max3v(cc, l, t);
        minLight = min3v(r, br, b);

        if (minLight > maxDark) {
            gl_FragColor = getAverage(cc, r, br, b);
            return;
        } else {
            maxDark = max3v(cc, r, b);
            minLight = min3v(t, l, tl);
            if (minLight > maxDark) {
                gl_FragColor = getAverage(cc, t, l, tl);
                return;
            }
        }

        gl_FragColor = cc;
    }
    `,
    drawFrag: `
    precision mediump float;

    uniform sampler2D u_texture;
    uniform sampler2D u_textureOrig;
    varying vec2 v_tex_pos;

    void main() {
        vec4 color = texture2D(u_texture, 1.0 - v_tex_pos);
        vec4 colorOrig = texture2D(u_textureOrig, vec2(1.0 - v_tex_pos.x, v_tex_pos.y));
        gl_FragColor = vec4(color.rgb, colorOrig.a);
    }
    `
  },
  /**
   * The scaler constructor.
   * @constructor
   * @param {WegGLRenderingContext} gl - The WebGL context to use.
   */
  Scaler: function (gl) {
    const { createProgram, createTexture, bindTexture, updateTexture, createBuffer, bindAttribute, bindFramebuffer } = Anime4K.gl
    const { quadVert, scaleFrag, lumFrag, pushFrag, gradFrag, finalFrag, drawFrag } = Anime4K.shaders

    function Scaler (gl) {
      this.gl = gl

      this.inputTex = null
      this.inputMov = null
      this.inputWidth = 0
      this.inputHeight = 0

      this.quadBuffer = createBuffer(gl, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]))
      this.framebuffer = gl.createFramebuffer()

      this.scaleProgram = createProgram(gl, quadVert, scaleFrag)
      this.lumProgram = createProgram(gl, quadVert, lumFrag)
      this.pushProgram = createProgram(gl, quadVert, pushFrag)
      this.gradProgram = createProgram(gl, quadVert, gradFrag)
      this.finalProgram = createProgram(gl, quadVert, finalFrag)
      this.drawProgram = createProgram(gl, quadVert, drawFrag)

      this.tempTexture = null
      this.tempTexture2 = null
      this.tempTexture3 = null

      this.bold = 6.0
      this.blur = 2.0
    }

    Scaler.prototype.inputImage = function (img) {
      const gl = this.gl

      this.inputWidth = img.width
      this.inputHeight = img.height

      this.inputTex = createTexture(gl, gl.LINEAR, img)
      this.inputMov = null
    }

    Scaler.prototype.inputVideo = function (mov) {
      const gl = this.gl

      const width = mov.videoWidth
      const height = mov.videoHeight

      this.inputWidth = width
      this.inputHeight = height

      const emptyPixels = new Uint8Array(width * height * 4)
      this.inputTex = createTexture(gl, gl.LINEAR, emptyPixels, width, height)
      this.inputMov = mov
    }

    Scaler.prototype.setSize = function (scale) {
      const gl = this.gl

      const width = Math.round(this.inputWidth * scale)
      const height = Math.round(this.inputHeight * scale)

      gl.canvas.width = width
      gl.canvas.height = height

      const emptyPixels = new Uint8Array(width * height * 4)
      this.scaleTexture = createTexture(gl, gl.LINEAR, emptyPixels, width, height)
      this.tempTexture = createTexture(gl, gl.LINEAR, emptyPixels, width, height)
      this.tempTexture2 = createTexture(gl, gl.LINEAR, emptyPixels, width, height)
      this.tempTexture3 = createTexture(gl, gl.LINEAR, emptyPixels, width, height)
    }

    Scaler.prototype.render = function () {
      if (!this.inputTex) {
        return
      }

      const gl = this.gl
      const scalePgm = this.scaleProgram
      const lumPgm = this.lumProgram
      const pushPgm = this.pushProgram
      const gradPgm = this.gradProgram
      const finalPgm = this.finalProgram
      const drawPgm = this.drawProgram

      if (this.inputMov) {
        updateTexture(gl, this.inputTex, this.inputMov)
      }

      gl.disable(gl.DEPTH_TEST)
      gl.disable(gl.STENCIL_TEST)

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

      // First upscaling with Bicubic interpolation.

      bindFramebuffer(gl, this.framebuffer, this.scaleTexture)

      gl.useProgram(scalePgm.program)

      bindAttribute(gl, this.quadBuffer, scalePgm.a_pos, 2)
      bindTexture(gl, this.inputTex, 0)
      gl.uniform1i(scalePgm.u_texture, 0)
      gl.uniform2f(scalePgm.u_size, this.inputWidth, this.inputHeight)

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // Scaled: scaleTexture

      bindFramebuffer(gl, this.framebuffer, this.tempTexture)

      gl.useProgram(lumPgm.program)

      bindAttribute(gl, this.quadBuffer, lumPgm.a_pos, 2)
      bindTexture(gl, this.scaleTexture, 0)
      gl.uniform1i(lumPgm.u_texture, 0)

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // Scaled: scaleTexture
      // PostKernel: tempTexture

      bindFramebuffer(gl, this.framebuffer, this.tempTexture2)

      gl.useProgram(pushPgm.program)

      bindAttribute(gl, this.quadBuffer, pushPgm.a_pos, 2)
      bindTexture(gl, this.scaleTexture, 0)
      bindTexture(gl, this.tempTexture, 1)
      gl.uniform1i(pushPgm.u_texture, 0)
      gl.uniform1i(pushPgm.u_textureTemp, 1)
      gl.uniform1f(pushPgm.u_scale, gl.canvas.width / this.inputWidth)
      gl.uniform2f(pushPgm.u_pt, 1.0 / gl.canvas.width, 1.0 / gl.canvas.height)
      gl.uniform1f(pushPgm.u_bold, this.bold)

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // Scaled: tempTexture2
      // PostKernel: tempTexture

      bindFramebuffer(gl, this.framebuffer, this.tempTexture)

      gl.useProgram(lumPgm.program)

      bindAttribute(gl, this.quadBuffer, lumPgm.a_pos, 2)
      bindTexture(gl, this.tempTexture2, 0)
      gl.uniform1i(lumPgm.u_texture, 0)

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // Scaled: tempTexture2
      // PostKernel: tempTexture

      bindFramebuffer(gl, this.framebuffer, this.tempTexture3)

      gl.useProgram(gradPgm.program)

      bindAttribute(gl, this.quadBuffer, gradPgm.a_pos, 2)
      bindTexture(gl, this.tempTexture2, 0)
      bindTexture(gl, this.tempTexture, 1)
      gl.uniform1i(gradPgm.u_texture, 0)
      gl.uniform1i(gradPgm.u_textureTemp, 1)
      gl.uniform2f(gradPgm.u_pt, 1.0 / gl.canvas.width, 1.0 / gl.canvas.height)

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // Scaled: tempTexture2
      // PostKernel: tempTexture3

      bindFramebuffer(gl, this.framebuffer, this.tempTexture)

      gl.useProgram(finalPgm.program)

      bindAttribute(gl, this.quadBuffer, finalPgm.a_pos, 2)
      bindTexture(gl, this.tempTexture2, 0)
      bindTexture(gl, this.tempTexture3, 1)
      gl.uniform1i(finalPgm.u_texture, 0)
      gl.uniform1i(finalPgm.u_textureTemp, 1)
      gl.uniform1f(finalPgm.u_scale, gl.canvas.width / this.inputWidth)
      gl.uniform2f(finalPgm.u_pt, 1.0 / gl.canvas.width, 1.0 / gl.canvas.height)
      gl.uniform1f(finalPgm.u_blur, this.blur)

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // Scaled: tempTexture
      // PostKernel: tempTexture3

      bindFramebuffer(gl, null)

      gl.useProgram(drawPgm.program)

      bindAttribute(gl, this.quadBuffer, drawPgm.a_pos, 2)
      bindTexture(gl, this.tempTexture, 0)
      bindTexture(gl, this.inputTex, 1)
      gl.uniform1i(drawPgm.u_texture, 0)
      gl.uniform1i(drawPgm.u_textureOrig, 1)

      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    /**
     * Scale and rander.
     * @function
     * @param {number} scale - The scale to render to.
     * @param {Object} options - Optional options to apply.
     * @param {number} options.blur - How much to blur.
     * @param {number} options.bold - Line boldening.
     */
    Scaler.prototype.resize = function (scale, { blur, bold }) {
      if (blur) this.blur = blur
      if (bold) this.bold = bold
      this.setSize(scale)
      this.render()
    }

    return new Scaler(gl)
  }
};
/* Lampa Anime4K WebGL Upscale — real GPU shader processing, with safe fallback */
(function () {
    'use strict';

    var VERSION = '2026-10-15-anime4k-4';
    if (window.LampaAnime4KVersion === VERSION) return;
    window.LampaAnime4KVersion = VERSION;

    var STORAGE_KEY = 'anime4k_enabled';
    var SCALE = 2;
    var video = null;
    var canvas = null;
    var gl = null;
    var scaler = null;
    var frameHandle = 0;
    var running = false;
    var originalOpacity = null;
    var originalOpacityPriority = '';
    var sourceWidth = 0;
    var sourceHeight = 0;
    var menuInstalled = false;
    var onVideoPlay = null;
    var onVideoSeeked = null;
    var onWindowResize = null;
    var parentElement = null;
    var parentPosition = '';
    var parentPositionPriority = '';

    function enabled() {
        try {
            if (window.Lampa && Lampa.Storage && typeof Lampa.Storage.get === 'function') {
                var stored = Lampa.Storage.get(STORAGE_KEY, true);
                return stored !== false && stored !== 'false' && stored !== 0 && stored !== '0';
            }
        } catch (error) {}
        return true;
    }
    function setEnabled(value) {
        try {
            if (window.Lampa && Lampa.Storage && typeof Lampa.Storage.set === 'function') Lampa.Storage.set(STORAGE_KEY, !!value);
        } catch (error) {}
    }
    function currentVideo() {
        try {
            if (window.Lampa && Lampa.PlayerVideo && typeof Lampa.PlayerVideo.video === 'function') return Lampa.PlayerVideo.video();
        } catch (error) {}
        return document.querySelector('.player-video__video, video');
    }
    function removeCanvas() {
        if (frameHandle) {
            if (video && typeof video.cancelVideoFrameCallback === 'function') video.cancelVideoFrameCallback(frameHandle);
            else cancelAnimationFrame(frameHandle);
        }
        frameHandle = 0;
        running = false;
        if (video && onVideoPlay) video.removeEventListener('play', onVideoPlay);
        if (video && onVideoSeeked) video.removeEventListener('seeked', onVideoSeeked);
        if (window.removeEventListener && onWindowResize) window.removeEventListener('resize', onWindowResize);
        onVideoPlay = null;
        onVideoSeeked = null;
        onWindowResize = null;
        if (video && originalOpacity !== null) {
            if (originalOpacity) video.style.setProperty('opacity', originalOpacity, originalOpacityPriority);
            else video.style.removeProperty('opacity');
        }
        originalOpacity = null;
        originalOpacityPriority = '';
        if (parentElement) {
            if (parentPosition) parentElement.style.setProperty('position', parentPosition, parentPositionPriority);
            else parentElement.style.removeProperty('position');
        }
        parentElement = null;
        parentPosition = '';
        parentPositionPriority = '';
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
        canvas = null;
        scaler = null;
        gl = null;
        video = null;
        sourceWidth = 0;
        sourceHeight = 0;
    }
    function setupCanvas(target) {
        if (!target || !target.videoWidth || !target.videoHeight || !window.Anime4K || typeof window.Anime4K.Scaler !== 'function') return false;
        var parent = target.parentElement;
        if (!parent) return false;
        var context = document.createElement('canvas');
        context.className = 'lampa-anime4k-canvas';
        context.setAttribute('aria-hidden', 'true');
        context.style.cssText = 'position:absolute!important;top:0!important;left:0!important;width:0!important;height:0!important;display:block!important;pointer-events:none!important;object-fit:fill!important;z-index:2!important;background:#000!important;';
        parentElement = parent;
        parentPosition = parent.style.getPropertyValue('position');
        parentPositionPriority = parent.style.getPropertyPriority('position');
        if (window.getComputedStyle(parent).position === 'static') parent.style.setProperty('position', 'relative');
        parent.appendChild(context);
        var contextGl = context.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
        if (!contextGl) {
            context.remove();
            parentElement = null;
            parentPosition = '';
            parentPositionPriority = '';
            return false;
        }
        try {
            var maxTexture = Number(contextGl.getParameter(contextGl.MAX_TEXTURE_SIZE)) || 4096;
            var actualScale = Math.min(SCALE, maxTexture / target.videoWidth, maxTexture / target.videoHeight);
            if (actualScale < 1) actualScale = 1;
            var upscaler = window.Anime4K.Scaler(contextGl);
            upscaler.inputVideo(target);
            upscaler.setSize(actualScale);
            canvas = context;
            gl = contextGl;
            scaler = upscaler;
            video = target;
            sourceWidth = target.videoWidth;
            sourceHeight = target.videoHeight;
            originalOpacity = target.style.getPropertyValue('opacity');
            originalOpacityPriority = target.style.getPropertyPriority('opacity');
            syncCanvasGeometry();
            return true;
        } catch (error) {
            context.remove();
            if (parentElement) {
                if (parentPosition) parentElement.style.setProperty('position', parentPosition, parentPositionPriority);
                else parentElement.style.removeProperty('position');
            }
            parentElement = null;
            parentPosition = '';
            parentPositionPriority = '';
            return false;
        }
    }
    function syncCanvasGeometry() {
        if (!canvas || !video || !canvas.parentElement) return;
        var videoRect = video.getBoundingClientRect();
        var parentRect = canvas.parentElement.getBoundingClientRect();
        var left = videoRect.left - parentRect.left;
        var top = videoRect.top - parentRect.top;
        canvas.style.setProperty('left', left.toFixed(2) + 'px', 'important');
        canvas.style.setProperty('top', top.toFixed(2) + 'px', 'important');
        canvas.style.setProperty('width', Math.max(1, videoRect.width).toFixed(2) + 'px', 'important');
        canvas.style.setProperty('height', Math.max(1, videoRect.height).toFixed(2) + 'px', 'important');
    }
    function renderFrame() {
        if (!running || !video || !scaler) return;
        try {
            if (video.readyState >= 2) scaler.render();
        } catch (error) {
            removeCanvas();
            return;
        }
        if (!running) return;
        if (typeof video.requestVideoFrameCallback === 'function') frameHandle = video.requestVideoFrameCallback(renderVideoFrame);
        else if (!video.paused) frameHandle = requestAnimationFrame(renderFrame);
    }
    function renderVideoFrame() {
        frameHandle = 0;
        renderFrame();
    }
    function startRendering(target) {
        if (!setupCanvas(target)) return false;
        running = true;
        try {
            scaler.render();
            target.style.setProperty('opacity', '0', 'important');
        } catch (error) {
            removeCanvas();
            return false;
        }
        onVideoPlay = function () {
            if (!running || frameHandle) return;
            if (typeof target.requestVideoFrameCallback === 'function') frameHandle = target.requestVideoFrameCallback(renderVideoFrame);
            else frameHandle = requestAnimationFrame(renderFrame);
        };
        onVideoSeeked = function () {
            if (running && scaler) {
                try { scaler.render(); } catch (error) { removeCanvas(); }
            }
        };
        target.addEventListener('play', onVideoPlay, { passive: true });
        target.addEventListener('seeked', onVideoSeeked, { passive: true });
        onWindowResize = function () {
            if (!running) return;
            syncCanvasGeometry();
            requestAnimationFrame(syncCanvasGeometry);
        };
        window.addEventListener('resize', onWindowResize, { passive: true });
        if (typeof target.requestVideoFrameCallback === 'function') frameHandle = target.requestVideoFrameCallback(renderVideoFrame);
        else if (!target.paused) frameHandle = requestAnimationFrame(renderFrame);
        return true;
    }
    function enableCurrent() {
        var target = currentVideo();
        if (!target || !enabled()) return;
        if (video === target && scaler) return;
        removeCanvas();
        if (target.readyState >= 2) startRendering(target);
        else target.addEventListener('loadeddata', function onLoadedData() {
            target.removeEventListener('loadeddata', onLoadedData);
            if (enabled()) startRendering(target);
        }, { once: true, passive: true });
    }
    function disableCurrent() {
        removeCanvas();
    }
    function openVideoShapeMenu() {
        if (!window.Lampa || !Lampa.Select || typeof Lampa.Select.show !== 'function') return;
        var saved = 'default';
        try { saved = Lampa.Storage && Lampa.Storage.get ? Lampa.Storage.get('player_size', 'default') : 'default'; } catch (error) {}
        Lampa.Select.show({
            title: 'Форма відео',
            items: [
                { title: 'За замовчуванням', subtitle: 'Штатний розмір кадру', value: 'default', selected: saved === 'default' },
                { title: 'Вмістити', subtitle: 'Показати весь кадр', value: 'contain', selected: saved === 'contain' },
                { title: 'Заповнити', subtitle: 'Заповнити екран', value: 'fill', selected: saved === 'fill' },
                { title: 'Збільшити 150%', value: 's150', selected: saved === 's150' },
                { title: 'Збільшити 170%', value: 's170', selected: saved === 's170' },
                { title: 'Кіно 21:9', subtitle: 'Чорні поля без деформації', value: 'cinema219', selected: saved === 'cinema219' }
            ],
            onSelect: function (item) {
                try {
                    if (Lampa.Storage && Lampa.Storage.set) Lampa.Storage.set('player_size', item.value);
                    if (Lampa.Player && Lampa.Player.listener && typeof Lampa.Player.listener.send === 'function') Lampa.Player.listener.send('size', { size: item.value });
                } catch (error) {}
                if (Lampa.Select.close) Lampa.Select.close();
            }
        });
    }
    function installMenu() {
        if (menuInstalled || !window.Lampa || !Lampa.Select || typeof Lampa.Select.show !== 'function') return;
        menuInstalled = true;
        var originalShow = Lampa.Select.show;
        Lampa.Select.show = function (options) {
            if (!options || !Array.isArray(options.items)) return originalShow.apply(this, arguments);
            var values = options.items.map(function (item) { return item && String(item.value); });
            var isQualityMenu = options.items.some(function (item) {
                return item && (item.quality !== undefined || item.url) && item.value !== 'anime4k-toggle' && item.value !== 'anime4k2' && item.value !== 'anime4k-off';
            });
            var isMoreMenu = options.items.length >= 2 && options.items.every(function (item) { return item && typeof item.onSelect === 'function'; }) && options.items.some(function (item) {
                var title = String(item.title || '').toLowerCase();
                return title.indexOf('якіст') !== -1 || title.indexOf('качеств') !== -1 || title.indexOf('quality') !== -1 || String(item.icon || '').indexOf('sprite-hd') !== -1;
            });
            if ((!isQualityMenu && !isMoreMenu) || values.indexOf('anime4k-toggle') !== -1 || values.indexOf('anime4k2') !== -1 || values.indexOf('anime4k-off') !== -1 || values.indexOf('lampa-video-shape') !== -1) return originalShow.apply(this, arguments);
            var patched = Object.assign({}, options);
            patched.items = options.items.slice();
            if (isQualityMenu) patched.items.push({
                title: enabled() ? 'Anime4K: Вимкнути' : 'Anime4K: Увімкнути',
                subtitle: enabled() ? 'Зараз увімкнено — WebGL апскейл x2' : 'Зараз вимкнено — стандартне відео Lampa',
                value: 'anime4k-toggle',
                quality: 'anime4k-toggle'
            });
            if (isMoreMenu) patched.items.push({
                title: 'Форма відео',
                template: 'selectbox_icon',
                icon: '<svg><use xlink:href="#sprite-size"></use></svg>',
                value: 'lampa-video-shape',
                onSelect: openVideoShapeMenu
            });
            patched.onSelect = function (item) {
                if (item && item.value === 'anime4k-toggle') {
                    var nextEnabled = !enabled();
                    setEnabled(nextEnabled);
                    if (nextEnabled) enableCurrent();
                    else disableCurrent();
                    if (Lampa.Select.close) Lampa.Select.close();
                } else if (item && item.value === 'lampa-video-shape') {
                    if (Lampa.Select.close) Lampa.Select.close();
                    openVideoShapeMenu();
                } else if (typeof options.onSelect === 'function') options.onSelect(item);
            };
            return originalShow.call(this, patched);
        };
    }
    function onStart() {
        installMenu();
        if (enabled()) setTimeout(enableCurrent, 120);
    }
    function onDestroy() {
        disableCurrent();
    }
    function start() {
        if (!window.Lampa || !Lampa.Player || !Lampa.Player.listener) {
            setTimeout(start, 300);
            return;
        }
        installMenu();
        Lampa.Player.listener.follow('start', onStart);
        Lampa.Player.listener.follow('destroy', onDestroy);
    }
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
