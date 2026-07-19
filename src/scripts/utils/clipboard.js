export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        return copyWithFallback(text);
    }
}

function copyWithFallback(text) {
    const temp = document.createElement('textarea');
    temp.value = text;
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    document.body.appendChild(temp);
    temp.select();
    let succeeded = false;
    try {
        succeeded = document.execCommand('copy');
    } catch (error) {
        succeeded = false;
    }
    document.body.removeChild(temp);
    return succeeded;
}

export function flashFeedback(el, feedbackText, duration, property = 'textContent') {
    if (!el) return;
    const original = el[property];
    el[property] = feedbackText;
    setTimeout(() => {
        el[property] = original;
    }, duration);
}

export function flashClass(el, className, duration) {
    if (!el) return;
    el.classList.add(className);
    setTimeout(() => {
        el.classList.remove(className);
    }, duration);
}
