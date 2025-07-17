<h3 align="center">Skylite UX</h3>

<p align="center">
    The open-source family manager
</p>

<p align="center">
<img src="https://github.com/user-attachments/assets/cf4b4b9f-c8db-4303-8fd0-58126a42382f" alt="SkyLite-UX"/>
</p>

[![Static Badge](https://img.shields.io/badge/Discord-lightgray?logo=discord)](https://discord.gg/KJn3YfWxn7)
[![Static Badge](https://img.shields.io/badge/Docker-lightgray?logo=docker)](https://docs.docker.com/get-started/get-docker/)
[![Static Badge](https://img.shields.io/badge/Nuxt-lightgray?logo=nuxt)](https://nuxt.com/docs/getting-started/introduction)
[![Static Badge](https://img.shields.io/badge/NuxtUI-lightgray?logo=nuxt)](https://ui.nuxt.com)
[![Static Badge](https://img.shields.io/badge/TailwindCSS-lightgray?logo=tailwindcss)](https://tailwindcss.com/docs/installation/using-vite)

# About The Project

Skylite UX was conceived as an open source, self-hosted alternative to commercial family managers. Most commercial offerings require expensive hardware and include subscriptions. Our goal was to create an offering that allows you to bring your own hardware, avoid subscriptions, and subscription associated feature creep while playing nicely with other self-hosted offerings.

## Features

- Deploy with Docker

## Feature Preview

- Calendar
  - View upcoming and past events for your family in the month, week, day, or agenda views
  - Add, edit, or delete events
- Lists
  - Track to-do lists for family members
  - Add, edit, or check items on your shopping lists
- Meals
  - View upcoming and past meals for your family in the month, week, day or agenda views
  - Add breakfast, lunch, dinner, and sides to your meal plan
  - Edit or delete meals from your meal plan
- Users
  - Add, edit, or remove family members
  - Assign family members a specific profile color

## Contributing

Fork the repo and create your branch from `dev`.

### Setup

- Install [Docker](https://docs.docker.com/get-started/get-docker/) and [Visual Studio Code](https://code.visualstudio.com/)
- Install the [Github Codespaces](https://marketplace.visualstudio.com/items?itemName=GitHub.codespaces) and [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) VScode extensions
- In VScode [open the command palette and select](https://code.visualstudio.com/docs/devcontainers/containers#_quick-start-open-a-git-repository-or-github-pr-in-an-isolated-container-volume) `Dev Containers: Clone Repository in Container Volume`. Select your repository and branch.
- Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev
```

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Special Thanks

The calendar UI was rewritten from [OriginUI](https://github.com/origin-space/ui-experiments) React code with express permission. Thank you Pasquale and Davide!
