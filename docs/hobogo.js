(function() {
    var wasm;
    const __exports = {};


    let cachedTextEncoder = new TextEncoder('utf-8');

    let cachegetUint8Memory = null;
    function getUint8Memory() {
        if (cachegetUint8Memory === null || cachegetUint8Memory.buffer !== wasm.memory.buffer) {
            cachegetUint8Memory = new Uint8Array(wasm.memory.buffer);
        }
        return cachegetUint8Memory;
    }

    let WASM_VECTOR_LEN = 0;

    let passStringToWasm;
    if (typeof cachedTextEncoder.encodeInto === 'function') {
        passStringToWasm = function(arg) {

            let size = arg.length;
            let ptr = wasm.__wbindgen_malloc(size);
            let writeOffset = 0;
            while (true) {
                const view = getUint8Memory().subarray(ptr + writeOffset, ptr + size);
                const { read, written } = cachedTextEncoder.encodeInto(arg, view);
                arg = arg.substring(read);
                writeOffset += written;
                if (arg.length === 0) {
                    break;
                }
                ptr = wasm.__wbindgen_realloc(ptr, size, size * 2);
                size *= 2;
            }
            WASM_VECTOR_LEN = writeOffset;
            return ptr;
        };
    } else {
        passStringToWasm = function(arg) {

            const buf = cachedTextEncoder.encode(arg);
            const ptr = wasm.__wbindgen_malloc(buf.length);
            getUint8Memory().set(buf, ptr);
            WASM_VECTOR_LEN = buf.length;
            return ptr;
        };
    }
    /**
    * @param {string} arg0
    * @param {number} arg1
    * @returns {State}
    */
    __exports.new_webgl_gui = function(arg0, arg1) {
        const ptr0 = passStringToWasm(arg0);
        const len0 = WASM_VECTOR_LEN;
        try {
            return State.__wrap(wasm.new_webgl_gui(ptr0, len0, arg1));

        } finally {
            wasm.__wbindgen_free(ptr0, len0 * 1);

        }

    };

    /**
    * @param {State} arg0
    * @param {string} arg1
    * @returns {void}
    */
    __exports.run_gui = function(arg0, arg1) {
        const ptr1 = passStringToWasm(arg1);
        const len1 = WASM_VECTOR_LEN;
        try {
            return wasm.run_gui(arg0.ptr, ptr1, len1);

        } finally {
            wasm.__wbindgen_free(ptr1, len1 * 1);

        }

    };

    let cachedTextDecoder = new TextDecoder('utf-8');

    function getStringFromWasm(ptr, len) {
        return cachedTextDecoder.decode(getUint8Memory().subarray(ptr, ptr + len));
    }

    const heap = new Array(32);

    heap.fill(undefined);

    heap.push(undefined, null, true, false);

    let heap_next = heap.length;

    function addHeapObject(obj) {
        if (heap_next === heap.length) heap.push(heap.length + 1);
        const idx = heap_next;
        heap_next = heap[idx];

        heap[idx] = obj;
        return idx;
    }

    __exports.__wbg_new_d87f272aec784ec0 = function(arg0, arg1) {
        let varg0 = getStringFromWasm(arg0, arg1);
        return addHeapObject(new Function(varg0));
    };

function getObject(idx) { return heap[idx]; }

__exports.__wbg_call_eae29933372a39be = function(arg0, arg1) {
    return addHeapObject(getObject(arg0).call(getObject(arg1)));
};

__exports.__wbg_self_e0b3266d2d9eba1a = function(arg0) {
    return addHeapObject(getObject(arg0).self);
};

__exports.__wbg_crypto_e95a6e54c5c2e37f = function(arg0) {
    return addHeapObject(getObject(arg0).crypto);
};

__exports.__wbg_getRandomValues_dc67302a7bd1aec5 = function(arg0) {
    return addHeapObject(getObject(arg0).getRandomValues);
};

function getArrayU8FromWasm(ptr, len) {
    return getUint8Memory().subarray(ptr / 1, ptr / 1 + len);
}

__exports.__wbg_getRandomValues_02639197c8166a96 = function(arg0, arg1, arg2) {
    let varg1 = getArrayU8FromWasm(arg1, arg2);
    getObject(arg0).getRandomValues(varg1);
};

__exports.__wbg_require_0993fe224bf8e202 = function(arg0, arg1) {
    let varg0 = getStringFromWasm(arg0, arg1);
    return addHeapObject(require(varg0));
};

__exports.__wbg_randomFillSync_dd2297de5917c74e = function(arg0, arg1, arg2) {
    let varg1 = getArrayU8FromWasm(arg1, arg2);
    getObject(arg0).randomFillSync(varg1);
};

function isLikeNone(x) {
    return x === undefined || x === null;
}

__exports.__widl_f_get_element_by_id_Document = function(arg0, arg1, arg2) {
    let varg1 = getStringFromWasm(arg1, arg2);

    const val = getObject(arg0).getElementById(varg1);
    return isLikeNone(val) ? 0 : addHeapObject(val);

};

__exports.__widl_instanceof_HTMLCanvasElement = function(idx) { return getObject(idx) instanceof HTMLCanvasElement ? 1 : 0; };

let cachegetUint32Memory = null;
function getUint32Memory() {
    if (cachegetUint32Memory === null || cachegetUint32Memory.buffer !== wasm.memory.buffer) {
        cachegetUint32Memory = new Uint32Array(wasm.memory.buffer);
    }
    return cachegetUint32Memory;
}

function handleError(exnptr, e) {
    const view = getUint32Memory();
    view[exnptr / 4] = 1;
    view[exnptr / 4 + 1] = addHeapObject(e);
}

__exports.__widl_f_get_context_HTMLCanvasElement = function(arg0, arg1, arg2, exnptr) {
    let varg1 = getStringFromWasm(arg1, arg2);
    try {

        const val = getObject(arg0).getContext(varg1);
        return isLikeNone(val) ? 0 : addHeapObject(val);

    } catch (e) {
        handleError(exnptr, e);
    }
};

__exports.__widl_f_width_HTMLCanvasElement = function(arg0) {
    return getObject(arg0).width;
};

__exports.__widl_f_height_HTMLCanvasElement = function(arg0) {
    return getObject(arg0).height;
};

__exports.__widl_f_now_Performance = function(arg0) {
    return getObject(arg0).now();
};

__exports.__widl_f_get_item_Storage = function(ret, arg0, arg1, arg2, exnptr) {
    let varg1 = getStringFromWasm(arg1, arg2);
    try {
        const val = getObject(arg0).getItem(varg1);
        const retptr = isLikeNone(val) ? [0, 0] : passStringToWasm(val);
        const retlen = WASM_VECTOR_LEN;
        const mem = getUint32Memory();
        mem[ret / 4] = retptr;
        mem[ret / 4 + 1] = retlen;

    } catch (e) {
        handleError(exnptr, e);
    }
};

__exports.__widl_f_set_item_Storage = function(arg0, arg1, arg2, arg3, arg4, exnptr) {
    let varg1 = getStringFromWasm(arg1, arg2);
    let varg3 = getStringFromWasm(arg3, arg4);
    try {
        getObject(arg0).setItem(varg1, varg3);
    } catch (e) {
        handleError(exnptr, e);
    }
};

__exports.__widl_instanceof_WebGLRenderingContext = function(idx) { return getObject(idx) instanceof WebGLRenderingContext ? 1 : 0; };

__exports.__widl_f_buffer_data_with_array_buffer_view_WebGLRenderingContext = function(arg0, arg1, arg2, arg3) {
    getObject(arg0).bufferData(arg1, getObject(arg2), arg3);
};

__exports.__widl_f_tex_image_2d_with_i32_and_i32_and_i32_and_format_and_type_and_opt_u8_array_WebGLRenderingContext = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, exnptr) {
    let varg9 = arg9 == 0 ? undefined : getArrayU8FromWasm(arg9, arg10);
    try {
        getObject(arg0).texImage2D(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, varg9);
    } catch (e) {
        handleError(exnptr, e);
    }
};

__exports.__widl_f_active_texture_WebGLRenderingContext = function(arg0, arg1) {
    getObject(arg0).activeTexture(arg1);
};

__exports.__widl_f_attach_shader_WebGLRenderingContext = function(arg0, arg1, arg2) {
    getObject(arg0).attachShader(getObject(arg1), getObject(arg2));
};

__exports.__widl_f_bind_buffer_WebGLRenderingContext = function(arg0, arg1, arg2) {
    getObject(arg0).bindBuffer(arg1, getObject(arg2));
};

__exports.__widl_f_bind_texture_WebGLRenderingContext = function(arg0, arg1, arg2) {
    getObject(arg0).bindTexture(arg1, getObject(arg2));
};

__exports.__widl_f_blend_func_WebGLRenderingContext = function(arg0, arg1, arg2) {
    getObject(arg0).blendFunc(arg1, arg2);
};

__exports.__widl_f_clear_WebGLRenderingContext = function(arg0, arg1) {
    getObject(arg0).clear(arg1);
};

__exports.__widl_f_clear_color_WebGLRenderingContext = function(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).clearColor(arg1, arg2, arg3, arg4);
};

