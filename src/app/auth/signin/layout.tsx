import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Providers from "@/lib/providers";

export default async function Layout({ children }: { children: React.ReactNode }) {

  const session = await getServerSession(authOptions);

  return (
    <div>
      <Providers session={session}>
        {children}
      </Providers>
    </div>
  );
}

