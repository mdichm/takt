/// <reference types="vite/client" />

// Déclaration pour les imports de fichiers CSS (side-effect imports) - requis pour TS 7
declare module '*.css' {
  const content: string;
  export default content;
}