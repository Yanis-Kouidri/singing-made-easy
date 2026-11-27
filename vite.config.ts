import { defineConfig } from 'vite';

export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages sert le site dans un sous-dossier :
  // https://yanis-kouidri.github.io/singing-made-easy/
  // Le build et `vite preview` l'utilisent aussi ; en développement,
  // on reste à la racine (http://localhost:5173/).
  base: command === 'build' || isPreview ? '/singing-made-easy/' : '/',
}));
