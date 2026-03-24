/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    darkMode: "class",
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#8b5cf6', // purple-500
                    foreground: '#ffffff',
                },
                secondary: {
                    DEFAULT: '#f59e0b', // amber-500
                    foreground: '#ffffff',
                },
            }
        },
    },
    plugins: [],
}
