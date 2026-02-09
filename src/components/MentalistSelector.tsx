import { motion } from "framer-motion";
import { MENTALISTS, type Mentalist } from "../lib/mentalists";

interface MentalistSelectorProps {
  onSelect: (mentalistId: string) => void;
}

export default function MentalistSelector({ onSelect }: MentalistSelectorProps) {
  const mentalists = Object.values(MENTALISTS);

  return (
    <div className="min-h-screen bg-midnight flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-30%] left-[-20%] w-[70%] h-[70%] rounded-full blur-[120px] opacity-20"
          style={{
            background: "radial-gradient(ellipse, #2d1b4e 0%, transparent 70%)",
            animation: "nebula-drift 20s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-[-20%] right-[-15%] w-[60%] h-[60%] rounded-full blur-[100px] opacity-15"
          style={{
            background: "radial-gradient(ellipse, #1a1025 0%, transparent 70%)",
            animation: "nebula-drift 25s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center mb-12"
      >
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-3">
          Choose Your <span className="shimmer-text">Mentalist</span>
        </h1>
        <p className="text-ghost text-base sm:text-lg max-w-md mx-auto">
          Select a world-class mentalist to guide you through the mysteries of the mind
        </p>
      </motion.div>

      <div className="relative z-10 grid md:grid-cols-2 gap-6 max-w-4xl w-full">
        {mentalists.map((mentalist, index) => (
          <MentalistCard
            key={mentalist.id}
            mentalist={mentalist}
            onSelect={onSelect}
            delay={index * 0.2}
          />
        ))}
      </div>
    </div>
  );
}

function MentalistCard({
  mentalist,
  onSelect,
  delay,
}: {
  mentalist: Mentalist;
  onSelect: (id: string) => void;
  delay: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.03, y: -8 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(mentalist.id)}
      className="group relative bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-3xl p-8 text-left hover:border-white/20 transition-all overflow-hidden"
      style={{
        boxShadow: `0 20px 60px -10px ${mentalist.themeColor}15`,
      }}
    >
      {/* Hover glow effect */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${mentalist.themeColor}10 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10">
        {/* Avatar */}
        <div className="mb-6">
          <div
            className="w-24 h-24 rounded-full overflow-hidden ring-4 mx-auto mb-4 group-hover:ring-8 transition-all duration-300"
            style={{ ringColor: `${mentalist.themeColor}40` }}
          >
            <img
              src={mentalist.avatarUrl}
              alt={mentalist.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Name & Title */}
        <h2 className="font-display text-2xl font-bold text-white mb-1 text-center">
          {mentalist.name}
        </h2>
        <p
          className="text-sm font-medium mb-4 text-center"
          style={{ color: mentalist.themeColor }}
        >
          {mentalist.title}
        </p>

        {/* Tagline */}
        <p className="text-ghost text-sm leading-relaxed mb-6 text-center">
          {mentalist.tagline}
        </p>

        {/* CTA Button */}
        <div
          className="w-full py-3 rounded-xl font-medium text-sm transition-all text-center"
          style={{
            backgroundColor: `${mentalist.themeColor}20`,
            color: mentalist.themeColor,
            border: `1px solid ${mentalist.themeColor}30`,
          }}
        >
          Enter the Mind's Eye →
        </div>
      </div>
    </motion.button>
  );
}
