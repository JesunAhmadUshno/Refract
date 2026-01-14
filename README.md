<div align="center">

# REFRACT<span style="color: #6366f1">.</span>
### Chrome Asset Studio

<p>
  <a href="#-live-demo">Live Demo</a> •
  <a href="#-features">Features</a> •
  <a href="#-how-it-works">How It Works</a>
</p>

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![Privacy](https://img.shields.io/badge/privacy-100%25%20client--side-green.svg)

<br>

**A premium, privacy-focused asset generator for Chrome Web Store developers.** Transform a single master image into all required store assets instantly, entirely within your browser.

</div>

---

## 💎 Overview

**Refract** is a modern web application designed to streamline the deployment process for Chrome Extension developers. Instead of manually cropping and resizing images in Photoshop or Figma, Refract takes a single high-resolution source image and algorithmically generates every mandatory asset size required by the Chrome Web Store.

Built with a focus on **privacy** and **speed**, Refract operates entirely client-side. Your images never leave your browser and are never uploaded to a server.

## 🚀 Features

* **Zero-Server Latency:** Powered by the HTML5 Canvas API for instant image processing.
* **Privacy First:** No data transmission. All processing happens locally on your machine.
* **Glassmorphism UI:** A sleek, modern "dark mode" interface featuring frosted glass aesthetics.
* **One-Click ZIP:** Download all assets in a perfectly named `.zip` file, ready for upload.
* **Smart Resizing:** Automatically scales your source image to strict Web Store dimensions.

## 📦 Generated Assets

Refract automatically generates the following 24-bit PNG files (no alpha), adhering to Chrome Web Store requirements:

| Asset Type | Dimensions | Usage |
| :--- | :--- | :--- |
| **Marquee Promo** | `1400 x 560` | The main promotional tile for the store. |
| **Screenshot** | `1280 x 800` | High-res display for store listings. |
| **Small Promo** | `440 x 280` | Smaller promotional tile. |
| **Store Icon** | `128 x 128` | The official icon used in the dashboard. |

## 🌐 Live Demo

You can try the live version of Refract here:

### [🔗 Launch Refract](https://YOUR_USERNAME.github.io/refract/)

*(Note: Replace `YOUR_USERNAME` with your actual GitHub username after deployment)*

## 🛠 How It Works

Refract was originally conceptualized as a Python automation script using the `Pillow` library. It has been re-engineered as a serverless Single Page Application (SPA) to provide a better user experience.

**The Tech Stack:**
* **Core:** HTML5, CSS3, Vanilla JavaScript (ES6+).
* **Styling:** Custom CSS variables, Flexbox/Grid, Backdrop Filters (Glassmorphism).
* **Processing:** HTML5 `<canvas>` API for image manipulation.
* **Libraries:** `JSZip` (for bundling) and `FileSaver.js` (for downloads).

## 💻 Running Locally

If you wish to run this offline or modify the code:

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/your-username/refract.git](https://github.com/your-username/refract.git)
    cd refract
    ```

2.  **Launch**
    Simply open the `index.html` file in any modern web browser. No `npm install` or build steps required.

## 🎨 Customization

The design system is built on CSS variables for easy theming. Open `style.css` to modify the palette:

```css
:root {
    --bg-dark: #09090b;       /* Background Color */
    --accent: #6366f1;        /* Main Brand Color (Indigo) */
    --glass-bg: rgba(255, 255, 255, 0.03); /* Frosted Effect */
}