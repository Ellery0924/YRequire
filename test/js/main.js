/**
 * Created by Ellery1 on 15/4/30.
 */

require.config({
    baseUrl: 'js',
    map: {
        'mod2': '/YRequire/test/js/vendor/mod2',
        'jquery': 'http://code.jquery.com/jquery-1.10.2.js',
        'mod3':'vendor/mod3'
    }
});

require(
    [
        'vendor/mod1',
        'mod3',
        'vendor/jquery-ui',
        'mod2'
    ], function (mod1, mod3,_,mod2) {

        console.log(mod1);
        console.log(mod2);
        console.log(mod3);
        console.log($().dialog)
    }
);
