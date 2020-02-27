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
        name: 'tagging-set-groups',
        path: './src/js/content-scripts/tagging-set-groups.js',
        injection: {
            matches: ['https://*.shutterfly.com/roster'],
            js: ['tagging-set-groups.bundle.js']
        }
    }
];