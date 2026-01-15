(function () {
    const CSS_HREF = '/css/css-others/auth-popover.css';
    if (!document.querySelector(`link[data-auth-popover-css="true"]`)) {
        const link = document.createElement('link');
        link.setAttribute('rel', 'stylesheet');
        link.setAttribute('href', CSS_HREF);
        link.setAttribute('data-auth-popover-css', 'true');
        document.head.appendChild(link);
    }

    function el(tag, props = {}, ...children) {
        const node = document.createElement(tag);
        Object.entries(props).forEach(([k, v]) => {
            if (k === 'class') node.className = v;
            else if (k === 'text') node.textContent = v;
            else node.setAttribute(k, v);
        });
        children.forEach(c => {
            if (typeof c === 'string') node.appendChild(document.createTextNode(c));
            else if (c) node.appendChild(c);
        });
        return node;
    }

    let currentUser = null;
    let popover = null; // the inner modal container
    let overlayEl = null; // the overlay that centers the modal
    let activeTab = 'login';

    async function api(path, opts = {}) {
        opts.credentials = 'same-origin';
        opts.headers = opts.headers || {};
        if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(opts.body);
        }
        const r = await fetch(path, opts);
        let body = null;
        try {
            body = await r.clone().json();
        } catch (e) {
            body = await r.text().catch(() => null);
        }
        return { ok: r.ok, status: r.status, body };
    }

    function getRoot() {
        let root = document.getElementById('authWidget');
        if (!root) {
            root = el('div', { id: 'authWidget' });
            document.body.appendChild(root);
        }
        root.classList.add('auth-widget');
        return root;
    }

    function renderBar() {
        const headerTrigger = document.querySelector('.glitch-text');
        if (!headerTrigger) return;

        // Atualiza o texto principal (em vez de meta)
        if (currentUser && currentUser.userName) {
            headerTrigger.textContent = `${currentUser.userName}@pwn`;
        } else {
            headerTrigger.textContent = `guest@pwn`;
        }

        ensurePopover(getRoot());
        // Show worm creation checkbox if current user is worm
        const wormField = document.getElementById('aw-worm-field');
        if (wormField) {
            wormField.style.display = currentUser && currentUser.worm ? 'block' : 'none';
        }
    }

    async function attachTrigger() {
        const headerTrigger = document.querySelector('.glitch-text');
        const root = getRoot();
        root.innerHTML = '';
        if (headerTrigger) {
            headerTrigger.classList.add('auth-trigger');
            headerTrigger.addEventListener('click', ev => {
                ev.preventDefault();
                togglePopover();
            });
            ensurePopover(root);
        } else {
            const btn = el('button', { class: 'btn', text: 'Account' });
            btn.addEventListener('click', () => togglePopover());
            root.appendChild(btn);
            ensurePopover(root);
        }
    }

    function ensurePopover(root) {
        if (!overlayEl) {
            overlayEl = el('div', { class: 'aw-modal-overlay', style: 'display:none' });
            popover = el('div', { class: 'aw-modal' });
            overlayEl.appendChild(popover);
            document.body.appendChild(overlayEl);
            buildLoginPopover();
            // close modal when clicking overlay outside modal
            overlayEl.addEventListener('click', (ev) => {
                if (ev.target === overlayEl) hidePopover();
            });
        }
    }

    function buildLoginPopover() {
        popover.innerHTML = '';

        const closeIcon = el('div', { class: 'aw-close-x', style: 'position:absolute; right:10px; top:8px; cursor:pointer; font-size:18px;' }, '×');
        closeIcon.addEventListener('click', hidePopover);
        popover.appendChild(closeIcon);

        const tabs = el('div', { class: 'tabs' });
        const tLogin = el('div', { class: 'aw-tab active', id: 'tab-login', text: 'Login' });
        const tRegister = el('div', { class: 'aw-tab', id: 'tab-register', text: 'Register' });
        tabs.appendChild(tLogin);
        tabs.appendChild(tRegister);

        const err = el('div', { class: 'aw-error', id: 'aw-error' });
    const title = el('div', { class: 'aw-pop-title', id: 'aw-pop-title', text: 'guest@pwn' });
        const fUser = el('div', { class: 'aw-field' },
            el('label', { text: 'User name' }),
            el('input', { type: 'text', id: 'aw-user' })
        );

        const fPass = el('div', { class: 'aw-field' },
            el('label', { text: 'Password' }),
            el('input', { type: 'password', id: 'aw-pass' })
        );

                // ...existing code...
        // Optional worm checkbox (only shown if current user is a worm/has rights)
        const fWorm = el('div', { class: 'aw-field', id: 'aw-worm-field', style: 'display:none' },
            el('label', { text: 'Create as worm' }),
            el('input', { type: 'checkbox', id: 'aw-worm' })
        );

        const actions = el('div', { class: 'aw-actions' });
        const submit = el('button', { class: 'aw-btn', id: 'aw-submit', text: 'Sign in' });
    const closeBtn = el('button', { class: 'aw-btn secondary', id: 'aw-close', text: 'Close' });
    closeBtn.addEventListener('click', hidePopover);
        actions.appendChild(closeBtn);
        actions.appendChild(submit);

    popover.appendChild(title);
    popover.appendChild(tabs);
        popover.appendChild(err);
        popover.appendChild(fUser);
        popover.appendChild(fPass);
    popover.appendChild(fWorm);
        popover.appendChild(actions);

        tLogin.addEventListener('click', () => setActiveTab('login'));
        tRegister.addEventListener('click', () => setActiveTab('register'));

        submit.addEventListener('click', async () => {
            const userName = document.getElementById('aw-user').value.trim();
            const password = document.getElementById('aw-pass').value;
            const errorEl = document.getElementById('aw-error');
            errorEl.textContent = '';
            if (!userName || !password) {
                errorEl.textContent = 'user & password required';
                return;
            }
            try {
                let r;
                if (activeTab === 'login') {
                    r = await api('/api/login', { method: 'POST', body: { userName, password } });
                } else {
                    const wantWorm = document.getElementById('aw-worm')?.checked;
                    r = await api('/api/register', { method: 'POST', body: { userName, password, worm: wantWorm } });
                }
                if (!r.ok) {
                    errorEl.textContent = r.body && (r.body.error || JSON.stringify(r.body)) || 'failed';
                    return;
                }
                await refreshUser();
                hidePopover();
            } catch (e) {
                errorEl.textContent = e.message;
            }
        });
    }

    function buildUserPopover() {
        popover.innerHTML = '';

        const closeIcon = el('div', { class: 'aw-close-x', style: 'position:absolute; right:10px; top:8px; cursor:pointer; font-size:18px;' }, '×');
        closeIcon.addEventListener('click', hidePopover);
        popover.appendChild(closeIcon);

        // === Info principal ===
        const info = el('div', {
            class: 'aw-info',
            text: `worm: ${!!currentUser.worm}`
        });
        popover.appendChild(info);

        // === Upload (logo abaixo do worm info) ===
        if (currentUser.worm) {
            const uploadFileBtn = el('button', { class: 'aw-btn', text: 'Upload file' });
            const uploadPaperBtn = el('button', { class: 'aw-btn', text: 'Upload paper' });
            const createTrickBtn = el('button', { class: 'aw-btn', text: 'Create trick' });
            const createReflectionBtn = el('button', { class: 'aw-btn', text: 'Create reflection' });
            const createWormBtn = el('button', { class: 'aw-btn', text: 'Create worm' });

            // Redirect to upload routes instead of opening modal
            uploadFileBtn.addEventListener('click', () => { window.location.href = '/u/file'; });
            uploadPaperBtn.addEventListener('click', () => { window.location.href = '/u/papers'; });
            createTrickBtn.addEventListener('click', () => { window.location.href = '/u/tricks'; });
            createReflectionBtn.addEventListener('click', () => { window.location.href = '/u/reflections'; });
            // Open inline form to create another worm
            createWormBtn.addEventListener('click', () => openCreateWormForm());

            popover.appendChild(uploadFileBtn);
            popover.appendChild(uploadPaperBtn);
            popover.appendChild(createTrickBtn);
            popover.appendChild(createReflectionBtn);
            popover.appendChild(createWormBtn);
        }

        // === Botões de ação (logout etc) ===
        const actions = el('div', { class: 'aw-actions' });

        const logoutBtn = el('button', { class: 'aw-btn secondary', text: 'Logout' });
        logoutBtn.addEventListener('click', async () => {
            await api('/api/logout', { method: 'POST' });
            currentUser = null;
            renderBar();
            buildLoginPopover();
        });

        actions.appendChild(logoutBtn);
        popover.appendChild(actions);
    }

    function openUploadForm(type) {
        popover.innerHTML = '';
        const title = el('h3', { text: type === 'file' ? 'Upload file' : 'Upload paper' });
        const err = el('div', { class: 'aw-error', id: 'aw-upload-error' });

        if (type === 'file') {
            const fTitle = el('div', { class: 'aw-field' }, el('label', { text: 'Title' }), el('input', { type: 'text', id: 'up-title' }));
            const fFile = el('div', { class: 'aw-field' }, el('label', { text: 'File' }), el('input', { type: 'file', id: 'up-file' }));
            const actions = el('div', { class: 'aw-actions' });
            const submit = el('button', { class: 'aw-btn', text: 'Send' });
            const closeBtn = el('button', { class: 'aw-btn secondary', text: 'Close' });
            closeBtn.addEventListener('click', () => buildUserPopover());
            actions.appendChild(closeBtn);
            actions.appendChild(submit);
            popover.appendChild(title);
            popover.appendChild(err);
            popover.appendChild(fTitle);
            popover.appendChild(fFile);
            popover.appendChild(actions);

            submit.addEventListener('click', async () => {
                const errorEl = document.getElementById('aw-upload-error');
                errorEl.textContent = '';
                const t = document.getElementById('up-title').value.trim();
                const fi = document.getElementById('up-file');
                if (!t || !fi.files.length) { errorEl.textContent = 'title and file required'; return; }
                const fd = new FormData();
                fd.append('title', t);
                fd.append('newFile', fi.files[0]);
                try {
                    const r = await fetch('/api/files', { method: 'POST', body: fd, credentials: 'same-origin' });
                    const j = await r.json().catch(() => ({}));
                    if (!r.ok) { errorEl.textContent = j.error || JSON.stringify(j); return; }
                    errorEl.style.color = 'lightgreen';
                    errorEl.textContent = 'Upload successful';
                    setTimeout(() => { hidePopover(); }, 900);
                } catch (e) { errorEl.textContent = e.message; }
            });
        } else {
            // paper upload
            const fTitle = el('div', { class: 'aw-field' }, el('label', { text: 'Title' }), el('input', { type: 'text', id: 'up-title' }));
            const fShort = el('div', { class: 'aw-field' }, el('label', { text: 'Short description' }), el('textarea', { id: 'up-short' }));
            const fFile = el('div', { class: 'aw-field' }, el('label', { text: 'Markdown file' }), el('input', { type: 'file', id: 'up-file' }));
            const actions = el('div', { class: 'aw-actions' });
            const submit = el('button', { class: 'aw-btn', text: 'Send' });
            const closeBtn = el('button', { class: 'aw-btn secondary', text: 'Close' });
            closeBtn.addEventListener('click', () => buildUserPopover());
            actions.appendChild(closeBtn);
            actions.appendChild(submit);
            popover.appendChild(title);
            popover.appendChild(err);
            popover.appendChild(fTitle);
            popover.appendChild(fShort);
            popover.appendChild(fFile);
            popover.appendChild(actions);

            submit.addEventListener('click', async () => {
                const errorEl = document.getElementById('aw-upload-error');
                errorEl.textContent = '';
                const t = document.getElementById('up-title').value.trim();
                const s = document.getElementById('up-short').value.trim();
                const fi = document.getElementById('up-file');
                if (!t || !fi.files.length) { errorEl.textContent = 'title and file required'; return; }
                const fd = new FormData();
                fd.append('title', t);
                fd.append('short_description', s);
                fd.append('file', fi.files[0]);
                try {
                    const r = await fetch('/api/articles', { method: 'POST', body: fd, credentials: 'same-origin' });
                    const j = await r.json().catch(() => ({}));
                    if (!r.ok) { errorEl.textContent = j.error || JSON.stringify(j); return; }
                    errorEl.style.color = 'lightgreen';
                    errorEl.textContent = 'Upload successful';
                    setTimeout(() => { hidePopover(); }, 900);
                } catch (e) { errorEl.textContent = e.message; }
            });
        }
    }

    // Inline form for creating a worm account (only accessible to worms)
    function openCreateWormForm() {
        popover.innerHTML = '';
        const title = el('h3', { text: 'Create worm account' });
        const err = el('div', { class: 'aw-error', id: 'aw-worm-error' });

        const fUser = el('div', { class: 'aw-field' }, el('label', { text: 'User name' }), el('input', { type: 'text', id: 'cw-user' }));
        const fPass = el('div', { class: 'aw-field' }, el('label', { text: 'Password' }), el('input', { type: 'password', id: 'cw-pass' }));

        const actions = el('div', { class: 'aw-actions' });
        const submit = el('button', { class: 'aw-btn', text: 'Create' });
        const backBtn = el('button', { class: 'aw-btn secondary', text: 'Back' });
        backBtn.addEventListener('click', () => buildUserPopover());
        actions.appendChild(backBtn);
        actions.appendChild(submit);

        popover.appendChild(title);
        popover.appendChild(err);
        popover.appendChild(fUser);
        popover.appendChild(fPass);
        popover.appendChild(actions);

        submit.addEventListener('click', async () => {
            const errorEl = document.getElementById('aw-worm-error');
            errorEl.textContent = '';
            const userName = document.getElementById('cw-user').value.trim();
            const password = document.getElementById('cw-pass').value;
            if (!userName || !password) { errorEl.textContent = 'userName and password required'; return; }
            try {
                const r = await fetch('/api/worms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ userName, password }) });
                const j = await r.json().catch(() => ({}));
                if (!r.ok) { errorEl.textContent = j.error || JSON.stringify(j); return; }
                errorEl.style.color = 'lightgreen';
                errorEl.textContent = 'Worm created successfully';
                setTimeout(() => buildUserPopover(), 900);
            } catch (e) {
                errorEl.textContent = e.message;
            }
        });
    }

    function setActiveTab(tab) {
        activeTab = tab;
        if (!popover) return;
        const tLogin = popover.querySelector('#tab-login');
        const tRegister = popover.querySelector('#tab-register');
        const submit = popover.querySelector('#aw-submit');
        const errorEl = popover.querySelector('#aw-error');
        errorEl.textContent = '';
        if (tab === 'login') {
            tLogin.classList.add('active');
            tRegister.classList.remove('active');
            submit.textContent = 'Sign in';
        } else {
            tLogin.classList.remove('active');
            tRegister.classList.add('active');
            submit.textContent = 'Create';
        }
    }

    function togglePopover() {
        ensurePopover(getRoot());
        if (overlayEl.style.display === 'none' || !overlayEl.style.display) {
            if (currentUser) buildUserPopover();
            else buildLoginPopover();
            overlayEl.style.display = 'flex';
            // lock scroll
            document.body.style.overflow = 'hidden';
        } else {
            hidePopover();
        }
    }

    function hidePopover() {
        if (overlayEl) {
            overlayEl.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    async function refreshUser() {
        try {
            const r = await api('/api/me');
            if (r.ok && r.body && r.body.user) {
                currentUser = r.body.user;
            } else currentUser = null;
        } catch (e) {
            currentUser = null;
        }
        renderBar();
    }

    document.addEventListener('DOMContentLoaded', () => {
        renderBar();
        refreshUser().then(() => attachTrigger());
        window.authWidget = {
            refresh: refreshUser,
            open: () => togglePopover()
        };
    });
})();
