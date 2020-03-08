/**
 * Shutterfly is stupid and doesn't do JSON, and the extended the prototype for object, which is also stupid
 * but it's how they do it so now it's how we do it for this too
 *
 * @param s
 * @returns {*}
 */
export function shittyShutterflyParse(s) {
    let v;
    if (s) {
        try {
            eval("v=" + s)
        } catch (ex) {}
    }
    return v;
}