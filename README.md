<p align="center">
  <img src=".github/header.png" alt="Ollama GUI logo">
</p>

# Ollama GUI: Web Interface for chatting with your local LLMs.

Ollama GUI is a web interface for [ollama.ai](https://ollama.ai/download), a tool that enables running Large
Language Models (LLMs) on your local machine.

## 🛠 Installation

### Prerequisites

1. Download and install [ollama CLI](https://ollama.ai/download).

   ```bash
   ollama pull <model-name>
   ollama serve
   ```

### Getting Started

2. Clone the repository and start the development server.

   ```bash
   git clone git@github.com:HelgeSverre/ollama-gui.git
   cd ollama-gui
   yarn install
   yarn dev
   ```

3. Or use the web version, by allowing the remote origin [docs](https://github.com/jmorganca/ollama/blob/main/docs/faq.md#how-can-i-expose-the-ollama-server)

   ```shell
   OLLAMA_ORIGINS=https://ollama-15y7qft4h-helgesverre.vercel.app ollama serve
   ```

---

## 📋 To-Do List

- [ ] Browse and download available models
- [ ] Store chat history using IndexedDB
- [ ] Ensure mobile responsiveness

---

## 🛠 Built With

- [Ollama.ai](https://ollama.ai/) - CLI tool for models.
- [LangUI](https://www.langui.dev/)
- [Vue.js](https://vuejs.org/)
- [Vite](https://vitejs.dev/)
- [Pinia](https://pinia.esm.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [VueUse](https://vueuse.org/)
- [@tabler/icons-vue](https://github.com/tabler/icons-vue)

---

## 📝 License

Licensed under the MIT License. See the [LICENSE.md](LICENSE.md) file for details.
