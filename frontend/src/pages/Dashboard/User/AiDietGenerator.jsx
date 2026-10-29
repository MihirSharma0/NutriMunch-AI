/**
 * AI Autonomous Diet Generator
 * Leverages Gemini AI to generate custom 7-day meal plans calibrated to user calorie targets,
 * macronutrient splits, health goals, and allergen restrictions.
 */
import React, { useState, useRef, useEffect } from 'react';
import api from '../../../api/axios';

/* ─── Predefined Tag Pools ─────────────────────────────────────────── */
const PREDEFINED_GOALS = [
  'Weight Loss', 'Weight Gain', 'Muscle Gain', 'Fat Loss', 'Healthy Eating',
  'Balanced Nutrition', 'High-Protein Diet', 'Weight Maintenance',
  'Improved Digestion', 'Athletic Performance', 'Lean Bulk', 'Cutting Phase',
  'Endurance Training', 'Energy Boost', 'Anti-Aging Nutrition', 'Detox & Cleanse',
  'Heart Health', 'Bone Strength', 'Hormonal Balance', 'Stress & Mood Support',
];

const PREDEFINED_RESTRICTIONS = [
  'Peanuts', 'Tree Nuts', 'Milk / Dairy', 'Eggs', 'Soy', 'Wheat / Gluten',
  'Fish', 'Shellfish', 'Sesame', 'Vegetarian',
];

/* ─── SVG Icon helpers (no external font needed) ───────────────────── */
const renderIconPath = (name) => {
  switch (name) {
    case 'flag':
      return <path d="M14.4 6 14 4H5v17h2v-7h5.6l.4 2h7V6z" />;
    case 'no_food':
      return (
        <>
          <path d="M1.41 1.69 0 3.1l3 3V19c0 1.1.9 2 2 2h12c.34 0 .65-.1.93-.24l1.97 1.97 1.41-1.41L1.41 1.69zM5 19V8.1l9.13 9.13c-.04.25-.13.77-.13.77H5zM15.73 6 15 2H6l.37 2H4L1 1 0 3l3.27 3H2v2h1.27l1.46 1.46L6 13h.09L8 15H8v4h3v-4h1l.59-.59L15.17 17H17V6h-1.27z" />
        </>
      );
    case 'search':
      return <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />;
    case 'add_circle':
      return <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />;
    case 'add':
      return <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />;
    case 'close':
      return <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />;
    case 'warning':
      return <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />;
    case 'auto_awesome':
      return <path d="m19 9 1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" />;
    case 'autorenew':
      return <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z" />;
    case 'check_circle':
      return <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />;
    case 'cancel':
      return <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />;
    case 'receipt_long':
      return <path d="M19.5 3.5 18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5zM19 19.09H5V4.91h14v14.18zM6 15h12v2H6zm0-4h12v2H6zm0-4h12v2H6z" />;
    case 'content_copy':
      return <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />;
    case 'restaurant_menu':
      return <path d="M18 2.01 6 2c-1.1 0-2 .89-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.11-.9-1.99-2-1.99zM9 19H7v-5H5v-5c0-1.65 1.35-3 3-3s3 1.35 3 3v5h-2v5zm5 0h-2V5h5v2h-3v2h3v2h-3z" />;
    case 'save':
      return <path d="M17 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM6 5h9v4H6V5z" />;
    case 'sync_alt':
      return <path d="m3 7 4-4 4 4H8v6H6V7H3zm18 10-4 4-4-4h3v-6h2v6h3z" />;
    default:
      return <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />;
  }
};

const Icon = ({ name, size = 18, style = {} }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" height={size} width={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, ...style }}>
      {renderIconPath(name)}
    </svg>
  );
};

