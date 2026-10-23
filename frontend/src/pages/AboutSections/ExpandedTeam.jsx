import React from 'react';

const ExpandedTeam = () => {
    const additionalMembers = [
        {
            name: "Dr. James Miller",
            role: "Head of Sports Nutrition",
            bio: "Former Olympic consultant focusing on endurance and peak athletic performance protocols.",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAW563tK2alaIdKa-cuEfnJW_382lfBQKNmuA-kMrz16M4r0j_X2E-NwzxGnDRl0tocPS3FptCrFu8YlmyZVNj3JFmfqOmLXYrG0ZwVT8uy224ZUKl3NEzQCmKUTO2msjUepTc_nVcKorAi6FUfm_iG51_uMfIOsUZ6jT5AARtHZZqyjyDau5TLry4qgYRmogxwX3RY3MnDdtrqs7kp4S-dvhaj0IMgdKyGytNOKy-15cE-Ml0DX-bU"
        },
        {
            name: "Anita Desai",
            role: "Clinical Nutritionist (Endocrinology)",
            bio: "Specializes in PCOS, thyroid disorders, and metabolic syndrome reversal.",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDZLrZKLb7jzMmFQ5c6qGbPfOriSTc2BC_huR3PJJqupenaW5lWxSI7_t5rEsctSs00W6MwL6qe-qHTKrEjUZAEjRruf0uHFev2ubNwTi4kWIBFgSVq9eO-2GXDO-gHwKpeCq41OZyuAkBa0fNoruRCpaRGqXAPY7wcb-m01KQ-q4hj5mEWx3oKu0Jdv0Iv-jfmt0C8yuj48YFkyamuApv5yVIztLtfvuR9f3xAvA3JU1uCRp1uckTy"
        }
    ];

    return (
        <section className="py-12 max-w-7xl mx-auto px-4 sm:px-8 relative z-20">
            <h2 className="font-hero-display text-2xl sm:text-3xl font-bold tracking-tight mb-12 text-center text-white/80">Extended Clinical Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
                {additionalMembers.map((person, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center hover:bg-white/10 transition-colors">
                        <img src={person.image} alt={person.name} className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover mb-6 border-4 border-white/10" />
                        <h4 className="text-2xl font-bold text-white mb-2">{person.name}</h4>
                        <div className="text-primary font-bold text-sm uppercase tracking-widest mb-4">{person.role}</div>
                        <p className="text-white/60">{person.bio}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ExpandedTeam;
