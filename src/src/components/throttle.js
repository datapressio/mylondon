
// Call func immediately, and then after wait milliseconds no matter how often 
// it is called. Always use the most recent data, and make sure the last call
// is made, even after the wait delay.
var throttle = function(wait, func) {
    var timeout;
    var first = true;
    var next = []
    return function() {
        var context = this, args = arguments;
        if (first) {
            first = false;
            func.apply(context, args);
            // console.log(context, args)
        } else {
            next = [func, context, args]
        }
        if (!timeout) {
            var later = function() {
                timeout = null;
                first = true;
                if (next.length) {
                    next[0].apply(next[1], next[2]);
                    // console.log(next[1], next[2])
                }
            };
            timeout = setTimeout(later, wait);
        }
    };
};

module.exports = throttle;
