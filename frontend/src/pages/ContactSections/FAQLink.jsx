import React from 'react';
import { Link } from 'react-router-dom';

const FAQLink = () => {
    return (
        <section className="py-12 max-w-4xl mx-auto px-4 sm:px-8 relative z-20">
            <div className="bg-gradient-to-r from-transparent via-white/5 to-transparent border-y border-white/10 py-12 px-4 text-center">
                <span className="material-symbols-outlined text-4xl text-primary mb-4">help</span>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Have a quick question?</h3>
                <p className="text-white/50 mb-6">Before reaching out, check if your question has already been answered by our automated knowledge base.</p>
                <Link to="/about" className="inline-block border border-primary text-primary px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-[#080b12] transition-colors">
                    Visit FAQ Section
                </Link>
            </div>
        </section>
    );
};

export default FAQLink;
