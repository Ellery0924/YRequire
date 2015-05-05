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