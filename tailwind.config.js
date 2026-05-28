export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                ink: "#17202A",
                paper: "#F7F6F2",
                line: "#DAD6CC",
                cobalt: "#2F5D8C",
                teal: "#2B7A78",
                coral: "#D96C5F",
                moss: "#587052",
            },
            boxShadow: {
                soft: "0 18px 55px rgba(23, 32, 42, 0.10)",
            },
            fontFamily: {
                sans: [
                    "Inter",
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
