/**
 * Created by Ellery1 on 15/4/30.
 */

require.config({
    baseUrl: 'js',
    map: {
        //非法的模块id
        //'http://mod2test': '/YRequire/test/js/vendor/mod2',
        'mod2':'/YRequire/test/js/vendor/mod2',
        'jquery': 'http://code.jquery.com/jquery-1.10.2.js',
    }
});

require(
    [
        'vendor/mod1',
        'vendor/mod3',
        'vendor/jquery-ui',
        'mod2'
    ], function (mod1, mod3,_,mod2) {

        console.log(mod1);
        console.log(mod2);
        console.log(mod3);
        console.log($().dialog)
    }
);
