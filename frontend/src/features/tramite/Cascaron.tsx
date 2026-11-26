import { useEffect, type ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { RUTA_PUBLICA, irAConvocatoriasPublicas, leerCuenta, tokenVencido, type CuentaTramite } from './cliente';
import './tramite.css';

export const titulo = '';
export const accion = 'btn btn-primary';
export const secundario = 'btn btn-outline';
export const campo = 'campo';
export const tarjeta = 'card';

function Bosque() {
  return (
    <svg className="header-forest" viewBox="0 0 560 90" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 90 L80 65 L157 77 L230 35 L305 70 L390 26 L475 60 L560 4 L560 90Z" fill="#e4f1e7" />
      <path d="M0 90 L130 78 L210 86 L285 66 L365 84 L435 53 L560 56 L560 90Z" fill="#b6d8c2" opacity=".75" />
      <g fill="#528e61" opacity=".82">
        <path d="m447 76 17-49 17 49-8-6 0 20-18 0 0-20z" />
        <path d="m485 76 16-55 17 55-8-7 0 21-17 0 0-21z" />
        <path d="m524 74 16-66 20 66-10-7 0 23-18 0 0-23z" />
      </g>
      <g fill="#2d7048">
        <path d="m481 87 24-50 24 50-13-10v13h-23V77z" />
        <path d="m520 82 23-70 24 70-13-12v20h-22V70z" />
      </g>
    </svg>
  );
}

function menuDe(cuenta: CuentaTramite | null, ruta: string) {
  if (!cuenta) return [];
  if (cuenta.clase === 'solicitante') {
    return [
      { id: 'inicio', nombre: 'Inicio', to: '/tramite' },
      { id: 'convocatorias', nombre: 'Convocatorias', to: '/tramite/convocatorias' },
      { id: 'expediente', nombre: 'Expediente', to: '/tramite/expediente' },
      { id: 'avisos', nombre: 'Avisos', to: '/tramite/avisos' },
      { id: 'queja', nombre: 'Queja', to: '/tramite/queja' },
    ];
  }
  if (cuenta.puesto === 'convocatorias') {
    return [
      { id: 'inicio', nombre: 'Inicio', to: '/tramite' },
      { id: 'convocatorias', nombre: 'Convocatorias', to: '/tramite/convocatorias' },
      { id: 'nueva', nombre: 'Nueva', to: '/tramite/convocatorias/nueva' },
      { id: 'resultados', nombre: 'Resultados', to: '/tramite/resultados' },
    ];
  }
  if (cuenta.puesto === 'super_admin') {
    return [
      { id: 'inicio', nombre: 'Cuentas', to: '/tramite' },
      { id: 'nueva', nombre: 'Nueva cuenta', to: '/tramite/cuentas/nueva' },
    ];
  }
  if (cuenta.puesto === 'delegacion') {
    return [
      { id: 'inicio', nombre: 'Inicio', to: '/tramite' },
      { id: 'bandeja', nombre: 'Bandeja', to: '/tramite/bandeja' },
      { id: 'recepcion', nombre: 'Recepción', to: ruta.startsWith('/tramite/solicitudes/') ? ruta : '/tramite/recepcion' },
      { id: 'solicitantes', nombre: 'Solicitantes', to: '/tramite/solicitantes' },
    ];
  }
  return [{ id: 'inicio', nombre: 'Inicio', to: '/tramite' }];
}

function activoDe(ruta: string, cuenta: CuentaTramite | null) {
  if (cuenta?.puesto === 'delegacion') {
    if (ruta.startsWith('/tramite/bandeja')) return 'bandeja';
    if (ruta.startsWith('/tramite/solicitantes')) return 'solicitantes';
    if (ruta.startsWith('/tramite/recepcion') || ruta.startsWith('/tramite/solicitudes')) return 'recepcion';
    return 'inicio';
  }
  if (ruta.startsWith('/tramite/solicitudes')) return 'convocatorias';
  if (ruta.startsWith('/tramite/convocatorias/nueva') || ruta.endsWith('/editar')) return 'nueva';
  if (ruta.startsWith('/tramite/convocatorias')) return 'convocatorias';
  if (ruta.startsWith('/tramite/expediente')) return 'expediente';
  if (ruta.startsWith('/tramite/avisos')) return 'avisos';
  if (ruta.startsWith('/tramite/queja')) return 'queja';
  if (ruta.startsWith('/tramite/resultados')) return 'resultados';
  if (ruta.startsWith('/tramite/cuentas/nueva')) return 'nueva';
  return 'inicio';
}

function chipDe(cuenta: CuentaTramite | null, ruta: string, chip?: string) {
  if (chip) return chip;
  if (cuenta?.puesto === 'delegacion') return `Delegación ${cuenta.delegacion || ''}`.trim();
  if (ruta.includes('/solicitudes')) return 'Solicitud Única (FO-PB-501)';
  if (!cuenta) return 'Trámite de apoyos 2026';
  if (cuenta.clase === 'solicitante') return 'Solicitante';
  if (cuenta.puesto === 'super_admin') return 'Cuenta de arranque';
  if (cuenta.puesto === 'convocatorias') return 'Convocatorias';
  return 'Trámite de apoyos 2026';
}

function leyendaDe(cuenta: CuentaTramite | null, ruta: string) {
  if (!cuenta) return '';
  if (cuenta.clase === 'solicitante') return ruta.includes('/queja') ? 'Persona beneficiaria' : 'Solo su expediente';
  if (cuenta.puesto === 'convocatorias') {
    if (ruta.includes('/nueva') || ruta.endsWith('/editar')) return 'Guardar no publica';
    if (ruta.includes('/convocatorias')) return 'Editar o eliminar';
    return 'No recibe solicitudes';
  }
  if (cuenta.puesto === 'super_admin') return ruta.includes('/cuentas/nueva') ? 'Asigna el puesto' : 'No tramita';
  if (cuenta.puesto === 'delegacion') {
    return ruta.startsWith('/tramite/solicitudes') || ruta.startsWith('/tramite/recepcion') ? 'Comprobante' : 'Sus municipios';
  }
  return 'PROBOSQUE-FEPI';
}

export function GuardaSesion() {
  const ruta = useLocation().pathname;
  const vencido = tokenVencido();
  useEffect(() => {
    if (vencido) irAConvocatoriasPublicas();
  }, [vencido]);
  if (!vencido || ruta === RUTA_PUBLICA) return null;
  return <Navigate to={RUTA_PUBLICA} replace />;
}

export function Cascaron({ children, chip, publico = false }: { children: ReactNode; chip?: string; publico?: boolean }) {
  const cuenta = leerCuenta();
  const ruta = useLocation().pathname;

  const marca = (
    <header className="topbar">
      <div className="state-logo"><div className="crest" aria-hidden="true">✥</div><span>GOBIERNO DEL<br />ESTADO DE MÉXICO</span></div>
      <div className="topbar-divider" />
      <Link to={cuenta ? '/tramite' : RUTA_PUBLICA} className="probosque">PROB<span className="brand-o">◉</span>SQUE<small>Estado de México</small></Link>
      <div className="document-chip">{chipDe(cuenta, ruta, chip)}</div>
      <Bosque />
    </header>
  );

  if (publico || !cuenta) {
    return <div className="pb">{marca}<main className="publico">{children}</main></div>;
  }

  const activo = activoDe(ruta, cuenta);
  return (
    <div className="pb">
      {marca}
      <div className="app">
        <aside>
          <div className="sidebar-brand">
            <div className="sidebar-logo" aria-hidden="true">♣</div>
            <div><strong>PROBOSQUE-FEPI</strong><small>{leyendaDe(cuenta, ruta)}</small></div>
          </div>
          <nav>
            {menuDe(cuenta, ruta).map((item) => (
              <Link key={item.id} className={item.id === activo ? 'navlink active' : 'navlink'} to={item.to}>{item.nombre}</Link>
            ))}
            <button
              type="button"
              className="navlink"
              onClick={() => irAConvocatoriasPublicas()}
            >
              Salir
            </button>
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
