import Pos from './pos';
import { requireChatGPTUser } from './chatgpt-auth';
export const dynamic = 'force-dynamic';
export default async function Home(){const user=await requireChatGPTUser('/');return <Pos displayName={user.displayName}/>}
