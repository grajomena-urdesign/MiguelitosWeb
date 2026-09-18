import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Miguelitos Ice Cream POS',description:'Products, checkout and inventory for Miguelitos Ice Cream.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg',apple:'/icon-192.png'},appleWebApp:{capable:true,title:'Miguelitos POS',statusBarStyle:'default'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