__exports.__widl_f_compile_shader_WebGLRenderingContext = function(arg0, arg1) {
    getObject(arg0).compileShader(getObject(arg1));
};

__exports.__widl_f_create_buffer_WebGLRenderingContext = function(arg0) {

    const val = getObject(arg0).createBuffer();
    return isLikeNone(val) ? 0 : addHeapObject(val);

};

__exports.__widl_f_create_program_WebGLRenderingContext = function(arg0) {

    const val = getObject(arg0).createProgram();
    return isLikeNone(val) ? 0 : addHeapObject(val);

};

__exports.__widl_f_create_shader_WebGLRenderingContext = function(arg0, arg1) {

    const val = getObject(arg0).createShader(arg1);
    return isLikeNone(val) ? 0 : addHeapObject(val);

};

__exports.__widl_f_create_texture_WebGLRenderingContext = function(arg0) {

    const val = getObject(arg0).createTexture();
    return isLikeNone(val) ? 0 : addHeapObject(val);

};

__exports.__widl_f_draw_elements_with_i32_WebGLRenderingContext = function(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).drawElements(arg1, arg2, arg3, arg4);
};

__exports.__widl_f_enable_WebGLRenderingContext = function(arg0, arg1) {
    getObject(arg0).enable(arg1);
};

__exports.__widl_f_enable_vertex_attrib_array_WebGLRenderingContext = function(arg0, arg1) {
    getObject(arg0).enableVertexAttribArray(arg1);
};

