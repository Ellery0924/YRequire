/**
 * Created by Ellery1 on 15/4/27.
 */

define('mod2Id',['jquery', 'vendor/mod1'], function ($, mod1) {
    return {
        mod1: mod1,
        name: 'mod2',
        jquery:$
    };
});