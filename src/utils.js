var inArray,
    indexOf = Array.prototype.indexOf;

if (!indexOf) {
    inArray = function (arr, value) {

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

    inArray = function (arr, value) {

        return indexOf.call(arr, value);
    }
}

var noop = function () {
};

var isFunction = function (func) {

    return Object.prototype.toString.call(func) === '[object Function]';
};

var isArray = function (arr) {

    return Object.prototype.toString.call(arr) === '[object Array]';
};

var isObject = function (obj) {

    return Object.prototype.toString.call(obj) === '[object Object]';
};

//shim console
if (!window.console) {

    window.console = {
        log: noop,
        warn: noop,
        error: noop
    }
}