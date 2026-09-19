import Pos from "./pos";
import { getPosUser } from "./pos-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getPosUser();

  if (!user) {
    redirect("/login?return_to=%2F");
  }

  return <Pos displayName={user.displayName} />;
}
