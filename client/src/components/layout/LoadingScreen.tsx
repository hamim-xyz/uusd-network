import React from "react";
import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(20px)" }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-[#13141a] to-[#0a0a0f] backdrop-blur-3xl"
    >
      <div className="relative flex flex-col items-center justify-center gap-10">
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-36 h-36 bg-[#8792FF]/20 rounded-full blur-[35px]"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-24 h-24 flex items-center justify-center"
          >
            <motion.img
              animate={{ y: [-4, 4, -4] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              src="https://i.ibb.co/k27sBd6Q/0x61a10e8556bed032ea176330e7f17d6a12a10000.png"
              alt="Logo"
              className="w-full h-full object-cover rounded-3xl filter drop-shadow-[0_4px_24px_rgba(135,146,255,0.3)]"
            />
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="flex items-center gap-1.5"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
              className="w-1.5 h-1.5 rounded-full bg-white/40"
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
