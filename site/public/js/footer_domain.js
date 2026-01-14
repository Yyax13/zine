// Replace static domain in footer to current host
document.addEventListener('DOMContentLoaded', () => {
    try {
        let host = window.location.host || window.location.hostname;
        // If host is a plain IP address, fallback to configured fallback or default 'howosec'
        const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?$/;
        const fallback = (window.SITE_CONFIG && window.SITE_CONFIG.fallbackDomain) || 'howosec';
        if (ipRegex.test(host)) host = fallback;
        document.querySelectorAll('.site-copyright').forEach(el => {
            // replace pwnbuffer.org or any existing word after the dash
            el.textContent = el.textContent.replace(/-\s*[^\s]+\s*$/i, `- ${host}`);
        });
    } catch (e) {
        // noop
        console.error('footer_domain script error', e);
    }
});
