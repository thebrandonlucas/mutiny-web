import solid from "solid-start/vite";
import { defineConfig } from "vite";
import { VitePWA, VitePWAOptions } from "vite-plugin-pwa";
import wasm from "vite-plugin-wasm";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";

import * as path from "path";
import * as child from "child_process";

const commitHash = child.execSync("git rev-parse --short HEAD").toString().trim();

const pwaOptions: Partial<VitePWAOptions> = {
    base: "/",
    registerType: "autoUpdate",
    devOptions: {
        enabled: false
    },
    includeAssets: ["favicon.ico", "robots.txt"],
    manifest: {
        name: "Mutiny Wallet",
        short_name: "Mutiny",
        description: "A lightning wallet",
        theme_color: "#000",
        categories: ["finance", "social"],
        icons: [
            {
                src: "192.png",
                sizes: "192x192",
                type: "image/png"
            },
            {
                src: "512.png",
                sizes: "512x512",
                type: "image/png"
            },
            {
                src: "maskable_icon.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any maskable"
            }
        ],
        shortcuts: [
            {
                name: "Send",
                short_name: "Send",
                url: "/send",
                icons: [
                    {
                        src: "/images/send.png",
                        sizes: "192x192",
                        type: "image/png"
                    },
                ]
            },
            {
                name: "Receive",
                short_name: "Receive",
                url: "/receive",
                icons: [
                    {
                        src: "/images/receive.png",
                        sizes: "192x192",
                        type: "image/png"
                    },
                ]
            },
            {
                name: "Activity",
                short_name: "Activity",
                url: "/activity",
                icons: [
                    {
                        src: "/images/activity.png",
                        sizes: "192x192",
                        type: "image/png"
                    },
                ]
            }
        ]
    }
};

export default defineConfig({
    server: {
        port: 3420,
        fs: {
            // Allow serving files from one level up (so that if mutiny-node is a sibling folder we can use it locally)
            allow: [".."]
        }
    },
    plugins: [wasm(), solid({ ssr: false }), VitePWA(pwaOptions)],
    define: {
        "import.meta.env.__COMMIT_HASH__": JSON.stringify(commitHash),
        "import.meta.env.__RELEASE_VERSION__": JSON.stringify(process.env.npm_package_version)
    },
    resolve: {
        alias: [{ find: "~", replacement: path.resolve(__dirname, "./src") }]
    },
    optimizeDeps: {
        // Don't want vite to bundle these late during dev causing reload
        include: [
            "qr-scanner",
            "@kobalte/core",
            "@solid-primitives/upload",
            "i18next",
            "i18next-browser-languagedetector",
            "@mutinywallet/barcode-scanner",
            "@nostr-dev-kit/ndk",
            "@capacitor/clipboard",
            "@capacitor/core",
            "@capacitor/filesystem",
            "@capacitor/toast",
            "@capacitor/app",
            "@capacitor/browser",
        ],
        // This is necessary because otherwise `vite dev` can't find the wasm
        exclude: ["@mutinywallet/mutiny-wasm", "@mutinywallet/waila-wasm"]
    },
    css: {
        postcss: {
            plugins: [autoprefixer(), tailwindcss()]
        }
    }
});
