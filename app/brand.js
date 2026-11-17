import Image from 'next/image';
import Link from 'next/link';

export default function Brand({ href = '/' }) {
  return (
    <Link className="brand" href={href}>
      <Image src="/educationunite-teal.svg" alt="" width={36} height={36} unoptimized />
      <span>Education<span className="brand-unite">Unite</span></span>
    </Link>
  );
}
