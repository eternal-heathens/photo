export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                ink: "#111111",
                paper: "#FDFAE7",
                line: "rgba(30, 43, 250, 0.18)",
                cobalt: "#1E2BFA",
                teal: "#0F766E",
                coral: "#DC2626",
                moss: "#7C6F28",
                forest: "#FDFAE7",
                "forest-alt": "#EEF1FF",
                cream: "#FFFFFF",
                "cream-alt": "#F4F0D8",
                "dark-ink": "#111111",
                "wood-glow": "#1E2BFA",
            },
            boxShadow: {
                soft: "0 22px 60px rgba(30, 43, 250, 0.08)",
            },
            fontFamily: {
                display: [
                    "Space Grotesk",
                    "Noto Sans SC",
                    "ui-sans-serif",
                    "system-ui",
                    "sans-serif",
                ],
                mono: ["Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
                sans: [
                    "Inter",
                    "Noto Sans SC",
                    "ui-sans-serif",
                    "system-ui",
                    "-apple-system",
                    "BlinkMacSystemFont",
                    "Segoe UI",
                    "sans-serif",
                ],
            },
        },
    },
    plugins: [],
};
