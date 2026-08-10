import { NavLink } from "react-router-dom";
import { Wallet, Gem } from "lucide-react";
import { cn } from "../../lib/utils";
import { motion } from "framer-motion";

export function BottomNav() {
  const navItems = [
    { path: "/", label: "Wallet", icon: Wallet },
    { path: "/rewards", label: "Rewards", icon: Gem },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 pointer-events-none">
      <div className="bg-[#1e1f29]/80 backdrop-blur-3xl border border-white/[0.05] rounded-full p-1.5 flex justify-center gap-1 items-center shadow-[0_8px_32px_rgba(0,0,0,0.3)] pointer-events-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "relative flex flex-col items-center justify-center w-[72px] h-[56px] rounded-full transition-all",
                isActive ? "text-white" : "text-white/50"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="active-nav-tab"
                    className="absolute inset-0 bg-[#353956] rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="flex flex-col items-center relative z-10 gap-1">
                  <item.icon className={cn("w-5 h-5", isActive ? "text-[#97a0ff]" : "text-white/50")} />
                  <span className={cn("text-[10px] font-medium", isActive ? "text-[#97a0ff]" : "text-white/50")}>
                    {item.label}
                  </span>
                </div>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
