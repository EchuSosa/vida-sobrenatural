import { Test } from '@nestjs/testing';
import { PalabraProfeticaService } from '../../src/palabra-profetica/palabra-profetica.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

async function crearServicio(prismaMock: Record<string, unknown>) {
  const moduleRef = await Test.createTestingModule({
    providers: [PalabraProfeticaService, { provide: PrismaService, useValue: prismaMock }],
  }).compile();
  return moduleRef.get(PalabraProfeticaService);
}

// FR-004/FR-006 (specs/003-contenido-institucional): el controller traduce
// `null` a 204 — el service solo tiene que devolver la única vigente, o
// `null` si todavía no hay ninguna.
describe('PalabraProfeticaService — findVigente', () => {
  it('devuelve null cuando todavía no hay ninguna Palabra Profética vigente', async () => {
    const prismaMock = {
      palabraProfetica: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = await crearServicio(prismaMock);

    const resultado = await service.findVigente();
    expect(resultado).toBeNull();
    expect(prismaMock.palabraProfetica.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { vigente: true } }),
    );
  });

  it('devuelve la única Palabra Profética marcada vigente', async () => {
    const vigente = {
      id: 'pp1',
      anio: 2026,
      titulo: 'Fidelidad y crecimiento',
      texto: 'texto',
      youtubeUrl: null,
      youtubeVideoId: null,
      vigente: true,
      createdAt: new Date(),
    };
    const prismaMock = {
      palabraProfetica: { findFirst: jest.fn().mockResolvedValue(vigente) },
    };
    const service = await crearServicio(prismaMock);

    const resultado = await service.findVigente();
    expect(resultado).toEqual(vigente);
  });

  it('D121: una vigente sin video (youtubeUrl/youtubeVideoId null) se devuelve igual, no es un caso vacío', async () => {
    const vigenteSinVideo = {
      id: 'pp2',
      anio: 2026,
      titulo: 'Fidelidad y crecimiento',
      texto: 'texto',
      youtubeUrl: null,
      youtubeVideoId: null,
      vigente: true,
      createdAt: new Date(),
    };
    const prismaMock = {
      palabraProfetica: { findFirst: jest.fn().mockResolvedValue(vigenteSinVideo) },
    };
    const service = await crearServicio(prismaMock);

    const resultado = await service.findVigente();
    expect(resultado).not.toBeNull();
    expect(resultado?.youtubeVideoId).toBeNull();
  });
});
