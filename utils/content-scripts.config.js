module.exports = [
    {
        name: 'tagging',
        path: './src/js/content-scripts/tagging.js',
        injection: {
            matches: ['https://*.shutterfly.com/pictures/*'],
            js: ['tagging.bundle.js']
        }
    }
];