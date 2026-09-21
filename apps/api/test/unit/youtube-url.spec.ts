import { extraerIdDeYoutube } from '../../src/palabra-profetica/youtube-url.js';

// FR-011 (D121, research.md Decisión 4).
describe('extraerIdDeYoutube', () => {
  it('reconoce youtube.com/watch?v=ID', () => {
    expect(extraerIdDeYoutube('https://www.youtube.com/watch?v=oVLmI6_IoC8')).toBe('oVLmI6_IoC8');
    expect(extraerIdDeYoutube('http://youtube.com/watch?v=oVLmI6_IoC8')).toBe('oVLmI6_IoC8');
  });

  it('reconoce youtube.com/watch?v=ID con otros query params (ej. lista de reproducción)', () => {
    expect(extraerIdDeYoutube('https://www.youtube.com/watch?v=oVLmI6_IoC8&list=PL123')).toBe('oVLmI6_IoC8');
  });

  it('reconoce youtu.be/ID', () => {
    expect(extraerIdDeYoutube('https://youtu.be/oVLmI6_IoC8')).toBe('oVLmI6_IoC8');
  });

  it('reconoce youtube.com/embed/ID', () => {
    expect(extraerIdDeYoutube('https://www.youtube.com/embed/oVLmI6_IoC8')).toBe('oVLmI6_IoC8');
  });

  it('devuelve null para una URL que no es de YouTube', () => {
    expect(extraerIdDeYoutube('https://vimeo.com/123456789')).toBeNull();
    expect(extraerIdDeYoutube('no es ni siquiera una URL')).toBeNull();
  });

  it('devuelve null para una URL de YouTube que no apunta a un video (ej. el canal)', () => {
    expect(extraerIdDeYoutube('https://www.youtube.com/@vidasobrenatural')).toBeNull();
  });

  it('devuelve null para un id que no tiene 11 caracteres', () => {
    expect(extraerIdDeYoutube('https://www.youtube.com/watch?v=corto')).toBeNull();
  });
});
