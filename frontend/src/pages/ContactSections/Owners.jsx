/**
 * Founding Team & Executive Leadership Section
 * Displays profiles, executive roles, and biographies of the founding leadership team.
 */
import React from 'react';

/** Founding leadership profiles and executive biographies. */
const OWNERS = [

    {
        name: 'Mihir Sharma',
        role: 'Founder & CEO',
        image: '/pending_avatar.png',
        accent: '#a5d391',
        bio: `The visionary behind NutriMunch AI, driving its mission, product direction, and overall growth. Focuses on transforming an innovative idea into a meaningful platform through strategic thinking, collaboration, and a passion for making personalized nutrition accessible to everyone.`,
        email: 'sharmamihir012@gmail.com',
        phone: '+91 90000 00001',
        location: 'Kolkata, India',
        linkedin: 'https://www.linkedin.com/in/mihir-sharma0/'
    },
    {
        name: 'Md Irfan',
        role: 'Co-Founder',
        image: '/owners/irfan.png',
        accent: '#38bdf8',
        bio: `A driving force behind NutriMunch AI, contributing to its vision, business strategy, and growth. Passionate about innovation and problem-solving, helping shape ideas into practical solutions that make smarter and healthier eating more accessible.`,
        email: 'mdi720408@gmail.com',
        phone: '+91 90000 00002',
        location: 'Bihar, India',
        linkedin: 'https://www.linkedin.com/in/md-irfan-6979303a6/'
    },
    {
        name: 'Himanshu Kumar',
        role: 'Co-Founder & CTO',
        image: '/pending_avatar.png',
        accent: '#fbbf24',
        bio: `The technology mind behind NutriMunch AI, leading its technical vision, development, and AI-driven innovation. Focuses on building intelligent nutrition tools, seamless user experiences, and reliable technology that brings the platform's vision to life.`,
        email: 'himanshu@gmail.com',
        phone: '+91 90000 00003',
        location: 'Hyderabad, India',
        linkedin: 'https://www.linkedin.com/in/example-himanshu'
    },
    {
        name: 'Raj Kumar Prasad',
        role: 'Co-Founder & COO',
        image: '/pending_avatar.png',
        accent: '#c084fc',
        bio: `Focused on turning NutriMunch AI's vision into action through operational planning, team coordination, and execution. Works towards creating a smooth user journey, strengthening collaboration, and ensuring every part of the platform delivers value.`,
        email: 'raj.kumar@gmail.com',
        phone: '+91 90000 00004',
        location: 'Chennai, India',
        linkedin: 'https://www.linkedin.com/in/example-raj'
    }

];

/**
 * Owners Component
 * Renders leadership team member cards with social profiles and bios.
 */
const Owners = () => {
    return (
        <section className="max-w-7xl mx-auto mt-20 relative z-20">
            <div className="text-center mb-10">
                <div className="inline-flex items-center gap-3 mb-4">
                    <span className="w-8 h-px bg-primary"></span>
                    <span className="font-label-caps text-label-caps text-primary uppercase font-bold tracking-widest">Meet the Owners</span>
                    <span className="w-8 h-px bg-primary"></span>
                </div>
                <h2 className="font-hero-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
                    The people behind <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#38bdf8] italic">NutriMunch</span>
                </h2>
                <p className="text-white/60 text-sm sm:text-base mt-3 max-w-2xl mx-auto">
                    Have a question the FAQ didn't answer? Reach out to the team directly.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {OWNERS.map((owner) => (
                    <article
                        key={owner.email}
                        className="group bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center hover:border-white/25 hover:bg-white/[0.07] transition-all"
                    >
                        <img
                            src={owner.image}
                            alt={`${owner.name}, ${owner.role}`}
                            width="112"
                            height="112"
                            loading="lazy"
                            className="w-28 h-28 rounded-full shadow-lg group-hover:scale-105 transition-transform"
                            style={{ boxShadow: `0 0 30px ${owner.accent}33` }}
                        />
                        <h3 className="mt-5 text-lg font-bold text-white">{owner.name}</h3>
                        <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: owner.accent }}>{owner.role}</p>
                        <p className="text-white/60 text-sm leading-relaxed mt-3 flex-1">{owner.bio}</p>

                        <div className="w-full mt-5 pt-5 border-t border-white/10 space-y-2.5 text-sm text-left">
                            <a href={`mailto:${owner.email}`} className="flex items-center gap-3 text-white/70 hover:text-white transition-colors break-all">
                                <span className="material-symbols-outlined text-lg shrink-0" style={{ color: owner.accent }}>mail</span>
                                {owner.email}
                            </a>
                            
                            <div className="flex items-center gap-3 text-white/70">
                                <span className="material-symbols-outlined text-lg shrink-0" style={{ color: owner.accent }}>location_on</span>
                                {owner.location}
                            </div>
                            <a href={owner.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white/70 hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-lg shrink-0" style={{ color: owner.accent }}>link</span>
                                LinkedIn profile
                            </a>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
};

export default Owners;
