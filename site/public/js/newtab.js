document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;

    // Previne abrir nova aba
    event.preventDefault();

    // Redireciona na mesma aba
    window.location.href = link.href;
});
