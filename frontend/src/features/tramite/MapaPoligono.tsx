import { useEffect, useRef } from 'react';
import L from 'leaflet';

type Vertice = { lat: number; lng: number };

type Props = {
  vertices: Vertice[];
  onChange: (vertices: Vertice[]) => void;
};

export function MapaPoligono({ vertices, onChange }: Props) {
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
    creado.on('click', (evento: L.LeafletMouseEvent) => {
      alCambiar.current([...actuales.current, { lat: evento.latlng.lat, lng: evento.latlng.lng }]);
    });
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
      dibujo.current = L.polygon(puntos, { color: '#E0643A', weight: 2 }).addTo(mapa.current);
    } else if (puntos.length > 0) {
      dibujo.current = L.polyline(puntos, { color: '#355044', weight: 2 }).addTo(mapa.current);
    }
  }, [vertices]);

  return <div ref={nodo} className="h-80 w-full overflow-hidden rounded-[28px]" />;
}
