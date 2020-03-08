module.exports = [
    {
        name: 'tagging',
        path: './src/js/content-scripts/tagging.js',
        injection: {
            matches: ['https://*.shutterfly.com/pictures/*'],
            js: ['tagging.bundle.js']
        }
    },
    {
        name: 'roster-page',
        path: './src/js/content-scripts/roster-page.js',
        injection: {
            matches: ['https://*.shutterfly.com/roster'],
            js: [
                'roster-page.bundle.js'
            ]
        }
    },
    {
        name: 'tags-page',
        path: './src/js/content-scripts/tags-page.js',
        injection: {
            matches: ['https://*.shutterfly.com/_/tags*'],
            js: [
                'tags-page.bundle.js'
            ]
        }
    }
];