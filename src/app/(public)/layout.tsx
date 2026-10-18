import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
