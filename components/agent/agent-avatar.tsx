import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AgentAvatarProps {
  className?: string;
  avatar?: string; // Prop ini tetap dibiarkan agar tidak error di komponen lain yang memanggilnya, tapi kita akan mengabaikannya.
}

export function AgentAvatar({ className }: AgentAvatarProps) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        // Efek Cyberpunk Glow: Border ungu dengan bayangan neon cyan
        "ring-2 ring-[#a855f7] shadow-[0_0_15px_rgba(6,182,212,0.6)]",
        className
      )}
    >
      <Image
        src="/avatars/avatar-sensei.jpeg" // Pastikan letak dan nama file gambar Anda sesuai
        alt="Miyasensei"
        width={512}
        height={512}
        className="aspect-square h-full w-full object-cover"
        priority
      />
    </div>
  );
}