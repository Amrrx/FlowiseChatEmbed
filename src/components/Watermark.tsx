export const Watermark = () => {
  return (
    <div class="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
      {/* Background glow effect */}
      <div class="absolute inset-0 bg-gradient-to-br from-blue-500/3 via-purple-500/3 to-cyan-500/3 blur-3xl" />

      {/* Afaqy Logo Watermark with effects */}
      <div class="relative flex items-center justify-center">
        {/* Glow layer behind logo */}
        <div
          class="absolute inset-0 blur-2xl"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15), transparent 70%)',
            animation: 'glowPulse 6s ease-in-out infinite',
          }}
        />

        {/* Main logo */}
        <img
          src="afaqy-logo.svg"
          alt="Afaqy"
          class="w-24 h-auto relative z-10"
          style={{
            opacity: '0.12',
            filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.3))',
            animation: 'logoFloat 8s ease-in-out infinite, logoFade 4s ease-in-out infinite',
          }}
        />

        {/* Subtle overlay glow */}
        <img
          src="afaqy-logo.svg"
          alt=""
          class="w-24 h-auto absolute top-0 left-0 z-0"
          style={{
            opacity: '0.05',
            filter: 'blur(8px) brightness(1.5)',
            animation: 'logoFloat 8s ease-in-out infinite reverse',
          }}
        />
      </div>

      {/* CSS Animation Styles */}
      <style>{`
        @keyframes logoFloat {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-10px) scale(1.02);
          }
        }

        @keyframes logoFade {
          0%, 100% {
            opacity: 0.08;
          }
          50% {
            opacity: 0.15;
          }
        }

        @keyframes glowPulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
};
