<p align="center">
  <img src=".github/header.png" alt="Ollama GUI logo">
</p>

<h1 align="center">Ollama GUI</h1>
<p align="center">A modern web interface for chatting with your local LLMs through Ollama</p>

<p align="center">
  <a href="https://ollama.ai">
    <img src="https://img.shields.io/badge/Powered%20by-Ollama-blue?style=flat-square" alt="Powered by Ollama">
  </a>
  <a href="https://github.com/HelgeSverre/ollama-gui/blob/main/LICENSE.md">
    <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License">
  </a>
  <a href="https://ollama-gui.vercel.app">
    <img src="https://img.shields.io/badge/Demo-Live-success?style=flat-square" alt="Live Demo">
  </a>
</p>

## ✨ Features

- 🖥️ Clean, modern interface for interacting with Ollama models
- 💾 Local chat history using IndexedDB
- 📝 Full Markdown support in messages
- 🌙 Dark mode support
- 🚀 Fast and responsive
- 🔒 Privacy-focused: All processing happens locally
- 🌐 Development proxy for easy network access

## 🚀 Quick Start

### Prerequisites (only needed for local development)

1. Install [Ollama](https://ollama.ai/download)
2. Install [Node.js](https://nodejs.org/) (v16+) and [Yarn](https://classic.yarnpkg.com/lang/en/docs/install)

### Local Development

```bash
# Start Ollama server with your preferred model
ollama pull mistral  # or any other model
ollama serve

# Clone and run the GUI
git clone https://github.com/HelgeSverre/ollama-gui.git
cd ollama-gui
yarn install
yarn dev
```

#### Network Access (Development Only)

The development server includes an automatic proxy that forwards API requests to your local Ollama instance. This allows other devices on your network to access both the UI and Ollama API:

```bash
# Start dev server with network access
yarn dev --host

# Access from other devices using your machine's IP
# Example: http://192.168.1.100:5173
```

**Note:** This proxy feature is only available during development with `yarn dev`. For production deployments, you'll need to configure CORS on your Ollama instance or use a reverse proxy.

To disable the proxy (e.g., when using a custom Ollama endpoint):
```bash
VITE_NO_PROXY=true yarn dev
```

### Using the Hosted Version

To use the [hosted version](https://ollama-gui.vercel.app), run Ollama with:

```bash
OLLAMA_ORIGINS=https://ollama-gui.vercel.app ollama serve
```

### Docker Deployment

The Docker setup runs both Ollama and the GUI together, so no proxy or CORS configuration is needed. No need to install anything other than `docker`.

> If you have GPU, please uncomment the following lines in the file `compose.yml`
```Dockerfile
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: all
    #           capabilities: [gpu]
```

#### Run
```bash
docker compose up -d

# Access at http://localhost:8080
```

#### Stop
```bash
docker compose down
```

#### Download more models
```bash
# Enter the ollama container
docker exec -it ollama bash

# Inside the container
ollama pull <model_name>

# Example
ollama pull deepseek-r1:7b
```

Restart the containers using `docker compose restart`.

Models will get downloaded inside the folder `./ollama_data` in the repository. You can change it inside the `compose.yml`

## 🏭 Production Deployment

When building the application for production (`yarn build`), the resulting static files do not include a proxy server. You have several options for production deployments:

### Option 1: Configure CORS on Ollama
```bash
# Allow your production domain
OLLAMA_ORIGINS=https://your-domain.com ollama serve
```

### Option 2: Use a Reverse Proxy
Set up a reverse proxy (nginx, Apache, Caddy) to forward `/api` requests to your Ollama instance.

### Option 3: Use Docker Compose
The provided Docker setup runs both services together, eliminating CORS issues:
```bash
docker compose up -d
```

## 🛣️ Roadmap

- [x] Chat history with IndexedDB
- [x] Markdown message formatting
- [x] Code cleanup and organization
- [ ] Model library browser and installer
- [ ] Mobile-responsive design
- [ ] File uploads with OCR support

## 🛠️ Tech Stack

- [Vue.js](https://vuejs.org/) - Frontend framework
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [VueUse](https://vueuse.org/) - Vue Composition Utilities
- [@tabler/icons-vue](https://github.com/tabler/icons-vue) - Icons
- Design inspired by [LangUI](https://www.langui.dev/)
- Hosted on [Vercel](https://vercel.com/)

## 📄 License

Released under the [MIT License](LICENSE.md).
