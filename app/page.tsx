"use client";

import { useState } from "react";

export default function HomePage() {
  const [roomInput, setRoomInput] = useState("");

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
            if (!roomInput.trim()) return;
                const cleanCode = roomInput.trim().toUpperCase();
                    window.location.href = `/?code=${cleanCode}&host=0&name=Invitado`;
                      };

                        const newHostCode = typeof window !== "undefined" 
                            ? Math.random().toString(36).substring(2, 8).toUpperCase()
                                : "ROOM1";

                                  return (
                                      <main className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6 gap-6">
                                            <div className="text-center space-y-2">
                                                    <h1 className="text-3xl font-bold tracking-tight">Virtual Watch Room</h1>
                                                            <p className="text-zinc-400 text-sm">
                                                                      Crea una sala para ser Anfitrión o ingresa el código de una existente.
                                                                              </p>
                                                                                    </div>

                                                                                          <div className="flex flex-col w-full max-w-xs gap-4">
                                                                                                  {/* Botón directo como enlace para Anfitrión */}
                                                                                                          <a
                                                                                                                    href={`/?code=${newHostCode}&host=1&name=Anfitri%C3%B3n`}
                                                                                                                              className="w-full text-center py-3 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-xl transition shadow-lg block"
                                                                                                                                      >
                                                                                                                                                Crear Sala como Anfitrión
                                                                                                                                                        </a>

                                                                                                                                                                <div className="relative flex py-1 items-center">
                                                                                                                                                                          <div className="flex-grow border-t border-zinc-800"></div>
                                                                                                                                                                                    <span className="flex-shrink mx-4 text-zinc-500 text-xs">O ÚNETE</span>
                                                                                                                                                                                              <div className="flex-grow border-t border-zinc-800"></div>
                                                                                                                                                                                                      </div>

                                                                                                                                                                                                              {/* Formulario para Invitado */}
                                                                                                                                                                                                                      <form onSubmit={handleJoin} className="flex flex-col gap-2">
                                                                                                                                                                                                                                <input
                                                                                                                                                                                                                                            type="text"
                                                                                                                                                                                                                                                        placeholder="Código de la sala (ej: ABC123)"
                                                                                                                                                                                                                                                                    value={roomInput}
                                                                                                                                                                                                                                                                                onChange={(e) => setRoomInput(e.target.value)}
                                                                                                                                                                                                                                                                                            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 text-sm"
                                                                                                                                                                                                                                                                                                      />
                                                                                                                                                                                                                                                                                                                <button
                                                                                                                                                                                                                                                                                                                            type="submit"
                                                                                                                                                                                                                                                                                                                                        className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-200 text-sm font-medium rounded-xl transition"
                                                                                                                                                                                                                                                                                                                                                  >
                                                                                                                                                                                                                                                                                                                                                              Entrar a la Sala
                                                                                                                                                                                                                                                                                                                                                                        </button>
                                                                                                                                                                                                                                                                                                                                                                                </form>
                                                                                                                                                                                                                                                                                                                                                                                      </div>
                                                                                                                                                                                                                                                                                                                                                                                          </main>
                                                                                                                                                                                                                                                                                                                                                                                            );
                                                                                                                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                                                                                                                            