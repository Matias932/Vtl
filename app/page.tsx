"use client";

import { useState } from "react";

export default function HomePage() {
  const [roomInput, setRoomInput] = useState("");

    const handleCreateHost = () => {
        const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            window.location.href = `/?code=${newCode}&host=1&name=Anfitri%C3%B3n`;
              };

                const handleJoinGuest = (e: React.FormEvent) => {
                    e.preventDefault();
                        if (!roomInput.trim()) return;
                            const cleanCode = roomInput.trim().toUpperCase();
                                window.location.href = `/?code=${cleanCode}&host=0&name=Invitado`;
                                  };

                                    return (
                                        <main className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6 gap-6">
                                              <div className="text-center space-y-2">
                                                      <h1 className="text-3xl font-bold tracking-tight">Virtual Watch Room</h1>
                                                              <p className="text-zinc-400 text-sm">
                                                                        Crea una sala para ser Anfitrión o ingresa el código de una existente.
                                                                                </p>
                                                                                      </div>

                                                                                            <div className="flex flex-col w-full max-w-xs gap-4">
                                                                                                    {/* Crear como Anfitrión */}
                                                                                                            <button
                                                                                                                      type="button"
                                                                                                                                onClick={handleCreateHost}
                                                                                                                                          className="w-full text-center py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition shadow-lg active:scale-95 cursor-pointer"
                                                                                                                                                  >
                                                                                                                                                            Crear Sala como Anfitrión
                                                                                                                                                                    </button>

                                                                                                                                                                            <div className="relative flex py-1 items-center">
                                                                                                                                                                                      <div className="flex-grow border-t border-zinc-800"></div>
                                                                                                                                                                                                <span className="flex-shrink mx-4 text-zinc-500 text-xs">O ÚNETE</span>
                                                                                                                                                                                                          <div className="flex-grow border-t border-zinc-800"></div>
                                                                                                                                                                                                                  </div>

                                                                                                                                                                                                                          {/* Unirse como Invitado */}
                                                                                                                                                                                                                                  <form onSubmit={handleJoinGuest} className="flex flex-col gap-2">
                                                                                                                                                                                                                                            <input
                                                                                                                                                                                                                                                        type="text"
                                                                                                                                                                                                                                                                    placeholder="Código de la sala (ej: ABC123)"
                                                                                                                                                                                                                                                                                value={roomInput}
                                                                                                                                                                                                                                                                                            onChange={(e) => setRoomInput(e.target.value)}
                                                                                                                                                                                                                                                                                                        className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 text-sm"
                                                                                                                                                                                                                                                                                                                  />
                                                                                                                                                                                                                                                                                                                            <button
                                                                                                                                                                                                                                                                                                                                        type="submit"
                                                                                                                                                                                                                                                                                                                                                    className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-xl transition active:scale-95 cursor-pointer"
                                                                                                                                                                                                                                                                                                                                                              >
                                                                                                                                                                                                                                                                                                                                                                          Entrar a la Sala
                                                                                                                                                                                                                                                                                                                                                                                    </button>
                                                                                                                                                                                                                                                                                                                                                                                            </form>
                                                                                                                                                                                                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                                                                                                                                                                                                      </main>
                                                                                                                                                                                                                                                                                                                                                                                                        );
                                                                                                                                                                                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                                                                                                                                                                                        