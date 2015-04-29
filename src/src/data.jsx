var max = 1; //2500;
var raw_data = {
    max: max,
    parallel_loads: 4,
    modifier_ratings: [1.5, 1, 0.75, 0.5],
    throttle: 250,
    debug: true,
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
            icon: '/http/logo-transport.png',
        },
        2: {
            id: 2,
            text: 'Number of Green Spaces',
            name: 'green_space',
            icon: '/http/logo-green-space.png',
        }, 
        3: {
            id: 3,
            text: 'Crime/Safety',
            name: 'crime',
            icon: '/http/logo-crime.png',
        }, 
        4: {
            id: 4,
            text: 'Schools',
            name: 'schools',
            icon: '/http/logo-schools.png',
        }
    },
}
module.exports = raw_data;
