import Image from 'next/image';
import Link from 'next/link';

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold" aria-label="باما">
      <Image src="/logo.png" alt="" width={size} height={size} priority />
      <span className="text-xl">باما</span>
    </Link>
  );
}
