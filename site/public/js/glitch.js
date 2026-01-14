document.addEventListener("DOMContentLoaded", () => {
        const chars = "%#$@^*&!?";

        function glitchEffect() {
            let iterations = 0;
            const el = document.querySelector(".glitch-text", ".pwntitle");
            const originalText = el.textContent;
            const interval = setInterval(() => {
                el.textContent = originalText
                    .split("")
                    .map((letter, index) => {
                        if (index < iterations) {
                            return originalText[index];
                        }
                        return chars[Math.floor(Math.random() * chars.length)];
                    })
                    .join("");

                iterations += 1 / 2;

                if (iterations >= originalText.length) {
                    clearInterval(interval);
                    el.textContent = originalText;
                }
            }, 50);
        }

        setInterval(glitchEffect, 3000);
    });