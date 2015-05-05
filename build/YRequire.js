(function ( window ) {

"use strict";

var _inArray,
    indexOf = Array.prototype.indexOf;

if (!indexOf) {

    _inArray = function (arr, value) {

        var ret = -1;

        for (var i = 0; i < arr.length; i++) {

            if (arr [i] === value) {

                ret = i;
            }
        }

        return ret;
    };
}
else {

    _inArray = function (arr, value) {

        return indexOf.call(arr, value);
    }
}

var _noop = function () {
};

var _isFunction = function (func) {

    return Object.prototype.toString.call(func) === '[object Function]';
};

var _isArray = function (arr) {

    return Object.prototype.toString.call(arr) === '[object Array]';
};

var _isObject = function (obj) {

    return Object.prototype.toString.call(obj) === '[object Object]';
};

//shim console
if (!window.console) {

    window.console = {
        log: _noop,
        warn: _noop,
        error: _noop
    }
}
/*
 * 脚本/css文件加载器，支持加载js和css文件并解析，为XRequire和YRequire提供底层支持，也可以单独使用
 * 在YRequire全局变量中内置了loader的引用
 * 其中js有异步和同步两种模式，异步模式下有两种子模式：异步下载并解析，异步下载但不解析
 * 三种模式的实现方式分别是：
 * 同步：同步ajax请求获取脚本文本+全局eval，之后向document.head中插入script标签但阻止浏览器自动解析
 * 异步解析：script标签
 * 异步下载不解析：异步ajax请求获取脚本文本，之后向document.head中插入script标签但阻止浏览器自动解析（计划以此为基础实现CommonJS加载器）
 *
 * 接受一个数组作为参数，如果数组中的元素是对象，则会根据对象的path属性加载文件，并且将对象其他的属性设为script/link标签的html属性
 * 如果是一个字符串，则只加载文件
 * 接受的第二个参数为结束回调，接受一个数组为参数，在同步和普通异步模式下，该数组保存的是添加到页面中的所有script标签
 * 在异步下载但不解析模式下，该数组保存了所有下载的脚本的text
 *
 * 加载css文件：简单的创建一个link标签后插入head
 * 加载html文件：发送一个同步ajax请求，返回获得的responseText，只能一次加载一个html文件
 */
var loader = (function () {

    //私有的option对象
    var option = {
        root: "",
        mod: 'async'
    };

    //正则表达式
    var rinvalidAttr = /^\s*(src|href|type|path|rel)\s*$/,
    //是否为绝对路径
        rabsoluteUrl = /^\s*(?:http:\/\/|\/|\.\/|\.\.\/)/,
        rlastSlash = /\/$/;

    var head = document.head || document.getElementsByTagName('head')[0];

    //config方法，设置option对象，实例方法
    var config = function (opt) {

        for (var key in opt) {

            if (opt.hasOwnProperty(key) && option.hasOwnProperty(key)) {

                option[key] = opt[key];
            }
        }

        return this;
    };

    //全局eval，实例方法
    //如果使用了jshint来校验，需要手动设置忽略eval规则，否则会报错
    //copy了jQuery.globalEval的实现，确保在全局作用域下执行
    var globalEval = function (text) {

        (window.execScript || function (text) {

            window['eval'].call(window, text);
        })(text);
    };

    //工具函数，向document.head中插入一个script标签，但阻止浏览器自动解析其中的js代码
    var _insertScriptNotEval = function (script, src, scriptText) {

        head.appendChild(script);

        //制止浏览器自动执行script标签中的js代码，所以临时将type设为text之后插入文本
        script.type = "text";
        script.text = scriptText;

        //由于谷歌浏览器在修改script标签的src属性时依然会执行js代码，因此先设置src，后更改type
        script.src = src;
        //将type重置为text/javascript，不会执行其中的代码，在ff/chrome/ie7+下测试通过
        script.type = "text/javascript";
    };

    //判断是否为绝对路径或者以http://开头的url
    //如果是以上两种情况，忽略root而直接使用传入的绝对路径
    //如果不是，则在所有传入的路径前加上root
    var _modifyPath = function (path) {

        var root = option.root ? option.root.replace(rlastSlash, '') + "/" : "",
            isAbsoluteUrl = rabsoluteUrl.test(path);

        return isAbsoluteUrl ? path : root + path;
    };

    //工具函数，为script/link标签设置附加属性
    var _setAttr = function (file, script, isJs) {

        for (var attr in file) {

            if (file.hasOwnProperty(attr) && !rinvalidAttr.test(attr)) {

                script.setAttribute(attr, isJs && attr === 'data-main' ? modifyPath(file[attr]) : file[attr]);
            }
        }
    };

    //工具函数，发送一个同步ajax请求
    var _sendSyncRequest = function (src) {

        var xhrSync = new XMLHttpRequest();
        xhrSync.open("GET", src, false);
        xhrSync.send();

        if (xhrSync.status !== 200) {

            throw new Error(src + ':' + xhrSync.status + ' ' + xhrSync.statusText);
        }

        return xhrSync.responseText;
    };

    //加载js文件，实例方法
    var load = function () {

        //获取加载模式
        var mod = option.mod,
        //同步模式
            isSync = mod.search('async') === -1,
        //普通异步模式
            isAsync = mod.search('async') !== -1 && mod.search('noteval') === -1,
        //特殊异步模式，下载脚本但不解析
            isAsyncNotEval = mod.search('async') !== -1 && mod.search('noteval') !== -1;

        //需要加载的文件数组，循环中对数组中每一个元素的引用，是否为绝对url
        var files = arguments[0], file,
        //js脚本加载完成后执行的回调
            callback = arguments[1] || function () {
                    console.log('all loaded');
                };

        //计数器，在异步加载模式下使用
        //scripts中存放了加载完成后的一些数据，根据模式的不同会议
        var count = 0, scripts = [];

        //在循环中使用的变量
        var script, src, resText;

        for (var i = 0; i < files.length; i++) {

            file = files[i];

            //修正file对象
            file = typeof file === 'object' ? file : {path: file};
            //修正src
            src = _modifyPath(file.path);
            script = document.createElement('script');

            //同步加载模式
            //通过同步ajax请求获得script标签的内容，然后用eval执行
            //之后插入script标签，并且通过一些很奇怪的方法阻止浏览器自动解析新插入的script标签
            if (isSync) {

                resText = _sendSyncRequest(src);

                //手动解析js代码
                globalEval(resText);

                _insertScriptNotEval(script, src, resText);

                scripts.push(script);

                _setAttr(file, script, true);
            }
            //异步加载
            else {

                //普通异步模式，异步下载并解析脚本
                if (isAsync) {

                    script.src = src;
                    count++;

                    script.onload = script.onreadystatechange = function () {

                        if (!this.readyState || this.readyState == "loaded" || this.readyState == "complete") {

                            //每一个js完成解析后会将计数器减1
                            //当计数器为0时触发结束回调
                            if (--count === 0) {

                                callback(scripts);
                            }
                        }
                    };

                    head.appendChild(script);

                    scripts.push(script);

                    _setAttr(file, script, true);
                }
                //特殊模式，异步下载脚本但不解析
                else if (isAsyncNotEval) {

                    count++;
                    //创造一个局部作用域，消除可能的闭包导致的引用问题
                    (function () {

                        var xhr = new XMLHttpRequest();
                        //这里给xhr设置src和file是为了消除闭包导致的引用问题
                        xhr.src = src;
                        xhr.file = file;
                        xhr.open("GET", src);

                        xhr.onreadystatechange = function () {

                            var script;

                            if (this.readyState == 4) {

                                if (this.status === 200) {

                                    //将获取的脚本文本加入scripts数组
                                    scripts.push(this.responseText);

                                    //向head插入一个script标签但制止浏览器自动解析脚本
                                    script = document.createElement('script');
                                    _insertScriptNotEval(script, this.src, this.responseText);

                                    //所有脚本下载完成后触发回调
                                    if (--count === 0) {

                                        callback(scripts);
                                    }

                                    _setAttr(this.file, script, true);
                                }
                                else {

                                    throw new Error(this.src + ':' + this.status + ' ' + this.responseText);
                                }
                            }
                        };

                        xhr.send();
                    })();
                }
            }
        }

        if (option.mod === 'sync') {

            callback(scripts);
        }
    };

    var loadCss = function (file) {

        file = typeof file === 'object' ? file : {path: file};

        var link = document.createElement('link'),
            rel = file.rel || "stylesheet";

        link.href = _modifyPath(file.path);
        link.rel = rel;

        _setAttr(file, link, false);

        head.appendChild(link);
    };

    var loadHtml = function (file) {

        return _sendSyncRequest(_modifyPath(file));
    };

    return {
        config: config,
        load: load,
        loadCss: loadCss,
        loadHtml: loadHtml,
        globalEval: globalEval
    };
})();
/**
 * Created by Ellery1 on 15/4/30.
 * AMD模块加载器，使用方式几乎和RequireJS完全相同
 * 仅实现了RequireJS的基础特性，不支持shims,懒加载等高级特性
 */

var option = {
    baseUrl: '',
    //模块的缩写（注意和下面的alias并不是一回事）
    map: {
        //modAlias:path
    }
};

var module = {
    //正在加载的模块数
    pending: 0,
    //模块的自定义id
    alias: {},
    //加载的所有模块
    mods: {},
    //option对象的引用
    option: option
};
var loadedMods = [], depRelations = [];

//设置option
var config = function (opt) {

    for (var key in opt) {

        if (opt.hasOwnProperty(key) && option.hasOwnProperty(key)) {

            option[key] = opt[key];
        }
    }
};

var rlastSlash = /\/$/,
    rJs = /\.js$/,
    rhtml = /[^\/]+\.htm[l]?(?:.*)?/,
    rabsoluteUrl = /^\s*(?:http[s]?:\/\/|\/|\.\/|\.\.\/)/;

//工具函数，判断是否为绝对路径
//绝对路径包括以/, ../,./,http://,https://开始的路径
var _isAbsolute = function (url) {

    return rabsoluteUrl.test(url);
};

//修正baseUrl
//如果设置的baseUrl忘了加上结尾的/，则自动添加一个/
var _getBaseUrl = function (url) {

    return url ? url.replace(rlastSlash, '') + "/" : "";
};

//根据模块id获取模块文件路径，正常情况下为baseUrl+相对于baseUrl的剩余部分
//如果用户在map中自定义了别名，则先从map中读取别名对应的路径，然后按照正常情况处理
//如果是绝对路径，则直接返回绝对路径
var _getRealPath = function (modId) {

    var map = option.map,
        baseUrl = option.baseUrl,
        path = map[modId] ? map[modId] : modId;

    return _isAbsolute(path) ? path : _getBaseUrl(baseUrl) + path;
};

//在模块路径后添加.js
var _getRealUrl = function (realPath) {

    return realPath + (rJs.test(realPath) ? '' : '.js');
};

//获取正在执行的脚本的src，用来设置模块id
var _getCurrentSrc = function () {

    return document.currentScript.src;
};

var _getRelativePath = function (url) {

    var host = window.location.origin,
        pageRoot = window.location.pathname.replace(rhtml, '');

    return url
        .replace(host, '')
        .replace(pageRoot, '')
        .replace(rJs, '')
        .replace(_getBaseUrl(option.baseUrl), '');
};

//根据脚本src属性创建一个模块id
//将会统一替换掉服务器根路径，以及引用了主文件的页面的上层路径，还有.js后缀
//如果用户在option.map中指定了模块的别名，则使用别名替换默认路径
var _createId = function (url) {

    var id,
        map = option.map;

    id = _getRelativePath(url);

    for (var key in map) {

        if (map.hasOwnProperty(key) && map[key] === id) {

            return key;
        }
    }

    return id;
};

//根据key获得一个模块，key可以是map中用户自定义的别名，也可以是默认的id，也可以是通过define的第一个参数定义的id
//先尝试直接根据id从module对象直接读取
//如果在module对象中找不到，则尝试在module.alias中寻找用户定义的id(define的第一个参数指定的id，而非option.map中的别名)，然后从module中尝试读取
//非常不推荐后一种做法，用户自定义id将在构建工具中使用
var _getMod = function (key) {

    var realId, alias = module.alias;

    realId = module.mods[key] ? key : alias[key];

    return module.mods[realId];
};

//解析一个模块，生成exports对象
//递归过程：如果模块已经被解析，则直接返回exports
//如果模块没有依赖，则直接执行callback，返回exports
//如果模块有依赖，则先解析它依赖的模块，然后执行callback
var _compile = function (mod) {

    var args = [], exports, depModId;

    if (mod) {

        if (mod.exports) {

            exports = mod.exports;
        }
        else if (!mod.deps || mod.deps.length === 0) {

            exports = mod.exports = mod.callback();
        }
        else {

            for (var i = 0; i < mod.deps.length; i++) {

                depModId = mod.deps[i];
                args.push(_compile(_getMod(depModId)));
            }

            exports = mod.exports = mod.callback.apply(window, args);
        }

        return exports;
    }
};

//所有模块载入后执行的回调
//将调用_compile依次解析所有读取的模块
var _allLoaded = function () {

    console.log(module);

    try {

        for (var key in module.mods) {

            if (module.mods.hasOwnProperty(key)) {

                _compile(_getMod(key));
            }
        }
    }
    catch (e) {

        if (e.toString().search('too much recursion') !== -1) {

            console.error('循环引用.');
        }
        else {

            throw new Error(e);
        }
    }

    console.log(module);
};

//define函数
//模块定义
var define = function (id, deps, callback) {

    //如果没有接受参数，直接返回
    if (arguments.length === 0) {

        return;
    }

    //修正参数
    //如果只接受一个参数，且这个参数是function或者object，则将它修正为callback
    if (!deps && !callback && (_isFunction(id) || _isObject(id))) {

        callback = id;
        deps = [];
        id = null;
    }
    //如果接受两个参数
    else if (!callback) {

        //如果第二个参数是function/object,第一个参数是数组，
        //将第一个参数修正为deps,第二个参数修正为callback
        if ((_isFunction(deps) || _isObject(deps)) && _isArray(id)) {

            callback = deps;
            deps = id;
            id = null;
        }
        //如果第一个参数是字符串，第二个参数是function/object
        //将第二个参数修正为callback
        else if (typeof id === 'string' && (_isFunction(deps) || _isObject(deps))) {

            callback = deps;
            deps = [];
        }
    }

    //获取当前script标签的src属性
    var realSrc = _getCurrentSrc(),
        realSrcWithoutOrigin = _getRelativePath(realSrc),
    //为模块分配一个id
        modId = _createId(realSrc);

    depRelations.push(realSrcWithoutOrigin + ' ' + realSrcWithoutOrigin);

    //如果用户自定义id，则使用用户的自定义id为模块id
    if (id) {

        //在module.alias中保存一个映射
        module.alias[modId] = id;
        modId = id;
    }

    module.mods[modId] = {
        id: modId,
        deps: deps,
        callback: callback,
        exports: null,
        realUrl: realSrc
    };

    //如果callback是对象，则直接将它置为exports
    if (_isObject(callback)) {

        module.mods[modId].callback = _noop;
        module.mods[modId].exports = callback;
    }

    //加载这个模块依赖的其他模块
    for (var i = 0; i < deps.length; i++) {

        var dep = deps[i];
        //获取依赖的真实路径和url
        var realPath = _getRealPath(dep),
            realUrl = _getRealUrl(realPath),
        //判断循环引用使用的变量
            realPathWithoutBase = _getRelativePath(realPath),
            depRelation = realSrcWithoutOrigin + ' ' + realPathWithoutBase,
            reverse = realPathWithoutBase + ' ' + realSrcWithoutOrigin;

        if (_inArray(depRelations, depRelation) === -1) {

            depRelations.push(reverse);

            //检测这个依赖是否已经加载过，如果已经加载过则跳过以下代码
            if (_inArray(loadedMods, realPath) === -1) {

                //如果依赖没有被加载过，则将真实路径推入loadedMods数组
                loadedMods.push(realPath);

                //计数器加1
                module.pending++;

                //加载依赖
                //完成后将计数器减1
                //当计数器为0时（即所有模块都已加载完成），触发_allLoaded回调
                loader.load([realUrl], function () {

                    module.pending--;

                    if (module.pending === 0) {

                        _allLoaded();
                    }
                });
            }
        }
        else {

            throw new Error('循环引用：' + depRelation);
        }
    }
};

//定义一个define的别名，为主入口文件使用的require，在require函数中无法自定义id
var require = function (deps, callback) {

    return define.apply(window, [null, deps, callback]);
};

define.amd = true;
require.config = config;

//暴露全局变量
window.define = define;
window.require = require;
window.YRequire = {
    define: define,
    require: require,
    loader: loader,
    getModule: function () {

        return module;
    }
};

})( window );