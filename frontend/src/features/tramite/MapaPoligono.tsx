import { useEffect, useRef } from 'react';
import L from 'leaflet';

type Vertice = { lat: number; lng: number };

type Props = {
  vertices: Vertice[];
  onChange?: (vertices: Vertice[]) => void;
  className?: string;
  lectura?: boolean;
};

export function MapaPoligono({ vertices, onChange, className, lectura = false }: Props) {
  const nodo = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const dibujo = useRef<L.Layer | null>(null);
  const actuales = useRef(vertices);
  const alCambiar = useRef(onChange);
  actuales.current = vertices;
  alCambiar.current = onChange;

  useEffect(() => {
    if (!nodo.current || mapa.current) return;
    const creado = L.map(nodo.current).setView([19.35, -99.65], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(creado);
    if (!lectura) {
      creado.on('click', (evento: L.LeafletMouseEvent) => {
        alCambiar.current?.([...actuales.current, { lat: evento.latlng.lat, lng: evento.latlng.lng }]);
      });
    }
    mapa.current = creado;
    return () => {
      creado.remove();
      mapa.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapa.current) return;
    if (dibujo.current) {
      dibujo.current.remove();
      dibujo.current = null;
    }
    const puntos = vertices.map((vertice) => [vertice.lat, vertice.lng] as [number, number]);
    if (puntos.length >= 3) {
      const poligono = L.polygon(puntos, { color: '#2f6b45', weight: 2, fillOpacity: 0.35 }).addTo(mapa.current);
      dibujo.current = poligono;
      if (lectura) {
        requestAnimationFrame(() => {
          mapa.current?.invalidateSize();
          mapa.current?.fitBounds(poligono.getBounds(), { padding: [16, 16] });
        });
      }
    } else if (puntos.length > 0) {
      dibujo.current = L.polyline(puntos, { color: '#355044', weight: 2 }).addTo(mapa.current);
    }
  }, [vertices, lectura]);

  return <div ref={nodo} className={className || 'h-80 w-full overflow-hidden rounded-[28px]'} />;
}
