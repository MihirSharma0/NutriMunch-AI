import React, { useState } from 'react';

const FAQ = () => {
    const faqs = [
        // Consultation
        { q: "How does the initial consultation work?", a: "Your first session is a deep dive into your medical history, dietary habits, and goals. We analyze any provided blood work and establish your baseline metrics." },
        { q: "Do I need to prepare anything before my first session?", a: "Yes, we ask you to complete a 3-day food diary and provide any recent lab results or medical diagnoses to ensure a comprehensive assessment." },
        { q: "Can I bring a family member to the consultation?", a: "Absolutely. Having a support system is crucial, and we welcome anyone who will be involved in your meal preparation." },
        // Meal Plans
        { q: "Are the meal plans rigid?", a: "Not at all. Our AI engine provides flexible alternatives for every meal, ensuring you never feel restricted while staying within your macro targets." },
        { q: "Do you accommodate vegan or vegetarian diets?", a: "Yes, our plans are entirely customized and can accommodate vegan, vegetarian, pescatarian, paleo, and autoimmune protocols." },
        { q: "How often do meal plans change?", a: "Meal plans adapt dynamically. As your biometrics change and you log your progress, the AI automatically suggests modifications to prevent plateaus." },
        { q: "What if I have food allergies?", a: "Allergies and intolerances are hard-coded into your profile. The system will never recommend ingredients that compromise your safety." },
        // Online Sessions
        { q: "How do online follow-ups work?", a: "Follow-ups are conducted via secure video calls. We review your logged data, discuss challenges, and adjust the protocol accordingly." },
        { q: "What if I miss a scheduled online session?", a: "We require 24-hour notice for cancellations. Missed sessions without notice may be forfeited depending on your specific package." },
        // Payments
        { q: "Is this covered by insurance?", a: "Many health insurance providers cover medical nutrition therapy. We provide superbills that you can submit for reimbursement." },
        { q: "Do you offer payment plans?", a: "Yes, we offer flexible monthly installment plans for our 12-week and 16-week comprehensive programs." },
        { q: "Can I cancel my subscription?", a: "You can cancel your month-to-month AI tracking subscription at any time. Specialized clinical programs have specific commitment periods." },
        // Results
        { q: "How long until I see results?", a: "While energy levels often improve within the first week, measurable body composition changes typically become visible between weeks 3 and 4." },
        { q: "Is the weight loss sustainable?", a: "Our primary goal is metabolic repair. By avoiding crash diets, the results you achieve are highly sustainable long-term." },
        { q: "What if I hit a plateau?", a: "Plateaus are normal. Our continuous tracking allows us to immediately identify stalls and implement strategic calorie cycling to break through them." },
        // Follow-ups
        { q: "How much access do I have to my nutritionist?", a: "Depending on your tier, you have either weekly scheduled check-ins or 24/7 asynchronous chat support with your dedicated clinician." },
        { q: "Do I have to track my food forever?", a: "No. Tracking is an educational tool. Our ultimate goal is to teach you intuitive eating based on the principles you learn during the program." },
        // Medical Conditions
        { q: "Can you help manage Type 2 Diabetes?", a: "Yes, we specialize in clinical nutrition for diabetes management, focusing on glycemic control through precise carbohydrate partitioning." },
        { q: "Do you treat eating disorders?", a: "While we support a healthy relationship with food, active eating disorders require a multidisciplinary psychiatric approach. We can work alongside your therapist." },
        { q: "How do you handle PCOS and hormonal imbalances?", a: "We utilize specific anti-inflammatory protocols and insulin-sensitizing macro ratios proven to alleviate PCOS symptoms and restore hormonal balance." }
    ];

    const [openIdx, setOpenIdx] = useState(null);

    return (
        <section className="py-16 sm:py-24 md:py-section-gap max-w-4xl mx-auto px-4 sm:px-8 relative z-20">
            <div className="text-center mb-16">
                <span className="text-[#a5d391] font-bold tracking-widest uppercase text-sm mb-4 block">Knowledge Base</span>
                <h2 className="font-hero-display text-4xl md:text-5xl font-bold text-white mb-6">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-4">
                {faqs.map((faq, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        <button 
                            className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-white/5 transition-colors"
                            onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                        >
                            <span className="text-white font-semibold pr-4">{faq.q}</span>
                            <span className={`material-symbols-outlined text-[#a5d391] transition-transform duration-300 ${openIdx === idx ? 'rotate-180' : ''}`}>
                                expand_more
                            </span>
                        </button>
                        <div className={`px-6 overflow-hidden transition-all duration-300 ${openIdx === idx ? 'max-h-96 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <p className="text-white/60 text-sm leading-relaxed">{faq.a}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default FAQ;
