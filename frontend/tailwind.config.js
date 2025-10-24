import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  darkMode: "class",
  plugins: [
    heroui({
      layout: {
        dividerWeight: "1px", 
        disabledOpacity: 0.45, 
        fontSize: {
          tiny: "0.75rem",   // 12px
          small: "0.875rem", // 14px
          medium: "0.9375rem", // 15px
          large: "1.125rem", // 18px
        },
        lineHeight: {
          tiny: "1rem", 
          small: "1.25rem", 
          medium: "1.5rem", 
          large: "1.75rem", 
        },
        radius: {
          small: "6px", 
          medium: "8px", 
          large: "12px", 
        },
        borderWidth: {
          small: "1px", 
          medium: "1px", 
          large: "2px", 
        },
      },
      themes: {
        light: {
          colors: {
            // Colores institucionales oficiales de Duoc UC
            background: {
              DEFAULT: "#FFFFFF"
            },
            content1: {
              DEFAULT: "#FFFFFF",
              foreground: "#1A1A1A"
            },
            content2: {
              DEFAULT: "#f4f4f5",
              foreground: "#1A1A1A"
            },
            content3: {
              DEFAULT: "#EEEEEE",
              foreground: "#1A1A1A"
            },
            content4: {
              DEFAULT: "#666666",
              foreground: "#FFFFFF"
            },
            divider: {
              DEFAULT: "rgba(26, 26, 26, 0.15)"
            },
            focus: {
              DEFAULT: "#FFB800"
            },
            foreground: {
              50: "#fafafa",
              100: "#f4f4f5",
              200: "#e4e4e7",
              300: "#d4d4d8",
              400: "#a1a1aa",
              500: "#71717a",
              600: "#52525b",
              700: "#3f3f46",
              800: "#27272a",
              900: "#18181b",
              DEFAULT: "#1A1A1A"
            },
            overlay: {
              DEFAULT: "#000000"
            },
            danger: {
              50: "#fee7ef",
              100: "#fdd0df",
              200: "#faa0bf",
              300: "#f871a0",
              400: "#f54180",
              500: "#f31260",
              600: "#c20e4d",
              700: "#920b3a",
              800: "#610726",
              900: "#310413",
              DEFAULT: "#f31260",
              foreground: "#ffffff"
            },
            default: {
              50: "#fafafa",
              100: "#f4f4f5",
              200: "#e4e4e7",
              300: "#d4d4d8",
              400: "#a1a1aa",
              500: "#71717a",
              600: "#52525b",
              700: "#3f3f46",
              800: "#27272a",
              900: "#18181b",
              DEFAULT: "#d4d4d8",
              foreground: "#000"
            },
            primary: {
              // Color principal de Duoc UC - Amarillo oficial
              50: "#fffbeb",
              100: "#fff3c4",
              200: "#ffe682",
              300: "#ffd84a",
              400: "#ffca1f",
              500: "#FFB800", // Amarillo Duoc oficial
              600: "#e09500",
              700: "#b86c02",
              800: "#945308",
              900: "#7a440b",
              DEFAULT: "#FFB800",
              foreground: "#1A1A1A"
            },
            secondary: {
              // Negro Duoc como secundario
              50: "#f7f7f7",
              100: "#e3e3e3",
              200: "#c8c8c8",
              300: "#a4a4a4",
              400: "#818181",
              500: "#666666", // Gris Duoc
              600: "#515151",
              700: "#434343",
              800: "#383838",
              900: "#1A1A1A", // Negro Duoc
              DEFAULT: "#1A1A1A",
              foreground: "#fff"
            },
            success: {
              50: "#e8faf0",
              100: "#d1f4e0",
              200: "#a2e9c1",
              300: "#74dfa2",
              400: "#45d483",
              500: "#17c964",
              600: "#12a150",
              700: "#0e793c",
              800: "#095028",
              900: "#052814",
              DEFAULT: "#17c964",
              foreground: "#000"
            },
            warning: {
              50: "#fefce8",
              100: "#fdedd3",
              200: "#fbdba7",
              300: "#f9c97c",
              400: "#f7b750",
              500: "#f5a524",
              600: "#c4841d",
              700: "#936316",
              800: "#62420e",
              900: "#312107",
              DEFAULT: "#f5a524",
              foreground: "#000"
            },
            // Colores específicos por escuela
            administracion: {
              DEFAULT: "#D50032",
              secondary: "#DF4661",
              foreground: "#ffffff"
            },
            comunicaciones: {
              DEFAULT: "#E87722",
              secondary: "#ECA154",
              foreground: "#ffffff"
            },
            construccion: {
              DEFAULT: "#C4D600",
              secondary: "#DBE442",
              foreground: "#1A1A1A"
            },
            diseno: {
              DEFAULT: "#FF585D",
              secondary: "#FF808B",
              foreground: "#ffffff"
            },
            gastronomia: {
              DEFAULT: "#307FE2",
              secondary: "#8BB8E8",
              foreground: "#ffffff"
            },
            informatica: {
              DEFAULT: "#43B02A",
              secondary: "#A1D884",
              foreground: "#ffffff"
            },
            ingenieria: {
              DEFAULT: "#5BC2E7",
              secondary: "#99D6EA",
              foreground: "#1A1A1A"
            },
            salud: {
              DEFAULT: "#00A499",
              secondary: "#2AD2C9",
              foreground: "#ffffff"
            },
            turismo: {
              DEFAULT: "#AC4FC6",
              secondary: "#C98BDB",
              foreground: "#ffffff"
            }
          }
        },
        dark: {
          colors: {
            background: {
              DEFAULT: "#1A1A1A" // Negro Duoc como fondo oscuro
            },
            content1: {
              DEFAULT: "#2D2D2D",
              foreground: "#FFFFFF"
            },
            content2: {
              DEFAULT: "#3F3F3F",
              foreground: "#FFFFFF"
            },
            content3: {
              DEFAULT: "#525252",
              foreground: "#FFFFFF"
            },
            content4: {
              DEFAULT: "#666666",
              foreground: "#FFFFFF"
            },
            divider: {
              DEFAULT: "rgba(255, 255, 255, 0.15)"
            },
            focus: {
              DEFAULT: "#FFB800"
            },
            foreground: {
              50: "#18181b",
              100: "#27272a",
              200: "#3f3f46",
              300: "#52525b",
              400: "#71717a",
              500: "#a1a1aa",
              600: "#d4d4d8",
              700: "#e4e4e7",
              800: "#f4f4f5",
              900: "#fafafa",
              DEFAULT: "#FFFFFF"
            },
            overlay: {
              DEFAULT: "#000000"
            },
            danger: {
              50: "#310413",
              100: "#610726",
              200: "#920b3a",
              300: "#c20e4d",
              400: "#f31260",
              500: "#f54180",
              600: "#f871a0",
              700: "#faa0bf",
              800: "#fdd0df",
              900: "#fee7ef",
              DEFAULT: "#f31260",
              foreground: "#ffffff"
            },
            default: {
              50: "#18181b",
              100: "#27272a",
              200: "#3f3f46",
              300: "#52525b",
              400: "#71717a",
              500: "#a1a1aa",
              600: "#d4d4d8",
              700: "#e4e4e7",
              800: "#f4f4f5",
              900: "#fafafa",
              DEFAULT: "#3f3f46",
              foreground: "#fff"
            },
            primary: {
              // Amarillo Duoc adaptado para modo oscuro
              50: "#7a440b",
              100: "#945308",
              200: "#b86c02",
              300: "#e09500",
              400: "#FFB800",
              500: "#ffca1f",
              600: "#ffd84a",
              700: "#ffe682",
              800: "#fff3c4",
              900: "#fffbeb",
              DEFAULT: "#FFB800",
              foreground: "#1A1A1A"
            },
            secondary: {
              50: "#1A1A1A",
              100: "#383838",
              200: "#434343",
              300: "#515151",
              400: "#666666",
              500: "#818181",
              600: "#a4a4a4",
              700: "#c8c8c8",
              800: "#e3e3e3",
              900: "#f7f7f7",
              DEFAULT: "#666666",
              foreground: "#fff"
            },
            success: {
              50: "#052814",
              100: "#095028",
              200: "#0e793c",
              300: "#12a150",
              400: "#17c964",
              500: "#45d483",
              600: "#74dfa2",
              700: "#a2e9c1",
              800: "#d1f4e0",
              900: "#e8faf0",
              DEFAULT: "#17c964",
              foreground: "#000"
            },
            warning: {
              50: "#312107",
              100: "#62420e",
              200: "#936316",
              300: "#c4841d",
              400: "#f5a524",
              500: "#f7b750",
              600: "#f9c97c",
              700: "#fbdba7",
              800: "#fdedd3",
              900: "#fefce8",
              DEFAULT: "#f5a524",
              foreground: "#000"
            },
            // Colores por escuela adaptados para modo oscuro
            administracion: {
              DEFAULT: "#DF4661",
              secondary: "#D50032",
              foreground: "#ffffff"
            },
            comunicaciones: {
              DEFAULT: "#ECA154",
              secondary: "#E87722",
              foreground: "#000000"
            },
            construccion: {
              DEFAULT: "#DBE442",
              secondary: "#C4D600",
              foreground: "#000000"
            },
            diseno: {
              DEFAULT: "#FF808B",
              secondary: "#FF585D",
              foreground: "#000000"
            },
            gastronomia: {
              DEFAULT: "#8BB8E8",
              secondary: "#307FE2",
              foreground: "#000000"
            },
            informatica: {
              DEFAULT: "#A1D884",
              secondary: "#43B02A",
              foreground: "#000000"
            },
            ingenieria: {
              DEFAULT: "#99D6EA",
              secondary: "#5BC2E7",
              foreground: "#000000"
            },
            salud: {
              DEFAULT: "#2AD2C9",
              secondary: "#00A499",
              foreground: "#000000"
            },
            turismo: {
              DEFAULT: "#C98BDB",
              secondary: "#AC4FC6",
              foreground: "#000000"
            }
          }
        }
      }
    })
  ]
}