import { copyFile } from 'node:fs/promises'

await copyFile(new URL('../index.template.html', import.meta.url), new URL('../index.html', import.meta.url))
