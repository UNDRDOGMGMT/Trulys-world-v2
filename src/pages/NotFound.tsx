import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import PageMeta from "@/components/PageMeta";
import Shape from "@/components/Shape";

const NotFound: React.FC = () => (
  <motion.main
    className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background grain-overlay text-center px-4"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <PageMeta title="Lost — TRULYS WORLD" />
    <Shape name="sparkle" size={70} rotate={-10} opacity={0.5} float />
    <h1 className="chrome-text-pink font-display text-5xl md:text-7xl">404</h1>
    <p className="font-whimsy text-pink-light text-lg">
      ✦ This room doesn't exist in her world ✦
    </p>
    <Link to="/map" className="btn-retro shimmer-sweep">
      ♥ Back to the Map
    </Link>
  </motion.main>
);

export default NotFound;
