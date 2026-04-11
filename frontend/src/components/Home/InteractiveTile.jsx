import { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export function InteractiveTile({ title, description, icon, gradient, link, features }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link to={link}>
      <motion.div
        className={`relative rounded-3xl p-8 cursor-pointer overflow-hidden ${gradient}`}
        initial={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <motion.div
          initial={{ height: '200px' }}
          animate={{ height: isHovered ? '350px' : '200px' }}
          transition={{ duration: 0.3 }}
          className="relative z-10"
        >
          <div className="flex items-start justify-between mb-4">
            <motion.div
              animate={{ scale: isHovered ? 1.2 : 1, rotate: isHovered ? 360 : 0 }}
              transition={{ duration: 0.5 }}
              className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white"
            >
              {icon}
            </motion.div>
            <Sparkles className="w-6 h-6 text-white/60" />
          </div>

          <h3 className="text-3xl font-bold text-white mb-3">{title}</h3>
          <p className="text-white/90 text-lg mb-4">{description}</p>

          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{
              opacity: isHovered ? 1 : 0,
              height: isHovered ? 'auto' : 0,
            }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 mt-4">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{
                    x: isHovered ? 0 : -20,
                    opacity: isHovered ? 1 : 0,
                  }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-2 text-white/90"
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  <span className="text-sm">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute inset-0 bg-white/10"
          animate={{
            scale: isHovered ? 1.5 : 1,
            opacity: isHovered ? 0.3 : 0,
          }}
          transition={{ duration: 0.5 }}
        />
      </motion.div>
    </Link>
  );
}

