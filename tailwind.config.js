// tailwind.config.js
module.exports = {
    darkMode: "class",
    content: [
        "./views/**/*.ejs",
        "./views/**/*.css",
        "./src/**/*.ts",
        "./public/**/*.js",
        "./public/**/*.css",
        "./node_modules/preline/dist/*.js"
    ],

    theme: {
        extend: {
            screens: {
                mobile: "976px",
                "2xl": "1800px"
            },
            transitionDuration: {
                50: "50ms"
            },
            height: {
                inherit: "inherit"
            },
            width: {
                inherit: "inherit"
            },
            backgroundColor: {
                "personal-points": "#fde047",
                "personal-points-fill": "#eab308",
                "community-points": "#fdba74",
                "community-points-fill": "#f97316",
                "personal-points-dark": "#fef08a",
                "personal-points-fill-dark": "#eab308",
                "community-points-dark": "#fed7aa",
                "community-points-fill-dark": "#f97316"
            },
            typography: (theme) => ({
                DEFAULT: {
                    css: {
                        pre: {
                            "max-width": "36rem",
                            "margin-left": "auto",
                            "margin-right": "auto",
                            "border-radius": "0.75rem"
                        },
                        code: {
                            fontWeight: "400",
                            "border-radius": "0.25rem"
                        },
                        img: {
                            width: "100%",
                            display: "block",
                            "margin-left": "auto",
                            "margin-right": "auto",
                            "border-radius": "0.75rem",
                            "pointer-events": "none"
                        },
                        iframe: {
                            "max-width": "36rem",
                            "margin-left": "auto",
                            "margin-right": "auto",
                            "border-radius": "0.75rem"
                        },
                        "blockquote p::before": {
                            content: '""'
                        },
                        "blockquote p::after": {
                            content: '""'
                        }
                    }
                },
                custom: {
                    css: {
                        "--tw-prose-body": theme("colors.gray[800]"),
                        "--tw-prose-headings": theme("colors.gray[900]"),
                        "--tw-prose-lead": theme("colors.gray[700]"),
                        "--tw-prose-links": theme("colors.gray[700]"),
                        "--tw-prose-bold": theme("colors.gray[800]"),
                        "--tw-prose-counters": theme("colors.gray[600]"),
                        "--tw-prose-bullets": theme("colors.gray[600]"),
                        "--tw-prose-hr": theme("colors.gray[400]"),
                        "--tw-prose-quotes": theme("colors.gray[800]"),
                        "--tw-prose-quote-borders": theme("colors.gray[400]"),
                        "--tw-prose-captions": theme("colors.gray[700]"),
                        "--tw-prose-code": theme("colors.red[600]"),
                        "--tw-prose-pre-code": theme("colors.gray[300]"),
                        "--tw-prose-pre-bg": "rgb(0, 0, 0, 0.75)",
                        "--tw-prose-th-borders": theme("colors.zinc[600]"),
                        "--tw-prose-td-borders": theme("colors.zinc[400]"),

                        "--tw-prose-invert-body": theme("colors.gray[200]"),
                        "--tw-prose-invert-headings": theme("colors.gray[100]"),
                        "--tw-prose-invert-lead": theme("colors.gray[300]"),
                        "--tw-prose-invert-links": theme("colors.gray[300]"),
                        "--tw-prose-invert-bold": theme("colors.gray[200]"),
                        "--tw-prose-invert-counters": theme("colors.gray[400]"),
                        "--tw-prose-invert-bullets": theme("colors.gray[400]"),
                        "--tw-prose-invert-hr": theme("colors.gray[500]"),
                        "--tw-prose-invert-quotes": theme("colors.gray[200]"),
                        "--tw-prose-invert-quote-borders": theme("colors.gray[400]"),
                        "--tw-prose-invert-captions": theme("colors.gray[300]"),
                        "--tw-prose-invert-code": theme("colors.red[400]"),
                        "--tw-prose-invert-pre-code": theme("colors.gray[300]"),
                        "--tw-prose-invert-pre-bg": "rgb(60, 60, 60, 0.75)",
                        "--tw-prose-invert-th-borders": theme("colors.zinc[400]"),
                        "--tw-prose-invert-td-borders": theme("colors.zinc[600]")
                    }
                }
            })
        }
    },
    plugins: [
        require("@tailwindcss/typography"),
        require("preline/plugin"),
        ({ addBase }) => {
            addBase({
                html: {
                    "font-family":
                        "Inter var,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji"
                }
            });
        }
    ]
};