/* ─── TagInput Component ────────────────────────────────────────────── */
const TagInput = ({
  label,
  iconName,
  accentColor,
  predefined,
  selected,
  onSelect,
  onRemove,
}) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const dropRef = useRef(null);

  const filtered = predefined.filter(
    t => t.toLowerCase().includes(search.toLowerCase()) && !selected.includes(t)
  );

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (tag) => {
    onSelect(tag);
    setSearch('');
    setOpen(false);
  };

  return (
    <div className="aidg-field">
      <label className="aidg-label" style={{ color: accentColor }}>
        <Icon name={iconName} size={18} />
        {label}
      </label>

      {selected.length > 0 && (
        <div className="aidg-tags-row">
          {selected.map(tag => (
            <span key={tag} className="aidg-tag" style={{ borderColor: `${accentColor}55`, background: `${accentColor}18`, color: accentColor }}>
              {tag}
              <button className="aidg-tag-remove" onClick={() => onRemove(tag)} type="button" style={{ color: `${accentColor}99` }}>
                <Icon name="close" size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search predefined dropdown */}
      <div className="aidg-search-wrap" ref={dropRef}>
        <span className="aidg-search-icon"><Icon name="search" size={17} /></span>
        <input
          className="aidg-search-input"
          placeholder={`Search ${label.toLowerCase()}…`}
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {open && filtered.length > 0 && (
          <div className="aidg-dropdown">
            {filtered.map(tag => (
              <button key={tag} className="aidg-dropdown-item" type="button" onClick={() => handleSelect(tag)}>
                <Icon name="add_circle" size={16} style={{ color: accentColor }} />
                {tag}
              </button>
            ))}
          </div>
        )}
        {open && filtered.length === 0 && search.length > 0 && (
          <div className="aidg-dropdown">
            <div className="aidg-dropdown-empty">
              No matching {label.toLowerCase()} found
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Plan Renderer ─────────────────────────────────────────────────── */
const PlanDisplay = ({ plan, planData }) => {
  if (planData) {
    return (
      <div className="aidg-plan-body">
        <div className="aidg-plan-section">
          <h3 className="aidg-plan-section-title">Daily Macro &amp; Nutritional Targets</h3>
          <div className="aidg-target-summary">
            <span><b>{planData.targets.calories}</b> kcal</span>
            <span><b>{planData.targets.protein}g</b> protein</span>
            <span><b>{planData.targets.carbs}g</b> carbs</span>
            <span><b>{planData.targets.fats}g</b> fats</span>
            <span><b>{planData.targets.waterLiters}L</b> water</span>
            <span><b>{planData.targets.fiber}g</b> fiber</span>
            <span><b>{planData.targets.iron}mg</b> iron</span>
          </div>
        </div>
        <div className="aidg-plan-section">
          <h3 className="aidg-plan-section-title">Nutritionist Clinical Notes &amp; Formulation Comments</h3>
          <pre className="aidg-plan-pre">{planData.nutritionistNotes}</pre>
        </div>
        <div className="aidg-plan-section">
          <h3 className="aidg-plan-section-title">Daily Meal Schedule &amp; Formulation</h3>
          <div className="aidg-meal-list">
            {planData.meals.map((meal, index) => (
              <div className="aidg-meal-row" key={`${meal.name}-${index}`}>
                <div>
                  <strong>{index + 1}. {meal.mealType || meal.name}</strong>
                  <span>{meal.time} • {meal.name}</span>
                  <small>{meal.ingredients}</small>
                </div>
                <div className="aidg-meal-macros">
                  <b>{meal.calories} kcal</b>
                  <span>{meal.protein}P / {meal.carbs}C / {meal.fats}F</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="aidg-plan-section">
          <h3 className="aidg-plan-section-title">Clinical Allergy Safeguards &amp; Additional Guidance</h3>
          <pre className="aidg-plan-pre">{planData.planText}</pre>
        </div>
      </div>
    );
  }
  const sections = plan.split(/\n(?=#+\s|\*\*[A-Z])/).filter(Boolean);
  if (sections.length <= 1) {
    // Fallback: split by double newlines
    const paras = plan.split(/\n\n+/).filter(Boolean);
    return (
      <div className="aidg-plan-body">
        {paras.map((para, i) => (
          <div key={i} className="aidg-plan-section">
            <pre className="aidg-plan-pre">{para.trim()}</pre>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="aidg-plan-body">
      {sections.map((sec, i) => {
        const lines = sec.trim().split('\n');
        const rawHeader = lines[0].replace(/^#+\s*/, '').replace(/\*\*/g, '');
        const rest = lines.slice(1).join('\n');
        return (
          <div key={i} className="aidg-plan-section">
            {rawHeader && <h3 className="aidg-plan-section-title">{rawHeader}</h3>}
            <pre className="aidg-plan-pre">{rest || (lines.length === 1 ? rawHeader : '')}</pre>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Main ──────────────────────────────────────────────────────────── */
/**
 * AiDietGenerator Component
 * Parameterized generator interface for generating, inspecting, and deploying AI-crafted diet plans.
 */
const AiDietGenerator = () => {
  const [selectedGoals, setSelectedGoals] = useState([]);

  const [selectedRestrictions, setSelectedRestrictions] = useState([]);

  const [planHeading, setPlanHeading] = useState('');
  const [plan, setPlan] = useState('');
  const [planData, setPlanData] = useState(null);
  const [planTargets, setPlanTargets] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const addTag = (list, setList, tag) => {
    if (tag && !list.includes(tag)) setList(prev => [...prev, tag]);
  };
  const removeTag = (list, setList, tag) => setList(list.filter(t => t !== tag));

  const extractTarget = (text, labels, fallback) => {
    const labelPattern = labels.join('|');
    const match = text.match(new RegExp(`(?:${labelPattern})[^\\d]*(\\d+(?:\\.\\d+)?)`, 'i'));
    return match ? Number(match[1]) : fallback;
  };

  const getPlanTargets = (text) => ({
    calories: Math.round(extractTarget(text, ['Daily Energy Intake', 'Calories'], 2000)),
    protein: Math.round(extractTarget(text, ['Protein'], 120)),
    carbs: Math.round(extractTarget(text, ['Carbohydrates', 'Carbs'], 200)),
    fats: Math.round(extractTarget(text, ['Healthy Dietary Fats', 'Fats', 'Fat'], 65)),
    water: extractTarget(text, ['Minimum', 'Daily Water', 'Water'], 2.5)
  });

  const parsePlanResponse = (text) => {
    try {
      const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed?.targets && Array.isArray(parsed.meals)) {
        return {
          ...parsed,
          targets: {
            calories: Number(parsed.targets.calories || 2000),
            protein: Number(parsed.targets.protein || 120),
            carbs: Number(parsed.targets.carbs || 200),
            fats: Number(parsed.targets.fats || 65),
            waterLiters: Number(parsed.targets.waterLiters || 2.5),
            fiber: Number(parsed.targets.fiber || 28),
            iron: Number(parsed.targets.iron || 18),
            calcium: Number(parsed.targets.calcium || 1000),
            vitD: Number(parsed.targets.vitD || 15),
            vitC: Number(parsed.targets.vitC || 90)
          },
          meals: parsed.meals.map((meal, index) => ({
            id: index + 1,
            ...meal,
            calories: Number(meal.calories || 0),
            protein: Number(meal.protein || 0),
            carbs: Number(meal.carbs || 0),
            fats: Number(meal.fats || 0)
          }))
        };
      }
    } catch (e) {
      // Deterministic fallback plans are markdown and are normalized below.
    }
    const targets = getPlanTargets(text);
    return {
      title: `AI ${selectedGoals.join(' & ')} Protocol`,
      dietType: 'AI Personalized Nutrition Protocol',
      targets: { ...targets, waterLiters: targets.water, fiber: 28, iron: 18, calcium: 1000, vitD: 15, vitC: 90 },
      nutritionistNotes: 'Follow the scheduled meal timings and maintain the recommended hydration intake.',
      meals: createNutritionistFormatMeals(text, targets),
      planText: text
    };
  };

  const createNutritionistFormatMeals = (text, targets) => {
    const headings = [...text.matchAll(/^###\s+(.+)$/gm)];
    const mealHeadings = headings
      .map((match, sourceIndex) => ({ match, sourceIndex }))
      .filter(({ match: [, heading] }) =>
        /(early morning|breakfast|booster|lunch|evening|dinner|bedtime)/i.test(heading)
      );
    const shares = [0.08, 0.22, 0.12, 0.25, 0.12, 0.17, 0.04];
    return mealHeadings.map(({ match: [fullMatch, heading], sourceIndex }, index) => {
      const start = fullMatch.length + text.indexOf(fullMatch);
      const nextHeading = headings[sourceIndex + 1];
      const end = nextHeading ? text.indexOf(nextHeading[0], start) : text.length;
      const ingredients = text.slice(start, end).replace(/\n+/g, ' ').replace(/[-*]/g, '').trim();
      const timing = heading.match(/\(([^)]+)\)/)?.[1] || 'Scheduled';
      const mealType = heading.replace(/\s*\([^)]*\)/, '').replace(/[^\w\s&-]/g, '').trim();
      const share = shares[index] || 1 / Math.max(mealHeadings.length, 1);
      return {
        id: index + 1,
        time: timing,
        name: mealType,
        mealType,
        ingredients: ingredients || 'Personalized meal recommendations',
        calories: Math.round(targets.calories * share),
        protein: Math.round(targets.protein * share),
        carbs: Math.round(targets.carbs * share),
        fats: Math.round(targets.fats * share)
      };
    });
  };

  const generatePlan = async (e) => {
    e.preventDefault();
    if (selectedGoals.length === 0) { setError('Please select at least one health goal.'); return; }
    setError('');
    setLoading(true);
    setPlan('');
    try {
      const { data } = await api.post('/ai/diet-plan', {
        goals: selectedGoals,
        allergies: selectedRestrictions,
      });
      const generatedPlan = data.plan || '';
      setPlan(generatedPlan || 'No plan returned. Please try again.');
      const structuredPlan = parsePlanResponse(generatedPlan);
      setPlanData(structuredPlan);
      setPlanTargets({
        calories: structuredPlan.targets.calories,
        protein: structuredPlan.targets.protein,
        carbs: structuredPlan.targets.carbs,
        fats: structuredPlan.targets.fats,
        water: structuredPlan.targets.waterLiters,
        fiber: structuredPlan.targets.fiber,
        iron: structuredPlan.targets.iron,
        calcium: structuredPlan.targets.calcium,
        vitD: structuredPlan.targets.vitD,
        vitC: structuredPlan.targets.vitC
      });
      setSaved(false);
    } catch (requestError) {
      const backendMessage = requestError?.response?.data?.message;
      setError(backendMessage || 'Failed to generate the diet plan. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async () => {
    if (!plan || !planTargets) return;
    const heading = planHeading.trim();
    if (!heading) {
      setError('Enter a personalized heading before saving this diet plan.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/diet-plans/me/save-ai', {
        generatedDate: new Date().toISOString().slice(0, 10),
        totalCalories: planTargets.calories,
        proteinG: planTargets.protein,
        carbsG: planTargets.carbs,
        fatG: planTargets.fats,
        waterTargetLiters: planTargets.water,
        mealsJson: JSON.stringify({
          source: 'AI_DIET_GENERATOR',
          title: heading,
          dietType: planData.dietType,
          goals: selectedGoals,
          allergies: selectedRestrictions,
          nutritionistNotes: planData.nutritionistNotes,
          targets: planData.targets,
          meals: planData.meals,
          planText: planData.planText
        })
      });
      setSaved(true);
    } catch (requestError) {
      const responseData = requestError?.response?.data;
      const backendMessage = responseData?.message || responseData?.error;
      setError(requestError?.response?.status === 401
        ? 'Please sign in to save this diet plan.'
        : backendMessage || 'Could not save this diet plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const importTargetValues = async (targets) => {
    if (!targets) return;
    setImporting(true);
    setError('');
    const payload = {
      isCustomTargets: true,
      dailyCaloriesTarget: targets.calories,
      proteinTarget: targets.protein,
      carbsTarget: targets.carbs,
      fatsTarget: targets.fats,
      dailyWaterTargetLiters: targets.water,
      dailyFiberTargetG: targets.fiber,
      ironTargetMg: targets.iron,
      calciumTargetMg: targets.calcium,
      vitDTargetMcg: targets.vitD,
      vitCTargetMg: targets.vitC
    };
    try {
      await api.put('/profiles/me', payload);
      localStorage.setItem('nutrimunch_user_targets', JSON.stringify({
        calories: targets.calories,
        protein: targets.protein,
        carbs: targets.carbs,
        fats: targets.fats,
        water: targets.water,
        fiber: targets.fiber,
        iron: targets.iron,
        calcium: targets.calcium,
        vitD: targets.vitD,
        vitC: targets.vitC
      }));
      localStorage.setItem('nutrimunch_water_target_liters', String(targets.water));
      window.dispatchEvent(new Event('nutrimunch_profile_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (requestError) {
      setError(requestError?.response?.status === 401
        ? 'Please sign in to import daily targets.'
        : 'Could not import daily targets. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const importTargets = () => importTargetValues(planTargets);

  const handleCopy = () => {
    navigator.clipboard.writeText(plan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="aidg-root">

        {/* Header */}
        <div className="aidg-header">
          <div className="aidg-header-icon-wrap">
            <Icon name="restaurant_menu" size={28} style={{ color: '#a5d391' }} />
          </div>
          <div>
            <h1 className="aidg-title">AI Diet Plan Generator</h1>
            <p className="aidg-subtitle">Select your goals &amp; dietary needs, then let AI craft your personalized plan.</p>
          </div>
        </div>

        <form onSubmit={generatePlan} className="aidg-form">
          <div className="aidg-field">
            <label className="aidg-label" style={{ color: '#a5d391' }}>
              <Icon name="receipt_long" size={18} />
              Personalized Plan Heading
            </label>
            <input
              className="aidg-heading-input"
              value={planHeading}
              onChange={event => setPlanHeading(event.target.value)}
              placeholder="e.g. Mihir's Weight Gain Protocol"
              maxLength={120}
            />
            <span className="aidg-heading-help">This heading is used when the plan is saved in Diet Plans.</span>
          </div>

          <div className="aidg-divider" />

          <TagInput
            label="Health Goals"
            iconName="flag"
            accentColor="#a5d391"
            predefined={PREDEFINED_GOALS}
            selected={selectedGoals}
            onSelect={t => addTag(selectedGoals, setSelectedGoals, t)}
            onRemove={t => removeTag(selectedGoals, setSelectedGoals, t)}
          />

          <div className="aidg-divider" />

          <TagInput
            label="Allergies & Dietary Restrictions"
            iconName="no_food"
            accentColor="#ffb764"
            predefined={PREDEFINED_RESTRICTIONS}
            selected={selectedRestrictions}
            onSelect={t => addTag(selectedRestrictions, setSelectedRestrictions, t)}
            onRemove={t => removeTag(selectedRestrictions, setSelectedRestrictions, t)}
          />

          {error && (
            <div className="aidg-error">
              <Icon name="warning" size={18} />
              {error}
            </div>
          )}

          <div className="aidg-form-footer">
            <div className="aidg-selection-summary">
              {selectedGoals.length > 0
                ? <span><strong style={{ color: '#a5d391' }}>{selectedGoals.length}</strong> goal{selectedGoals.length > 1 ? 's' : ''}</span>
                : <span style={{ opacity: 0.4 }}>No goals selected</span>}
              {selectedRestrictions.length > 0 && (
                <span> · <strong style={{ color: '#ffb764' }}>{selectedRestrictions.length}</strong> restriction{selectedRestrictions.length > 1 ? 's' : ''}</span>
              )}
            </div>
            <button type="submit" className="aidg-generate-btn" disabled={loading}>
              {loading ? (
                <><span className="aidg-spin"><Icon name="autorenew" size={18} /></span> Generating…</>
              ) : (
                <><Icon name="auto_awesome" size={18} /> Generate My Diet Plan</>
              )}
            </button>
          </div>
        </form>

        {plan && (
          <div className="aidg-result">
            <div className="aidg-result-header">
              <Icon name="receipt_long" size={22} style={{ color: '#a5d391' }} />
              <h2 className="aidg-result-title">Your Personalized Diet Plan</h2>
              <div className="aidg-result-actions">
                <button className="aidg-action-btn" type="button" onClick={savePlan} disabled={saving || saved}>
                  <Icon name={saved ? 'check_circle' : 'save'} size={15} />
                  {saving ? 'Saving…' : saved ? 'Saved' : 'Save Plan'}
                </button>
                <button className="aidg-action-btn aidg-import-btn" type="button" onClick={importTargets} disabled={importing}>
                  <Icon name="sync_alt" size={15} />
                  {importing ? 'Importing…' : 'Import Targets'}
                </button>
                <button className="aidg-copy-btn" type="button" onClick={handleCopy}>
                  <Icon name="content_copy" size={15} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="aidg-result-tags">
              {selectedGoals.map(g => <span key={g} className="aidg-result-tag goal">{g}</span>)}
              {selectedRestrictions.map(r => <span key={r} className="aidg-result-tag restriction">{r}</span>)}
            </div>

            <PlanDisplay plan={plan} planData={planData} />
          </div>
        )}
      </div>
    </>
  );
};

/* ─── Scoped CSS ─────────────────────────────────────────────────────── */
const CSS = `
.aidg-root {
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
  font-family: 'Inter', system-ui, sans-serif;
}

/* Header */
.aidg-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;
}
.aidg-header-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: rgba(165,211,145,0.12);
  border: 1px solid rgba(165,211,145,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.aidg-title {
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 3px;
  letter-spacing: -0.4px;
}
.aidg-subtitle {
  font-size: 13.5px;
  color: rgba(255,255,255,0.45);
  margin: 0;
}

/* Form card */
.aidg-form {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 22px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  margin-bottom: 24px;
}
.aidg-divider {
  height: 1px;
  background: rgba(255,255,255,0.06);
  margin: 2px 0;
}

/* Field */
.aidg-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.aidg-heading-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(165,211,145,0.25);
  border-radius: 12px;
  background: rgba(0,0,0,0.2);
  color: #fff;
  padding: 12px 14px;
  font: inherit;
  font-size: 13px;
  outline: none;
}
.aidg-heading-input:focus { border-color: rgba(165,211,145,0.75); }
.aidg-heading-input::placeholder { color: rgba(255,255,255,0.32); }
.aidg-heading-help { color: rgba(255,255,255,0.38); font-size: 11px; }
.aidg-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 1.1px;
  text-transform: uppercase;
  margin: 0;
}

/* Selected tag chips */
.aidg-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.aidg-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 5px 10px 5px 13px;
  font-size: 12.5px;
  font-weight: 600;
  animation: aidg-pop 0.18s ease;
  border-width: 1px;
  border-style: solid;
}
@keyframes aidg-pop {
  from { transform: scale(0.8); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
.aidg-tag-remove {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0;
  transition: opacity 0.15s;
  opacity: 0.65;
}
.aidg-tag-remove:hover { opacity: 1; }

/* Search */
.aidg-search-wrap { position: relative; }
.aidg-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255,255,255,0.3);
  display: flex;
  pointer-events: none;
}
.aidg-search-input {
  width: 100%;
  box-sizing: border-box;
  background: rgba(8,11,18,0.65);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 13px;
  padding: 11px 14px 11px 38px;
  color: #fff;
  font-size: 13.5px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.aidg-search-input:focus { border-color: rgba(165,211,145,0.4); }
.aidg-search-input::placeholder { color: rgba(255,255,255,0.25); }

/* Dropdown */
.aidg-dropdown {
  position: absolute;
  top: calc(100% + 5px);
  left: 0; right: 0;
  background: #0c1119;
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 13px;
  max-height: 210px;
  overflow-y: auto;
  z-index: 200;
  padding: 5px;
  box-shadow: 0 14px 40px rgba(0,0,0,0.55);
}
.aidg-dropdown::-webkit-scrollbar { width: 4px; }
.aidg-dropdown::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
.aidg-dropdown-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  background: none;
  border: none;
  border-radius: 9px;
  padding: 9px 11px;
  color: rgba(255,255,255,0.75);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.13s, color 0.13s;
}
.aidg-dropdown-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
.aidg-dropdown-empty {
  padding: 12px 14px;
  font-size: 12.5px;
  color: rgba(255,255,255,0.35);
  font-style: italic;
}

/* Custom input row */
.aidg-custom-row {
  display: flex;
  gap: 9px;
  align-items: stretch;
}
.aidg-custom-input {
  flex: 1;
  background: rgba(8,11,18,0.5);
  border: 1.5px dashed rgba(255,255,255,0.1);
  border-radius: 13px;
  padding: 11px 15px;
  color: #fff;
  font-size: 13.5px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, border-style 0.2s;
}
.aidg-custom-input:focus { border-color: rgba(165,211,145,0.35); border-style: solid; }
.aidg-custom-input::placeholder { color: rgba(255,255,255,0.2); }
.aidg-custom-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.04);
  border-width: 1px;
  border-style: solid;
  border-radius: 13px;
  padding: 0 16px;
  font-size: 12.5px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
  white-space: nowrap;
  min-height: 44px;
}
.aidg-custom-add-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
.aidg-custom-add-btn:disabled { opacity: 0.38; cursor: not-allowed; }

/* Spin */
.aidg-spin {
  display: inline-flex;
  animation: aidg-spin 0.75s linear infinite;
}
@keyframes aidg-spin { to { transform: rotate(360deg); } }

/* Validation banner */
.aidg-validation-banner {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  border-radius: 11px;
  padding: 11px 14px;
  font-size: 13px;
  line-height: 1.5;
  animation: aidg-pop 0.18s ease;
  border-width: 1px;
  border-style: solid;
}
.aidg-validation-banner.valid {
  background: rgba(165,211,145,0.08);
  border-color: rgba(165,211,145,0.22);
  color: #a5d391;
}
.aidg-validation-banner.invalid {
  background: rgba(255,107,107,0.07);
  border-color: rgba(255,107,107,0.18);
  color: #ff9b9b;
}
.aidg-normalized { opacity: 0.75; margin-left: 3px; }

/* Error */
.aidg-error {
  display: flex;
  align-items: center;
  gap: 9px;
  background: rgba(255,107,107,0.07);
  border: 1px solid rgba(255,107,107,0.18);
  color: #ff9b9b;
  border-radius: 11px;
  padding: 11px 14px;
  font-size: 13.5px;
}

/* Form footer */
.aidg-form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-top: 4px;
}
.aidg-selection-summary {
  font-size: 13px;
  color: rgba(255,255,255,0.55);
}

/* Generate button */
.aidg-generate-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  background: linear-gradient(130deg, #a5d391 0%, #6fc454 100%);
  color: #071204;
  border: none;
  border-radius: 14px;
  padding: 14px 28px;
  font-size: 14.5px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 4px 22px rgba(165,211,145,0.28);
  letter-spacing: 0.2px;
  white-space: nowrap;
}
.aidg-generate-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 7px 28px rgba(165,211,145,0.42);
}
.aidg-generate-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

/* Result */
.aidg-result {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(165,211,145,0.13);
  border-radius: 22px;
  padding: 24px;
  animation: aidg-pop 0.25s ease;
}
.aidg-result-header {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.aidg-result-title {
  font-size: 18px;
  font-weight: 800;
  color: #fff;
  margin: 0;
  flex: 1;
}
.aidg-result-actions {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}
.aidg-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(165,211,145,0.13);
  border: 1px solid rgba(165,211,145,0.28);
  color: #a5d391;
  border-radius: 9px;
  padding: 6px 11px;
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, opacity 0.15s;
}
.aidg-action-btn:hover:not(:disabled) { background: #a5d391; color: #071204; }
.aidg-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.aidg-import-btn {
  color: #67d8f5;
  border-color: rgba(103,216,245,0.28);
  background: rgba(103,216,245,0.1);
}
.aidg-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.09);
  color: rgba(255,255,255,0.55);
  border-radius: 9px;
  padding: 6px 13px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.aidg-copy-btn:hover { background: rgba(255,255,255,0.09); color: #fff; }
.aidg-result-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 18px;
}
.aidg-result-tag {
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 999px;
  padding: 3px 11px;
  border-width: 1px;
  border-style: solid;
}
.aidg-result-tag.goal   { background: rgba(165,211,145,0.1); border-color: rgba(165,211,145,0.22); color: #a5d391; }
.aidg-result-tag.restriction { background: rgba(255,183,100,0.09); border-color: rgba(255,183,100,0.22); color: #ffb764; }
.aidg-target-summary {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 7px;
}
.aidg-target-summary span {
  background: rgba(255,255,255,0.04);
  border-radius: 9px;
  padding: 8px 5px;
  color: rgba(255,255,255,0.5);
  text-align: center;
  font-size: 10px;
}
.aidg-target-summary b { display: block; color: #fff; font-size: 12px; margin-bottom: 2px; }
.aidg-meal-list { display: flex; flex-direction: column; gap: 9px; }
.aidg-meal-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 12px;
  background: rgba(0,0,0,0.22);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
}
.aidg-meal-row strong, .aidg-meal-row span, .aidg-meal-row small { display: block; }
.aidg-meal-row strong { color: #fff; font-size: 12px; }
.aidg-meal-row span { color: #a5d391; font-size: 10px; margin-top: 3px; }
.aidg-meal-row small { color: rgba(255,255,255,0.5); font-size: 11px; margin-top: 5px; }
.aidg-meal-macros { text-align: right; white-space: nowrap; }
.aidg-meal-macros b { color: #fff; font-size: 12px; }
.aidg-meal-macros span { color: rgba(255,255,255,0.5); font-size: 10px; }
@media (max-width: 700px) {
  .aidg-target-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .aidg-meal-row { align-items: flex-start; flex-direction: column; }
  .aidg-meal-macros { text-align: left; }
}

.aidg-plan-body { display: flex; flex-direction: column; gap: 14px; }
.aidg-plan-section {
  background: rgba(255,255,255,0.025);
  border-radius: 12px;
  padding: 14px 17px;
  border-left: 3px solid rgba(165,211,145,0.35);
}
.aidg-plan-section-title {
  font-size: 13px;
  font-weight: 700;
  color: #a5d391;
  margin: 0 0 7px;
  text-transform: uppercase;
  letter-spacing: 0.7px;
}
.aidg-plan-pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 13.5px;
  line-height: 1.75;
  color: rgba(255,255,255,0.75);
  margin: 0;
}
`;

export default AiDietGenerator;
