export function getSubdomain (url) {
    let hostName;

    if (url) {
        let a = document.createElement('a');
        a.href = url;
        hostName = a.hostname;
    } else {
        hostName = window.location.host;
    }

    return hostName.split('.')[0];
}