export const Watermark = () => {
  return (
    <div class="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
      {/* Background glow effect */}
      <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-cyan-500/5 blur-3xl"></div>
      
      {/* Main watermark container */}
      <div class="relative flex items-center justify-center">
        <svg
          width="280"
          height="80"
          viewBox="0 0 280 80"
          class="overflow-visible"
        >
          {/* SVG Filters for glow effect */}
          <defs>
            <filter id="watermark-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            
            {/* Gradient for laser effect */}
            <linearGradient id="laserGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.8" />
              <stop offset="33%" style="stop-color:#8b5cf6;stop-opacity:1" />
              <stop offset="66%" style="stop-color:#06b6d4;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0.8" />
            </linearGradient>
            
            {/* Animation pattern */}
            <animate id="laserAnimation" begin="0s" dur="15s" repeatCount="indefinite" />
          </defs>
          
          {/* Animated text with laser drawing effect */}
          <text
            x="140"
            y="45"
            text-anchor="middle"
            font-family="Arial, sans-serif"
            font-size="22"
            font-weight="bold"
            fill="none"
            stroke="url(#laserGradient)"
            stroke-width="2"
            opacity="0.15"
            filter="url(#watermark-glow)"
            style={{
              'stroke-dasharray': '500',
              'stroke-dashoffset': '500',
              animation: 'laserDraw 15s ease-in-out infinite'
            }}
          >
            AFAQY AI
          </text>
          
          {/* Additional glow layer */}
          <text
            x="140"
            y="45"
            text-anchor="middle"
            font-family="Arial, sans-serif"
            font-size="22"
            font-weight="bold"
            fill="url(#laserGradient)"
            opacity="0.08"
            style={{
              animation: 'pulse 4s ease-in-out infinite 2s'
            }}
          >
            AFAQY AI
          </text>
        </svg>
      </div>
      
      {/* CSS Animation Styles */}
      <style>{`
        @keyframes laserDraw {
          0% {
            stroke-dashoffset: 500;
            opacity: 0.05;
          }
          15% {
            opacity: 0.15;
          }
          50% {
            stroke-dashoffset: 0;
            opacity: 0.15;
          }
          85% {
            opacity: 0.15;
          }
          100% {
            stroke-dashoffset: -500;
            opacity: 0.05;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.03;
          }
          50% {
            opacity: 0.12;
          }
        }
      `}</style>
    </div>
  );
};