import React from 'react';
import { motion } from 'framer-motion';
import { TailwindConfig } from 'tailwind-config';
import 'tailwindcss/base.css';
import 'tailwindcss/components.css';
import 'tailwindcss/utilities.css';

const App = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-screen w-screen bg-gray-100"
    >
      <header className="bg-white py-4">
        <nav className="container mx-auto flex justify-between">
          <button className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded">
            Back
          </button>
          <button className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded">
            Share
          </button>
        </nav>
      </header>
      <main className="container mx-auto p-4 pt-6 md:p-6 lg:p-12 xl:p-24">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <article className="bg-white rounded-2xl shadow-md">
            <motion.div
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className="h-48 md:h-64 w-full bg-gray-200 rounded-t-2xl"
            >
              <img src="image.jpg" alt="Image" className="object-cover h-full w-full" />
            </motion.div>
            <div className="p-4">
              <h2 className="text-lg font-bold">Title</h2>
              <p className="text-sm">Description</p>
            </div>
          </article>
        </section>
      </main>
    </motion.div>
  );
};

export default App;