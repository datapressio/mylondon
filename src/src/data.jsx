var max = 1; //2500;
var raw_data = {
    max: max,
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
    data: {
        'E01004376': {
            geometry: require('../oa_by_lsoa/E01004376.json'),
            rent: 450,
            crime: 0,
            transport: max,
            green_space: max,
            schools: 0,
        },
        'E01004375': {
            geometry: require('../oa_by_lsoa/E01004375.json'),
            rent: 350,
            crime:       0.2,
            transport:   max,
            green_space: 0.2,
            schools:     0.1,
        },
        'E01004374': {
            geometry: require('../oa_by_lsoa/E01004374.json'),
            rent: 250,
            crime:       0.1,
            transport:   0.1,
            green_space: max,
            schools:     0.2,
        },
        'E01004373': {
            geometry: require('../oa_by_lsoa/E01004373.json'),
            rent:    200,
            crime:       max,
            transport:   0,
            green_space: max,
            schools:     0.3,
        },
        'E01004372': {
            geometry: require('../oa_by_lsoa/E01004372.json'),
            rent: 200,
            crime:       0,
            transport:   0,
            green_space: 0,
            schools:     max,
        },
        'E01004371': {
            geometry: require('../oa_by_lsoa/E01004371.json'),
            rent: 150,
            crime:       0.2,
            transport:   0,
            green_space: 0,
            schools:     0,
        }
    },
    cards: {
       	1: {
            id: 1,
            text: 'Public Transport',
            icon: 'fa-subway',
        },
        2: {
            id: 2,
            text: 'Green Space',
            icon: 'fa-tree',
            // value: 'best 20%'
        }, 
        3: {
            id: 3,
            text: 'Crime/Safety',
            icon: 'fa-gavel',
            // value: 'average'
        }, 
        4: {
            id: 4,
            text: 'Schools',
            icon: 'fa-graduation-cap',
            // value: 'above average'
        }
    },
}
module.exports = raw_data;
