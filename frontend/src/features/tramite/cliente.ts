export type CuentaTramite = {
  token: string;
  id: number;
  clase: 'solicitante' | 'personal';
  puesto: string | null;
  delegacion: string | null;
  nombre: string;
  correo: string;
  activo?: boolean;
};

const CLAVE = 'fepi_tramite_token';
const CLAVE_CUENTA = 'fepi_tramite_cuenta';
export const RUTA_PUBLICA = '/tramite/convocatorias';

const SESION_MUERTA = new Set(['La sesión expiró', 'Sesión inválida', 'La cuenta ya no existe', 'Falta la sesión']);

function expiracionDe(token: string) {
  const cuerpo = token.split('.')[0];
  if (!cuerpo) return null;
  try {
    const relleno = '='.repeat((4 - (cuerpo.length % 4)) % 4);
    const datos = JSON.parse(atob(cuerpo.replace(/-/g, '+').replace(/_/g, '/') + relleno)) as { exp?: number };
    return typeof datos.exp === 'number' ? datos.exp : null;
  } catch {
    return null;
  }
}

export function tokenVencido() {
  const token = localStorage.getItem(CLAVE);
  if (!token) return false;
  const exp = expiracionDe(token);
  return exp === null || exp * 1000 <= Date.now();
}

export function leerCuenta(): CuentaTramite | null {
  if (tokenVencido()) return null;
  const crudo = localStorage.getItem(CLAVE_CUENTA);
  if (!crudo) return null;
  try {
    return JSON.parse(crudo) as CuentaTramite;
  } catch {
    return null;
  }
}

export function guardarCuenta(cuenta: CuentaTramite) {
  localStorage.setItem(CLAVE, cuenta.token);
  localStorage.setItem(CLAVE_CUENTA, JSON.stringify(cuenta));
}

export function salirTramite() {
  localStorage.removeItem(CLAVE);
  localStorage.removeItem(CLAVE_CUENTA);
}

export function irAConvocatoriasPublicas() {
  const ya = window.location.pathname === RUTA_PUBLICA;
  salirTramite();
  if (ya) window.location.reload();
  else window.location.replace(RUTA_PUBLICA);
}

export async function apiTramite<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(CLAVE);
  const headers = new Headers(opciones.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (opciones.body && !(opciones.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const respuesta = await fetch(`/api/tramite/v1${ruta}`, { ...opciones, headers });
  if (!respuesta.ok) {
    let mensaje = 'No se pudo completar la operación';
    try {
      const cuerpo = await respuesta.json();
      if (typeof cuerpo.detail === 'string') mensaje = cuerpo.detail;
    } catch {
      mensaje = respuesta.statusText || mensaje;
    }
    if (token && respuesta.status === 401 && SESION_MUERTA.has(mensaje)) irAConvocatoriasPublicas();
    throw new Error(mensaje);
  }
  const tipo = respuesta.headers.get('content-type') || '';
  if (tipo.includes('application/json')) return respuesta.json() as Promise<T>;
  return respuesta as unknown as T;
}

export const PUESTOS: { id: string; nombre: string }[] = [
  { id: 'convocatorias', nombre: 'Convocatorias' },
  { id: 'delegacion', nombre: 'Delegación' },
  { id: 'coordinacion_delegaciones', nombre: 'Coordinación de delegaciones' },
  { id: 'unidad_juridica', nombre: 'Unidad Jurídica' },
  { id: 'area_tecnica', nombre: 'Área técnica' },
  { id: 'comite', nombre: 'Comité' },
  { id: 'administracion_finanzas', nombre: 'Administración y Finanzas' },
  { id: 'seguimiento', nombre: 'Seguimiento' },
  { id: 'gestion_documental', nombre: 'Gestión documental' },
  { id: 'uippe', nombre: 'UIPPE' },
  { id: 'fiduciaria', nombre: 'Fiduciaria' },
  { id: 'organo_control', nombre: 'Órgano Interno de Control' },
];

export const PROGRAMAS: Record<string, string> = {
  CC: 'Capturando Carbono',
  PSA: 'Pago por Servicios Ambientales Hidrológicos',
  RHF: 'Restauración Hidrológico-Forestal',
  PS: 'Plantaciones Sustentables',
  MFS: 'Manejo Forestal Sustentable',
};

export const TENENCIA = 'Acreditación de propiedad o posesión';

export async function abrirArchivo(ruta: string) {
  const token = localStorage.getItem(CLAVE);
  const respuesta = await fetch(ruta, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!respuesta.ok) {
    if (token && respuesta.status === 401) irAConvocatoriasPublicas();
    throw new Error('No se pudo abrir el archivo');
  }
  const blob = await respuesta.blob();
  window.open(URL.createObjectURL(blob));
}
