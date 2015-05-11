/**
 * Created by Ellery1 on 15/4/30.
 * AMD模块加载器，使用方式几乎和RequireJS完全相同
 * 仅实现了RequireJS的基础特性，不支持shims,懒加载等高级特性
 * 实现原理：通过define函数的第二个参数数组读取模块的依赖并递归生成依赖树，在所有依赖被加载后解析所有模块，之后执行callback
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

//正则表达式
//检查字符串末尾的/
var rlastSlash = /\/$/,
//以.js结尾
    rJs = /\.js$/,
//以.html或者/htm结尾
    rhtml = /[^\/]+\.htm[l]?/,
//以http://,./,../或者/开头
    rabsoluteUrl = /^\s*(?:http[s]?:\/\/|\/|\.\/|\.\.\/)/,
//不以http://,./,../开头并且只包含\w,-,_
    rvalidMapId = /^\s*(?!\.\/|\.\.\/|http[s]?:\/\/)[\w_\-\.]+]/;

//设置option
var config = function (opt) {

    for (var key in opt) {

        if (opt.hasOwnProperty(key) && option.hasOwnProperty(key)) {

            if (key === 'map') {

                for (var id in opt.map) {

                    if (opt.map.hasOwnProperty(id)) {

                        if (!rvalidMapId.test(id)) {

                            throw new Error('不合法的模块id: ' + id + '，请检查require.config设置的map属性。');
                        }
                    }
                }
            }

            option[key] = opt[key];
        }
    }
};

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
//没有考虑ie的兼容性，这种方式只适用于chrome和ff
//以后慢慢改
var _getCurrentSrc = function () {

    return document.currentScript.src;
};

var _getAbsolutePath = function (url) {

    return url.replace(window.location.origin, '').replace(rJs, '');
};

//获取相对的路径
var _getRelativePath = function (url) {

    var host = window.location.origin,
        pageRoot = window.location.pathname.replace(rhtml, '');

    return url
        .replace(host, '')
        .replace(pageRoot, '')
        .replace(rJs, '');
};

//获取相对于baseUrl的路径
var _getRelToBasePath = function (path) {

    return path.replace(_getBaseUrl(option.baseUrl), '');
};

//根据脚本src属性创建一个模块id
//将会统一替换掉服务器根路径，以及引用了主文件的页面的上层路径，还有.js后缀
//如果用户在option.map中指定了模块的别名，则使用别名替换默认路径
var _createId = function (url) {

    var id,
        map = option.map;

    id = _getRelToBasePath(_getRelativePath(url));

    for (var key in map) {

        if (map.hasOwnProperty(key) && (map[key] === id || map[key] === _getAbsolutePath(url) || map[key] === url)) {

            return key;
        }
    }

    return id;
};

//根据key从module对象中读取一个模块，key可以是map中用户自定义的别名，也可以是默认的id，也可以是通过define的第一个参数定义的id
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
    //判断循环引用的变量
        realSrcWithoutOrigin = _getRelativePath(realSrc),
    //为模块分配一个id
        modId = _createId(realSrc);

    //防止自己引用自己
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

        //判断循环引用
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

    define.apply(window, [null, deps, callback]);
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