/**
 * Created by Ellery1 on 15/4/30.
 */

require.config({
    baseUrl: 'js/',
    map: {
        'mod2': 'vendor/mod2',
        'jquery': 'http://code.jquery.com/jquery-1.10.2.js'
    }
});

require(
    [
        'vendor/mod1',
        '/YRequire/mod3',
        'vendor/jquery-ui',
        'mod2'
    ], function (mod1, mod3,_,__,mod2) {

        console.log('mod1:'+mod1);
        console.log('mod2:'+mod2);
        console.log('mod3:'+mod3);
        console.log($().dialog)
    }
);
