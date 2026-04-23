import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    test: {
        alias: {
            '@shared': resolve(__dirname, 'public/shared'),
            '@public': resolve(__dirname, 'public'),
            '@server': resolve(__dirname, 'server'),
        }
    }
});