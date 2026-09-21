export const metadata = {
  title: 'Registro en revisión — Vida Sobrenatural',
};

export default function PendienteTutorPage() {
  return (
    // Sin <main id="contenido"> propio — (publica)/layout.tsx ya lo provee
    // (H-05, actualización 2026-09-18).
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">Todavía no podés ingresar</h1>
      <p className="text-muted-foreground">
        Detectamos que sos menor de 18 años. Para completar tu registro necesitamos que un
        adulto responsable (tutor) autorice tu inscripción. Nuestro equipo va a comunicarse con
        tu tutor para coordinarlo — por ahora no hace falta que hagas nada más.
      </p>
      <p className="text-sm text-muted-foreground">
        Si tenés dudas mientras tanto, podés escribirnos por WhatsApp o acercarte a la Sede.
      </p>
    </div>
  );
}
