(function() {
    var wasm;
    const __exports = {};


    let cachegetUint8Memory = null;
    function getUint8Memory() {
        if (cachegetUint8Memory === null || cachegetUint8Memory.buffer !== wasm.memory.buffer) {
            cachegetUint8Memory = new Uint8Array(wasm.memory.buffer);
        }
        return cachegetUint8Memory;
    }

    function passArray8ToWasm(arg) {
        const ptr = wasm.__wbindgen_malloc(arg.length * 1);
        getUint8Memory().set(arg, ptr / 1);
        return [ptr, arg.length];
    }
    /**
    * @param {Int8Array} arg0
    * @returns {boolean}
    */
    __exports.game_over = function(arg0) {
        const [ptr0, len0] = passArray8ToWasm(arg0);
        try {
            return (wasm.game_over(ptr0, len0)) !== 0;

        } finally {
            wasm.__wbindgen_free(ptr0, len0 * 1);

        }

    };

    /**
    * @param {Int8Array} arg0
    * @param {number} arg1
    * @returns {JsCoord}
    */
    __exports.ai_move = function(arg0, arg1) {
        const [ptr0, len0] = passArray8ToWasm(arg0);
        try {
            return JsCoord.__wrap(wasm.ai_move(ptr0, len0, arg1));

        } finally {
            wasm.__wbindgen_free(ptr0, len0 * 1);

        }

    };

    const __widl_f_log_1__target = console.log;

    const stack = [];

    const slab = [{ obj: undefined }, { obj: null }, { obj: true }, { obj: false }];

    function getObject(idx) {
        if ((idx & 1) === 1) {
            return stack[idx >> 1];
        } else {
            const val = slab[idx >> 1];

            return val.obj;

        }
    }

    __exports.__widl_f_log_1_ = function(arg0) {
        __widl_f_log_1__target(getObject(arg0));
    };

    const __widl_f_now_Performance_target = typeof Performance === 'undefined' ? null : Performance.prototype.now || function() {
        throw new Error(`wasm-bindgen: Performance.now does not exist`);
    };

    __exports.__widl_f_now_Performance = function(arg0) {
        return __widl_f_now_Performance_target.call(getObject(arg0));
    };

    __exports.__widl_instanceof_Window = function(idx) {
        return getObject(idx) instanceof Window ? 1 : 0;
    };

    let slab_next = slab.length;

    function addHeapObject(obj) {
        if (slab_next === slab.length) slab.push(slab.length + 1);
        const idx = slab_next;
        const next = slab[idx];

        slab_next = next;

        slab[idx] = { obj, cnt: 1 };
        return idx << 1;
    }

    function isLikeNone(x) {
        return x === undefined || x === null;
    }

    __exports.__widl_f_performance_Window = function(arg0) {

        const val = getObject(arg0).performance;
        return isLikeNone(val) ? 0 : addHeapObject(val);

    };

    let cachedTextDecoder = new TextDecoder('utf-8');

    function getStringFromWasm(ptr, len) {
        return cachedTextDecoder.decode(getUint8Memory().subarray(ptr, ptr + len));
    }

    __exports.__wbg_newnoargs_96cbdf0d056b2fa8 = function(arg0, arg1) {
        let varg0 = getStringFromWasm(arg0, arg1);
        return addHeapObject(new Function(varg0));
    };

    let cachegetUint32Memory = null;
    function getUint32Memory() {
        if (cachegetUint32Memory === null || cachegetUint32Memory.buffer !== wasm.memory.buffer) {
            cachegetUint32Memory = new Uint32Array(wasm.memory.buffer);
        }
        return cachegetUint32Memory;
    }

    __exports.__wbg_call_ee8306f6b79399de = function(arg0, arg1, exnptr) {
        try {
            return addHeapObject(getObject(arg0).call(getObject(arg1)));
        } catch (e) {
            const view = getUint32Memory();
            view[exnptr / 4] = 1;
            view[exnptr / 4 + 1] = addHeapObject(e);

        }
    };

    __exports.__wbg_new_baf10398b0d0c64d = function(arg0, arg1) {
        let varg0 = getStringFromWasm(arg0, arg1);
        return addHeapObject(new Function(varg0));
    };

    __exports.__wbg_call_173f04c850a68d5f = function(arg0, arg1) {
        return addHeapObject(getObject(arg0).call(getObject(arg1)));
    };

    __exports.__wbg_self_58232ab37cbe6608 = function(arg0) {
        return addHeapObject(getObject(arg0).self);
    };

    __exports.__wbg_crypto_329b714d7e7d321d = function(arg0) {
        return addHeapObject(getObject(arg0).crypto);
    };

    __exports.__wbg_getRandomValues_2f960218fce3a102 = function(arg0) {
        return addHeapObject(getObject(arg0).getRandomValues);
    };

    function getArrayU8FromWasm(ptr, len) {
        return getUint8Memory().subarray(ptr / 1, ptr / 1 + len);
    }

    __exports.__wbg_getRandomValues_5581e85fc6616df6 = function(arg0, arg1, arg2) {
        let varg1 = getArrayU8FromWasm(arg1, arg2);
        getObject(arg0).getRandomValues(varg1);
    };

    __exports.__wbg_require_4a70cbfd3adc73a8 = function(arg0, arg1) {
        let varg0 = getStringFromWasm(arg0, arg1);
        return addHeapObject(require(varg0));
    };

    __exports.__wbg_randomFillSync_355c3fcfa754fa4e = function(arg0, arg1, arg2) {
        let varg1 = getArrayU8FromWasm(arg1, arg2);
        getObject(arg0).randomFillSync(varg1);
    };

    function freeJsCoord(ptr) {

        wasm.__wbg_jscoord_free(ptr);
    }
    /**
    */
    class JsCoord {

        static __wrap(ptr) {
            const obj = Object.create(JsCoord.prototype);
            obj.ptr = ptr;

            return obj;
        }

        free() {
            const ptr = this.ptr;
            this.ptr = 0;
            freeJsCoord(ptr);
        }

        /**
        * @returns {number}
        */
        get x() {
            return wasm.__wbg_get_jscoord_x(this.ptr);
        }
        set x(arg0) {
            return wasm.__wbg_set_jscoord_x(this.ptr, arg0);
        }
        /**
        * @returns {number}
        */
        get y() {
            return wasm.__wbg_get_jscoord_y(this.ptr);
        }
        set y(arg0) {
            return wasm.__wbg_set_jscoord_y(this.ptr, arg0);
        }
    }
    __exports.JsCoord = JsCoord;

    __exports.__wbindgen_object_clone_ref = function(idx) {
        // If this object is on the stack promote it to the heap.
        if ((idx & 1) === 1) return addHeapObject(getObject(idx));

        // Otherwise if the object is on the heap just bump the
        // refcount and move on
        const val = slab[idx >> 1];
        val.cnt += 1;
        return idx;
    };

    function dropRef(idx) {

        idx = idx >> 1;
        if (idx < 4) return;
        let obj = slab[idx];

        obj.cnt -= 1;
        if (obj.cnt > 0) return;

        // If we hit 0 then free up our space in the slab
        slab[idx] = slab_next;
        slab_next = idx;
    }

    __exports.__wbindgen_object_drop_ref = function(i) {
        dropRef(i);
    };

    __exports.__wbindgen_string_new = function(p, l) {
        return addHeapObject(getStringFromWasm(p, l));
    };

    __exports.__wbindgen_is_undefined = function(idx) {
        return getObject(idx) === undefined ? 1 : 0;
    };

    __exports.__wbindgen_jsval_eq = function(a, b) {
        return getObject(a) === getObject(b) ? 1 : 0;
    };

    __exports.__wbindgen_throw = function(ptr, len) {
        throw new Error(getStringFromWasm(ptr, len));
    };

    function init(path_or_module) {
        let instantiation;
        const imports = { './hobogo': __exports };
        if (path_or_module instanceof WebAssembly.Module) {
            instantiation = WebAssembly.instantiate(path_or_module, imports)
            .then(instance => {
            return { instance, module: module_or_path }
        });
    } else {
        const data = fetch(path_or_module);
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            instantiation = WebAssembly.instantiateStreaming(data, imports);
        } else {
            instantiation = data
            .then(response => response.arrayBuffer())
            .then(buffer => WebAssembly.instantiate(buffer, imports));
        }
    }
    return instantiation.then(({instance}) => {
        wasm = init.wasm = instance.exports;
        return;
    });
};
self.wasm_bindgen = Object.assign(init, __exports);
})();