__exports.__widl_f_get_attrib_location_WebGLRenderingContext = function(arg0, arg1, arg2, arg3) {
    let varg2 = getStringFromWasm(arg2, arg3);
    return getObject(arg0).getAttribLocation(getObject(arg1), varg2);
};

__exports.__widl_f_get_program_info_log_WebGLRenderingContext = function(ret, arg0, arg1) {
    const val = getObject(arg0).getProgramInfoLog(getObject(arg1));
    const retptr = isLikeNone(val) ? [0, 0] : passStringToWasm(val);
    const retlen = WASM_VECTOR_LEN;
    const mem = getUint32Memory();
    mem[ret / 4] = retptr;
    mem[ret / 4 + 1] = retlen;

};

__exports.__widl_f_get_program_parameter_WebGLRenderingContext = function(arg0, arg1, arg2) {
    return addHeapObject(getObject(arg0).getProgramParameter(getObject(arg1), arg2));
};

__exports.__widl_f_get_shader_info_log_WebGLRenderingContext = function(ret, arg0, arg1) {
    const val = getObject(arg0).getShaderInfoLog(getObject(arg1));
    const retptr = isLikeNone(val) ? [0, 0] : passStringToWasm(val);
    const retlen = WASM_VECTOR_LEN;
    const mem = getUint32Memory();
    mem[ret / 4] = retptr;
    mem[ret / 4 + 1] = retlen;

};

__exports.__widl_f_get_shader_parameter_WebGLRenderingContext = function(arg0, arg1, arg2) {
    return addHeapObject(getObject(arg0).getShaderParameter(getObject(arg1), arg2));
};

__exports.__widl_f_get_uniform_location_WebGLRenderingContext = function(arg0, arg1, arg2, arg3) {
    let varg2 = getStringFromWasm(arg2, arg3);

    const val = getObject(arg0).getUniformLocation(getObject(arg1), varg2);
    return isLikeNone(val) ? 0 : addHeapObject(val);

};

