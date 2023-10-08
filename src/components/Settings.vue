<template>
  <aside class="flex">
    <div
      class="relative h-screen w-60 overflow-y-auto border-l border-zinc-300 bg-zinc-50 py-8 dark:border-zinc-700 dark:bg-zinc-900 sm:w-64"
    >
      <div
        class="mb-4 flex items-center gap-x-2 px-2 text-zinc-800 dark:text-zinc-200"
      >
        <button class="inline-flex rounded-lg p-1 hover:bg-zinc-700">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            stroke-width="2"
            stroke="currentColor"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
            <path
              d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"
            ></path>
            <path d="M9 4v16"></path>
            <path d="M14 10l2 2l-2 2"></path>
          </svg>
          <span class="sr-only">Close settings sidebar</span>
        </button>
        <h2 class="text-lg font-medium">Settings</h2>
      </div>

      <!-- Select -->
      <div class="px-2 py-4 text-zinc-800 dark:text-zinc-200">
        <label for="select-mode" class="px-2 text-sm font-medium">Mode</label>
        <select
          name="select-mode"
          id="select-mode"
          class="mt-2 w-full cursor-pointer rounded-lg border-r-4 border-transparent bg-zinc-200 py-3 pl-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-zinc-800"
        >
          <option value="">Select a mode</option>
          <option value="Complete">Complete</option>
          <option value="Chat">Chat</option>
          <option value="Insert">Insert</option>
          <option value="Edit">Edit</option>
        </select>
      </div>
      <!-- Toggle -->
      <div class="px-2 py-4">
        <label class="relative flex cursor-pointer items-center">
          <input type="checkbox" value="" class="peer sr-only" />
          <div
            class="peer h-6 w-11 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:tranzinc-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:border-zinc-600 dark:bg-zinc-700 dark:peer-focus:ring-blue-800"
          ></div>
          <span
            class="ml-3 text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >Toggle</span
          >
        </label>
      </div>
      <!-- More Settings -->
      <div
        class="my-4 border-t border-zinc-300 px-2 py-4 text-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
      >
        <label class="px-2 text-xs uppercase text-zinc-500 dark:text-zinc-400"
          >Advanced</label
        >

        <label for="api-key" class="mb-2 mt-4 block px-2 text-sm font-medium"
          >API Key</label
        >
        <input
          type="password"
          id="api-key"
          class="block w-full rounded-lg bg-zinc-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-zinc-800 dark:placeholder-zinc-400 dark:focus:ring-blue-600"
          placeholder="4sNhFQ******ffyt"
        />

        <label for="base-url" class="mb-2 mt-4 block px-2 text-sm font-medium"
          >Base URL</label
        >
        <input
          type="url"
          id="base-url"
          class="block w-full rounded-lg bg-zinc-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-zinc-800 dark:placeholder-zinc-400 dark:focus:ring-blue-600"
          placeholder="https://api.openai.com"
        />

        <label
          for="select-model"
          class="mb-2 mt-4 block px-2 text-sm font-medium"
          >Model</label
        >
        <select
          name="select-model"
          id="select-model"
          class="block w-full cursor-pointer rounded-lg border-r-4 border-transparent bg-zinc-200 py-3 pl-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-zinc-800 dark:placeholder-zinc-400 dark:focus:ring-blue-600"
        >
          <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
          <option value="gpt-4">gpt-4</option>
          <option value="gpt-4-0314">gpt-4-0314</option>
          <option value="gpt-4-32k">gpt-4-32k</option>
          <option value="gpt-4-32k-0314">gpt-4-32k-0314</option>
          <option value="gpt-3.5-turbo-0301">gpt-3.5-turbo-0301</option>
        </select>

        <label for="max-tokens" class="mb-2 mt-4 block px-2 text-sm font-medium"
          >Max tokens</label
        >
        <input
          type="number"
          id="max-tokens"
          class="block w-full rounded-lg bg-zinc-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-zinc-800 dark:placeholder-zinc-400 dark:focus:ring-blue-600"
          placeholder="2048"
        />

        <label for="max-tokens" class="mb-2 mt-4 block px-2 text-sm font-medium"
          >Temperature</label
        >
        <input
          type="number"
          id="max-tokens"
          class="block w-full rounded-lg bg-zinc-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-zinc-800 dark:placeholder-zinc-400 dark:focus:ring-blue-600"
          placeholder="0.7"
        />

        <label for="top-p" class="mb-2 mt-4 block px-2 text-sm font-medium"
          >Top P</label
        >
        <input
          type="number"
          id="top-p"
          class="block w-full rounded-lg bg-zinc-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-zinc-800 dark:placeholder-zinc-400 dark:focus:ring-blue-600"
          placeholder="1"
        />

        <button
          type="button"
          class="mt-4 block w-full rounded-lg bg-zinc-200 p-2.5 text-xs font-semibold hover:bg-blue-600 hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-zinc-800 dark:hover:bg-blue-600"
        >
          Save changes
        </button>
      </div>
    </div>
  </aside>
</template>
<script>
export default {
  name: "Settings",
};
</script>
