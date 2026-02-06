# Storage & Cookie Manager

A lightweight, modern browser extension to manage LocalStorage, SessionStorage, and Cookies. Built with **Vanilla JavaScript** and compatible with **Manifest V3**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Manifest](https://img.shields.io/badge/Manifest-V3-success)

## 🚀 Features

- **Manage All Storage**: View, edit, delete, and add entries for LocalStorage, SessionStorage, and Cookies.
- **Modern UI**: Clean, flat design using system fonts and SVG icons.
- **Inline Editing**: Add and edit keys/values directly within the table without annoying popups.
- **JSON Viewer**: Dedicated window-style modal to view and format complex JSON values with syntax highlighting.
- **Zero Dependencies**: Rewritten from jQuery to pure Vanilla JS for better performance.
- **Manifest V3**: Fully compliant with the latest Chrome extension standards.

## 🛠️ Installation (Developer Mode)

Since this extension is not yet in the Chrome Web Store, you can install it manually:

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked**.
5. Select the folder containing the `manifest.json` file.

## 💻 Tech Stack

- **Core**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Architecture**: Chrome Extensions API (Manifest V3)
- **APIs Used**: `chrome.scripting`, `chrome.storage`, `chrome.cookies`

## 📝 License

This project is open source and available under the [MIT License](LICENSE).