__exports.__widl_f_link_program_WebGLRenderingContext = function(arg0, arg1) {
    getObject(arg0).linkProgram(getObject(arg1));
};

__exports.__widl_f_shader_source_WebGLRenderingContext = function(arg0, arg1, arg2, arg3) {
    let varg2 = getStringFromWasm(arg2, arg3);
    getObject(arg0).shaderSource(getObject(arg1), varg2);
};

__exports.__widl_f_tex_parameteri_WebGLRenderingContext = function(arg0, arg1, arg2, arg3) {
    getObject(arg0).texParameteri(arg1, arg2, arg3);
};

__exports.__widl_f_uniform1i_WebGLRenderingContext = function(arg0, arg1, arg2) {
    getObject(arg0).uniform1i(getObject(arg1), arg2);
};

__exports.__widl_f_uniform2f_WebGLRenderingContext = function(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform2f(getObject(arg1), arg2, arg3);
};

__exports.__widl_f_use_program_WebGLRenderingContext = function(arg0, arg1) {
    getObject(arg0).useProgram(getObject(arg1));
};

__exports.__widl_f_vertex_attrib_pointer_with_i32_WebGLRenderingContext = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    getObject(arg0).vertexAttribPointer(arg1, arg2, arg3, arg4 !== 0, arg5, arg6);
};

__exports.__widl_f_viewport_WebGLRenderingContext = function(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).viewport(arg1, arg2, arg3, arg4);
};

__exports.__widl_instanceof_Window = function(idx) { return getObject(idx) instanceof Window ? 1 : 0; };

__exports.__widl_f_document_Window = function(arg0) {

    const val = getObject(arg0).document;
    return isLikeNone(val) ? 0 : addHeapObject(val);

};

__exports.__widl_f_performance_Window = function(arg0) {

    const val = getObject(arg0).performance;
    return isLikeNone(val) ? 0 : addHeapObject(val);

};

__exports.__widl_f_local_storage_Window = function(arg0, exnptr) {
    try {

        const val = getObject(arg0).localStorage;
        return isLikeNone(val) ? 0 : addHeapObject(val);

    } catch (e) {
        handleError(exnptr, e);
    }
};

__exports.__wbg_new_00eb63e4d0ee8796 = function(arg0) {
    return addHeapObject(new Float32Array(getObject(arg0)));
};

__exports.__wbg_subarray_a64203346c9773d6 = function(arg0, arg1, arg2) {
    return addHeapObject(getObject(arg0).subarray(arg1, arg2));
};

__exports.__wbg_newnoargs_56431a307f4eb856 = function(arg0, arg1) {
    let varg0 = getStringFromWasm(arg0, arg1);
    return addHeapObject(new Function(varg0));
};

__exports.__wbg_call_f6ee70703ec77c6c = function(arg0, arg1, exnptr) {
    try {
        return addHeapObject(getObject(arg0).call(getObject(arg1)));
    } catch (e) {
        handleError(exnptr, e);
    }
};

__exports.__wbg_new_138409b4887d6dd6 = function(arg0) {
    return addHeapObject(new Int16Array(getObject(arg0)));
};

__exports.__wbg_subarray_783c98c421ae1b96 = function(arg0, arg1, arg2) {
    return addHeapObject(getObject(arg0).subarray(arg1, arg2));
};

__exports.__wbg_new_0763112334e4d8dd = function(arg0) {
    return addHeapObject(new Uint8Array(getObject(arg0)));
};

__exports.__wbg_subarray_b0dbd9eb6fca9341 = function(arg0, arg1, arg2) {
    return addHeapObject(getObject(arg0).subarray(arg1, arg2));
};

__exports.__wbg_new_fad4b1eaf5748cf4 = function(arg0) {
    return addHeapObject(new Uint16Array(getObject(arg0)));
};

__exports.__wbg_subarray_20d7705e928d8a85 = function(arg0, arg1, arg2) {
    return addHeapObject(getObject(arg0).subarray(arg1, arg2));
};

__exports.__wbg_instanceof_Memory_d6aeebcf1c6c121e = function(idx) { return getObject(idx) instanceof WebAssembly.Memory ? 1 : 0; };

