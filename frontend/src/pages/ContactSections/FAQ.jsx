import React, { useState } from 'react';

// Answers reflect how the platform currently works; update them when features change.
const FAQ_CATEGORIES = [
    {
        id: 'account',
        label: 'Account & Sign-in',
        icon: 'person',
        items: [
            {
                q: 'What is NutriMunch AI?',
                a: 'NutriMunch AI is a nutrition platform that combines AI tools (a diet plan generator and a food & barcode analyzer) with certified nutritionists who create diet plans and hold paid consultations. You can track water and food, view reports, and manage everything from your dashboard.'
            },
            {
                q: 'What types of accounts are there?',
                a: 'There are two account types you can register for: User (for people who want to improve their nutrition) and Nutritionist (for qualified professionals). Nutritionists also enter their credentials and specialization when signing up. Admin accounts are managed by the platform and cannot be created through registration.'
            },
            {
                q: 'How do I create an account?',
                a: 'Click Register, enter your first name, last name, email and a password (at least 6 characters), and choose User or Nutritionist. We then email you a 6-digit verification code. After verifying, a short 4-step setup asks for your age, height, weight, activity level, goal, diet type, budget, allergies and preferred cuisines.'
            },
            {
                q: "I didn't receive my verification code. What should I do?",
                a: 'Check your spam or promotions folder first. You can request a new code with "Resend OTP" after 60 seconds. Each code expires after 15 minutes, so always use the most recent one.'
            },
            {
                q: 'Can I sign in with Google?',
                a: 'Yes. Click "Continue with Google". The first time, you will be asked whether to continue as a User or as a Nutritionist (nutritionists add their specialization), and then you complete the same profile setup.'
            },
            {
                q: 'I forgot my password. How do I reset it?',
                a: 'On the login page click "Forgot Password?" and enter the email address you registered with. A reset link is sent only to that registered email and is valid for 1 hour. Open the link, set your new password and log in.'
            },
            {
                q: 'Which pages can I use without an account?',
                a: 'Home, Platform Roles, Testimonials and this Help page are public. Everything else (Profile, AI tools, Diet Plans, Progress, Reports, Appointments and Transactions) requires you to log in. If you open one of those links while logged out, you will be asked to log in and then taken back to that page.'
            },
            {
                q: 'Can I change my password or delete my account from the app?',
                a: 'There is no "change password" screen yet; use "Forgot Password?" on the login page to set a new one. Deleting your own account is not available from the dashboard at the moment.'
            }
        ]
    },
    {
        id: 'profile',
        label: 'Profile & Targets',
        icon: 'tune',
        items: [
            {
                q: 'What information does my profile store?',
                a: 'Your name, age, gender, height and weight (metric or imperial), activity level, goal (Weight Loss, Muscle Gain, Maintenance, Performance or General Health), diet type, allergies (plus any custom allergy tags), preferred cuisines, favourite and disliked foods, lifestyle class and meal budget.'
            },
            {
                q: 'Which daily targets can I set on my profile?',
                a: 'Your Profile shows four daily targets: Calories (kcal), Protein (g), Fat (g) and a Sugar limit (g). Click "Edit Requirements" to change them, or "Default Baseline" to reset to 2000 kcal, 140 g protein, 65 g fat and 50 g sugar. The Progress page additionally lets you track water and other nutrients.'
            },
            {
                q: 'How are my calorie and macro targets calculated?',
                a: 'When you first set up your profile, we estimate your BMR with the Mifflin-St Jeor formula, multiply it by your activity level to get your daily energy needs (TDEE), and adjust for your goal (for example -500 kcal for weight loss, +500 kcal for muscle gain). Once you edit and save targets yourself, they are treated as custom and will not change automatically, so update them if your weight or goal changes.'
            },
            {
                q: 'What diet types and allergies are supported?',
                a: 'Diet types: Vegetarian, Non-Vegetarian, Vegan, Eggetarian, Pescatarian, Keto and Paleo. Allergens: Nuts & Peanuts, Dairy, Gluten & Wheat, Soy, Eggs, Shellfish, Fish, Sesame and Sulfites, and you can add your own custom allergy tags.'
            }
        ]
    },
    {
        id: 'ai',
        label: 'AI Tools',
        icon: 'auto_awesome',
        items: [
            {

            },
            {
                q: 'Does the AI Diet Plan Generator use my profile?',
                a: 'No. It only uses the goals and restrictions you select on the generator page, so always select your allergies and diet requirements there before generating.'
            },
            {
                q: 'What does the AI Food Analyzer do?',
                a: 'Upload a food photo, paste an image link, or scan or type a product barcode. The analyzer gives a Safe / Caution / Avoid verdict, flags allergens (your profile allergies are pre-filled), lists additives with risk levels, shows nutrition facts and diet compatibility, and suggests healthier alternatives. Results are shown on screen and are not saved to your food log.'
            },
            {
                q: 'Are AI results guaranteed to be safe for my allergies?',
                a: 'No. The AI is instructed to avoid the allergens you select, but it can make mistakes. Always read the ingredients yourself and consult a nutritionist or doctor if you have a serious allergy or medical condition.'
            },
            {
                q: 'Do the AI tools cost anything?',
                a: 'No. The AI Diet Plan Generator and the AI Food Analyzer are included with your account at no charge.'
            }
        ]
    },
    {
        id: 'plans',
        label: 'Diet Plans',
        icon: 'restaurant_menu',
        items: [
            {
                q: 'What kinds of diet plans will I see?',
                a: 'General Protocols are published by nutritionists for all users. "Exclusive for You" plans are written by a nutritionist specifically for you. Plans you save from the AI Diet Plan Generator also appear here, and you can delete those yourself.'
            },
            {
                q: 'What does "Import Requirements" do?',
                a: "It replaces your current daily targets (calories, protein, carbs, fats, water, fiber and key vitamins and minerals) with the plan's targets, after you confirm. Your profile and progress tracking then use the new values."
            },
            {
                q: 'Can I hide plans that contain my allergens?',
                a: 'Yes. Use the "Avoid Allergens" chips and the Diet filter above the plan list, or click "Use My Profile" to apply your saved allergies and diet type. The filter checks plan names, meals and ingredients by keyword, so it is a helpful guide rather than a guarantee. It is not applied automatically.'
            }
        ]
    },
    {
        id: 'tracking',
        label: 'Tracking & Reports',
        icon: 'monitoring',
        items: [
            {
                q: 'How do I log water and food?',
                a: 'Open Progress. Add water with quick buttons (250 ml to 1 L) or a custom amount, and log food by searching our food database (including common Indian dishes such as roti, paratha and naan), choosing a serving size and meal (Breakfast, Lunch, Dinner or Snack). You can also log for past dates.'
            },
            {
                q: 'Will my logs appear on another phone or browser?',
                a: "Your individual water and food entries are saved in the browser you used to log them; only the day's calorie total and notes are saved to your account. Logging from a different device or browser, or clearing your browser data, means those detailed entries will not be available there."
            },
            {
                q: 'Can I track my weight over time?',
                a: 'Weight is stored on your Profile. Update it there whenever it changes; separate day-by-day weight logging is not available yet.'
            },
            {
                q: 'How do I download a health report?',
                a: 'Open Reports, choose a period (Today, Daily, Weekly, Monthly, Quarterly or Yearly) and click "Download Health Report". A printable report opens; choose "Save as PDF" in the print dialog. If pop-ups are blocked, the report downloads as an HTML file instead.'
            }
        ]
    },
    {
        id: 'appointments',
        label: 'Appointments',
        icon: 'calendar_month',
        items: [
            {
                q: 'How do I book a consultation?',
                a: "Go to Appointments, choose a nutritionist (you can see their credentials, specialization, experience and fee), pick a topic, a date, a time slot (09:00, 11:00, 14:00, 16:00 or 17:30) and a session type, then confirm. The fee is paid from your NutriMunch wallet. The nutritionist then approves or declines your request."
            },
            {
                q: 'What happens to my money when I book?',
                a: "The consultation fee is deducted from your wallet and held safely (in escrow). When the nutritionist confirms the session, the money is released to them. If the nutritionist declines your request, the full amount is returned to your wallet."
            },
            {
                q: 'Can I cancel an appointment and get a refund?',
                a: 'Before the nutritionist confirms: yes, you can cancel and the full amount is refunded to your wallet automatically. After the nutritionist has confirmed: you can only send a cancellation request; if the nutritionist approves it the session is cancelled, but the money is not refunded.'
            },
            {
                q: 'Are consultations held over video?',
                a: 'Not yet. The Virtual Room for video consultations is planned for a future release. For now you can message your nutritionist using Nutritionist Chat.'
            },
            {
                q: 'How do I message a nutritionist?',
                a: 'Open Diet Plans and click "Nutritionist Chat". Chat is text-only. Replies depend on the nutritionist being online; there is no guaranteed response time.'
            },
            {
                q: 'How do I know a nutritionist is verified?',
                a: 'Nutritionists submit their credentials and license details, and the NutriMunch admin team reviews them. Nutritionists still under review show a "Pending Approval" badge, so look for verified nutritionists when booking.'
            }
        ]
    },
    {
        id: 'wallet',
        label: 'Wallet & Payments',
        icon: 'account_balance_wallet',
        items: [
            {
                q: 'How do I add money to my wallet?',
                a: 'Wallet credits are added by the NutriMunch admin team. Adding money yourself from your dashboard is not available yet.'
            },
            {
                q: 'What currency is used?',
                a: 'All prices, fees and wallet balances are in Indian Rupees (₹).'
            },
            {
                q: "What if my wallet balance is too low to book?",
                a: 'The booking is blocked and nothing is deducted from your wallet. Once your balance covers the fee, you can book again.'
            },
            {
                q: 'Where can I see my payments and refunds?',
                a: 'Open Transactions. It shows your current balance and every credit, held (escrow) payment, release and refund, with filters by type and status. Your balance updates live.'
            },
            {
                q: 'Are there subscriptions, packages or instalment plans?',
                a: 'No. There are no subscriptions or packages; you only pay the fee for each consultation you book. The AI tools are free to use.'
            },
            {
                q: 'I am a nutritionist. When do I receive my fee?',
                a: 'The fee is credited to your wallet as soon as you confirm the booking. Withdrawing your balance to a bank account is not available yet.'
            }
        ]
    },
    {
        id: 'nutritionists',
        label: 'For Nutritionists',
        icon: 'badge',
        items: [
            {
                q: 'How do I get verified as a nutritionist?',
                a: 'Register as a Nutritionist with your credentials and specialization, then complete your nutritionist profile (license number, experience, consultation fee, languages, availability and bio). The admin team reviews your details; until then your profile shows "Pending Approval".'
            },
            {
                q: 'How do I create and send diet plans?',
                a: "Use the Diet Plan Builder. Build meals and targets yourself or start from a client's profile targets, then publish the plan as General (visible to all users) or Exclusive (sent to one client). You can view, re-send or delete plans from your plan history."
            },
            {
                q: 'How do I manage appointment requests?',
                a: 'Open your Schedule. You can approve or deny new requests, and approve or decline cancellation requests. Approving a cancellation of a confirmed session does not refund the client.'
            }
        ]
    },
    {
        id: 'safety',
        label: 'Safety & Privacy',
        icon: 'shield',
        items: [
            {
                q: 'Is NutriMunch a substitute for medical advice?',
                a: 'No. NutriMunch provides nutrition guidance only. If you have a medical condition, are pregnant, or take medication, consult your doctor before changing your diet. In an emergency or a severe allergic reaction, call 112 (India) or your local emergency number immediately.'
            },
            {
                q: 'Who can see my profile information?',
                a: 'Nutritionists on the platform can view user profiles (including goals, body measurements, diet type and allergies) so they can prepare suitable diet plans. Admins can view and manage accounts. Your detailed water and food logs stay in your browser.'
            },
            {
                q: 'What notifications will I receive?',
                a: 'In-app notifications (the bell icon) for chat messages, new or exclusive diet plans, instructions from nutritionists and wallet updates. Emails are only sent for account verification and password resets.'
            }
        ]
    }
];

