// Conciliador PRO v10.4 — troca de tema leve e atômica
(() => {
    'use strict';

    let alternandoTema = false;

    window.toggleDarkMode = function () {
        if (alternandoTema) return;

        const html = document.documentElement;
        const destinoDark = !html.classList.contains('dark');
        alternandoTema = true;
        html.classList.add('theme-transition');

        requestAnimationFrame(() => {
            html.classList.toggle('dark', destinoDark);
            localStorage.setItem('theme', destinoDark ? 'dark' : 'light');

            requestAnimationFrame(() => {
                // Força o navegador a consolidar a nova paleta antes de liberar outro clique.
                void document.body.offsetHeight;
                setTimeout(() => {
                    html.classList.remove('theme-transition');
                    alternandoTema = false;
                }, 160);
            });
        });
    };
})();
