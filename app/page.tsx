impapp/page.tsxort { RoomShell } from "@/component

export default async function RoomPage({
  params,
    searchParams,
    }: {
      params: Promise<{ code: string }>;
        searchParams: Promise<{ name?: string; host?: string }>;
        }) {
          const { code } = await params;
            const { name, host } = await searchParams;
            
              return (
                  <RoomShell
                        code={code?.toUpperCase()}
                              name={name?.trim() || "Invitado"}
                                    isHost={host === "1"}
                                        />
                                          );
                                          }