export function getSubdomain () {
    return window.location.host.split('.')[0];
}