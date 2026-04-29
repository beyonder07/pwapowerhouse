'use client';

export function HeroScene() {
  return (
    <div className="absolute inset-0 z-0">
      {/* Video/Image Background Placeholder */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-background" />
      
      {/* Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-black/50 to-transparent" />
    </div>
  );
}