const FAQ = () => {
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [search, setSearch] = useState('');
    const [openKey, setOpenKey] = useState(null);

    const query = search.trim().toLowerCase();
    const visibleCategories = FAQ_CATEGORIES
        .filter(cat => activeCategory === 'ALL' || cat.id === activeCategory)
        .map(cat => ({
            ...cat,
            items: cat.items.filter(item => !query || item.q.toLowerCase().includes(query) || item.a.toLowerCase().includes(query))
        }))
        .filter(cat => cat.items.length > 0);

    return (
        <section className="max-w-4xl mx-auto relative z-20">
            {/* Search */}
            <div className="relative mb-6">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40">search</span>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search questions, e.g. refund, password, allergies..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#a5d391]/50 transition-colors"
                />
            </div>

            {/* Category chips */}
            <div className="flex flex-wrap gap-2 mb-10">
                {[{ id: 'ALL', label: 'All Topics', icon: 'apps' }, ...FAQ_CATEGORIES].map(cat => (
                    <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            activeCategory === cat.id
                                ? 'bg-[#a5d391] text-black border-[#a5d391]'
                                : 'bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                        {cat.label}
                    </button>
                ))}
            </div>

            {visibleCategories.length === 0 && (
                <div className="text-center py-12 text-white/50 text-sm">
                    No questions match "{search}". Try a different word.
                </div>
            )}

            <div className="space-y-10">
                {visibleCategories.map(cat => (
                    <div key={cat.id}>
                        <h3 className="flex items-center gap-2 text-[#a5d391] font-bold uppercase tracking-widest text-xs mb-4">
                            <span className="material-symbols-outlined text-base">{cat.icon}</span>
                            {cat.label}
                        </h3>
                        <div className="space-y-3">
                            {cat.items.map(item => {
                                const key = `${cat.id}-${item.q}`;
                                const isOpen = openKey === key;
                                return (
                                    <div key={key} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                                        <button
                                            type="button"
                                            aria-expanded={isOpen}
                                            className="w-full px-6 py-5 text-left flex justify-between items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer"
                                            onClick={() => setOpenKey(isOpen ? null : key)}
                                        >
                                            <span className="text-white font-semibold">{item.q}</span>
                                            <span className={`material-symbols-outlined text-[#a5d391] shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                                                expand_more
                                            </span>
                                        </button>
                                        {isOpen && (
                                            <div className="px-6 pb-5">
                                                <p className="text-white/60 text-sm leading-relaxed">{item.a}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default FAQ;
