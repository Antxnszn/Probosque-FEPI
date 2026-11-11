import { Link, Outlet, useNavigate } from 'react-router-dom';
import { leerCuenta, salirTramite } from './cliente';

export function TramiteShell() {
  const cuenta = leerCuenta();
  const navegar = useNavigate();

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#1B2A24] font-['Plus_Jakarta_Sans',sans-serif]">
      <header className="max-w-5xl mx-auto pt-6 px-4 sm:px-8">
        <nav className="flex flex-wrap items-center justify-between gap-4 rounded-full bg-[#D9D1B8] px-6 py-3.5">
          <Link to="/" className="font-['Outfit',sans-serif] text-xl font-medium">
            PROBOSQUE
          </Link>
          <div className="flex flex-wrap items-center gap-4 text-sm text-[#355044]">
            <Link to="/tramite">Trámite de apoyos</Link>
            {cuenta ? <Link to="/tramite/avisos">Avisos</Link> : null}
            <Link to="/gestion" className="text-[#6B8B78]">
              Estado del sistema
            </Link>
            {cuenta ? (
              <button
                type="button"
                className="text-[#E0643A]"
                onClick={() => {
                  salirTramite();
                  navegar('/tramite/entrar');
                }}
              >
                Salir
              </button>
            ) : (
              <Link to="/tramite/entrar" className="text-[#E0643A]">
                Entrar
              </Link>
            )}
          </div>
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-8 pt-10 pb-20">
        <Outlet />
      </main>
    </div>
  );
}
