export function MotorolaLogo() {
  return (
    <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center shadow-xs">
      <svg viewBox="0 0 64 64" className="w-12 h-12 text-white" fill="currentColor" aria-hidden="true">
        <path d="M32 6L17 50h5.4l5.2-15.6c1.2-3.6 2.8-5.2 4.4-5.2s3.2 1.6 4.4 5.2L41.6 50H47L32 6zm0 11.4l4.8 14.5c-1.2-2.2-2.8-3.5-4.8-3.5s-3.6 1.3-4.8 3.5L32 17.4z" />
      </svg>
    </div>
  );
}

export function VivoLogo() {
  return (
    <div className="w-20 h-20 rounded-2xl bg-[#415FFF] flex items-center justify-center shadow-xs">
      <span className="text-white font-bold tracking-tight text-2xl select-none">vivo</span>
    </div>
  );
}

export function XiaomiLogo() {
  return (
    <div className="w-20 h-20 rounded-2xl bg-[#FF6900] flex items-center justify-center shadow-xs">
      <svg viewBox="0 0 64 64" className="w-11 h-11 text-white" fill="currentColor" aria-hidden="true">
        <path d="M12 20h23c4.4 0 8 3.6 8 8v16h-7V28c0-1.1-.9-2-2-2H19v18h-7V20zm11 11h7v13h-7V31zm24-11h7v24h-7V20z" />
      </svg>
    </div>
  );
}

export function CustomBrandLogo({ name }: { name: string }) {
  return (
    <div className="w-20 h-20 rounded-2xl bg-neutral-900 flex items-center justify-center shadow-xs">
      <span className="text-white font-bold text-xl uppercase tracking-wider">
        {name.slice(0, 2)}
      </span>
    </div>
  );
}
