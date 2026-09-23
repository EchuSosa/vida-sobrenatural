/**
 * H-120: `packages/ui/src/components/marca.tsx` y `placeholder-imagen.tsx`
 * importan `.png` de `assets/marca/` (`import isotipoClaro from
 * '../assets/marca/logo-oscuro-1024.png'`) y leen `.src` del resultado
 * (`claro.src`). TypeScript no tiene ninguna declaración de módulo para
 * `*.png` por default — sin esto, `tsc` no sabe qué tipo tiene ese import
 * (TS2307, "Cannot find module").
 *
 * Esta app no importa un placeholder `any` (eso destruye el tipo en cada
 * lugar donde se usa — peor que el error actual, que al menos se ve): la
 * forma de abajo es la que Next.js REALMENTE produce al procesar un import
 * de imagen estática (webpack/Turbopack, vía `next/image`), sea que el
 * archivo fuente viva en `apps/web`/`apps/backoffice` o, como acá, en
 * `packages/ui` — con `transpilePackages: ["@vida-sobrenatural/ui"]`
 * (next.config.ts de las dos apps) el bundler de la app CONSUMIDORA
 * procesa este paquete con los mismos loaders que su propio código, así
 * que el import de PNG en packages/ui también pasa por ese transform.
 *
 * La forma está copiada a mano de `StaticImageData`
 * (`next/dist/shared/lib/get-img-props.d.ts`, Next 16.3.5 instalado) —
 * verificada contra el archivo real del paquete instalado, no adivinada —
 * en vez de importarla de `next`: `packages/ui` NO depende de `next`
 * (mismo criterio que ya documentan marca.tsx/placeholder-imagen.tsx, que
 * usan `<img>` en vez de `next/image` por esto mismo), y agregar `next`
 * como devDependency solo para este tipo ataría el chequeo de tipos de
 * este paquete a una versión de Next que packages/ui no usa. Si esta forma
 * cambia en una futura versión de Next, el síntoma sería un tipo
 * desactualizado, no un `any` que lo esconde — y el objeto real en
 * runtime (el que arma el bundler de cada app) sigue siendo el que decida
 * esa versión de Next, esto es solo la ANOTACIÓN de tipos para
 * packages/ui.
 */
declare module '*.png' {
  interface ImagenEstatica {
    src: string;
    height: number;
    width: number;
    blurDataURL?: string;
    blurWidth?: number;
    blurHeight?: number;
  }
  const contenido: ImagenEstatica;
  export default contenido;
}
