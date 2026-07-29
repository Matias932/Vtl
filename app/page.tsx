import RoomShell from "@/components/room/room-shell";
import Link from "next/link";

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ code?: string }>;
  searchParams: Promise<{ name?: string; host?: string; code?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;

  // Extraer el código desde params o query string
  const rawCode = resolvedParams.code || resolvedSearch.code;
  const code = rawCode ? rawCode.toUpperCase() : null;

  const name = resolvedSearch.name?.trim() || "Invitado";
  const isHost = resolvedSearch.host === "1";

  // SI NO HAY CÓDIGO: Muestra la pantalla para iniciar/crear sala
  if (!code) {
    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6 gap-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Virtual Watch Room</h1>
          <p className="text-zinc-400 text-sm">Crea una sala o únete a una existente para ver contenido en sincronía.</p>
        </div>

        <div className="flex flex-col w-full max-w-xs gap-3">
          {/* Botón para entrar como ANFITRIÓN */}
          <Link
            href={`/?code=${newRoomCode}&host=1&name=Anfitrión`}
            className="w-full text-center py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition"
          >
            Crear Sala como Anfitrión
          </Link>
        </div>
      </main>
    );
  }

  // SI HAY CÓDIGO: Renderiza la sala de forma segura
  return (
    <RoomShell
      code={code}
      name={name}
      isHost={isHost}
    />
  );
}
