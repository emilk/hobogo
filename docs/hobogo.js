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
    * @param {number} arg1
    * @returns {number}
    */
    __exports.ai_evaluate = function(arg0, arg1) {
        const [ptr0, len0] = passArray8ToWasm(arg0);
        try {
            return wasm.ai_evaluate(ptr0, len0, arg1);

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

    let cachedTextDecoder = new TextDecoder('utf-8');

    function getStringFromWasm(ptr, len) {
        return cachedTextDecoder.decode(getUint8Memory().subarray(ptr, ptr + len));
    }

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
