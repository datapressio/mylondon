var max = 1; //2500;
var raw_data = {
    max: max,
    parallel_loads: 4,
    modifier_ratings: [
        [100],
        [66, 34],
        [45, 33, 22],
        [40, 30, 20, 10],
    ],
    throttle: 250,
    debug: false,
    colors: [
        // '#f7fcf5',
        '#e5f5e0',
        '#c7e9c0',
        '#a1d99b',
        '#74c476',
        '#41ab5d',
        '#238b45',
        '#006d2c',
        '#00441b',
    ],
    cards: {
       	1: {
            id: 1,
            text: 'Public Transport',
            name: 'transport',
            icon: 'http/logo-transport.png',
        },
        2: {
            id: 2,
            text: 'Number of Green Spaces',
            name: 'green_space',
            icon: 'http/logo-green-space.png',
        }, 
        3: {
            id: 3,
            text: 'Safety',
            name: 'safety',
            icon: 'http/logo-crime.png',
        }, 
        4: {
            id: 4,
            text: 'Schools',
            name: 'schools',
            icon: 'http/logo-schools.png',
        }
    },
}
module.exports = raw_data;