__exports.__wbg_buffer_8a74a93c17ac10c7 = function(arg0) {
    return addHeapObject(getObject(arg0).buffer);
};

__exports.__wbindgen_string_new = function(p, l) { return addHeapObject(getStringFromWasm(p, l)); };

__exports.__wbindgen_is_undefined = function(i) { return getObject(i) === undefined ? 1 : 0; };

__exports.__wbindgen_boolean_get = function(i) {
    let v = getObject(i);
    return typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
};

__exports.__wbindgen_debug_string = function(i, len_ptr) {
    const debug_str =
    val => {
        // primitive types
        const type = typeof val;
        if (type == 'number' || type == 'boolean' || val == null) {
            return  `${val}`;
        }
        if (type == 'string') {
            return `"${val}"`;
        }
        if (type == 'symbol') {
            const description = val.description;
            if (description == null) {
                return 'Symbol';
            } else {
                return `Symbol(${description})`;
            }
        }
        if (type == 'function') {
            const name = val.name;
            if (typeof name == 'string' && name.length > 0) {
                return `Function(${name})`;
            } else {
                return 'Function';
            }
        }
        // objects
        if (Array.isArray(val)) {
            const length = val.length;
            let debug = '[';
            if (length > 0) {
                debug += debug_str(val[0]);
            }
            for(let i = 1; i < length; i++) {
                debug += ', ' + debug_str(val[i]);
            }
            debug += ']';
            return debug;
        }
        // Test for built-in
        const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
        let className;
        if (builtInMatches.length > 1) {
            className = builtInMatches[1];
        } else {
            // Failed to match the standard '[object ClassName]'
            return toString.call(val);
        }
        if (className == 'Object') {
            // we're a user defined class or Object
            // JSON.stringify avoids problems with cycles, and is generally much
            // easier than looping through ownProperties of `val`.
            try {
                return 'Object(' + JSON.stringify(val) + ')';
            } catch (_) {
                return 'Object';
            }
        }
        // errors
        if (val instanceof Error) {
        return `${val.name}: ${val.message}
        ${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}
;
const toString = Object.prototype.toString;
const val = getObject(i);
const debug = debug_str(val);
const ptr = passStringToWasm(debug);
getUint32Memory()[len_ptr / 4] = WASM_VECTOR_LEN;
return ptr;
};

__exports.__wbindgen_jsval_eq = function(a, b) { return getObject(a) === getObject(b) ? 1 : 0; };

__exports.__wbindgen_memory = function() { return addHeapObject(wasm.memory); };

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

__exports.__wbindgen_rethrow = function(idx) { throw takeObject(idx); };

function freeState(ptr) {

    wasm.__wbg_state_free(ptr);
}
/**
*/
class State {

    static __wrap(ptr) {
        const obj = Object.create(State.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;
        freeState(ptr);
    }

}
__exports.State = State;

__exports.__wbindgen_object_clone_ref = function(idx) {
    return addHeapObject(getObject(idx));
};

__exports.__wbindgen_object_drop_ref = function(i) { dropObject(i); };

__exports.__wbindgen_throw = function(ptr, len) {
    throw new Error(getStringFromWasm(ptr, len));
};

function init(path_or_module) {
    let instantiation;
    const imports = { './hobogo': __exports };
    if (path_or_module instanceof WebAssembly.Module) {
        instantiation = WebAssembly.instantiate(path_or_module, imports)
        .then(instance => {
        return { instance, module: path_or_module }
    });
} else {
    const data = fetch(path_or_module);
    if (typeof WebAssembly.instantiateStreaming === 'function') {
        instantiation = WebAssembly.instantiateStreaming(data, imports)
        .catch(e => {
            console.warn("`WebAssembly.instantiateStreaming` failed. Assuming this is because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
            return data
            .then(r => r.arrayBuffer())
            .then(bytes => WebAssembly.instantiate(bytes, imports));
        });
    } else {
        instantiation = data
        .then(response => response.arrayBuffer())
        .then(buffer => WebAssembly.instantiate(buffer, imports));
    }
}
return instantiation.then(({instance}) => {
    wasm = init.wasm = instance.exports;

});
};
self.wasm_bindgen = Object.assign(init, __exports);
})();
