/**
 * Utility to asynchronously load Razorpay Checkout SDK
 */
export const loadRazorpay = () => {
    return new Promise((resolve) => {
        if (typeof window !== 'undefined' && window.Razorpay) {
            resolve(true);
            return;
        }
        const existingScript = document.getElementById('razorpay-checkout-sdk');
        if (existingScript) {
            existingScript.onload = () => resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.id = 'razorpay-checkout-sdk';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => {
            console.error('Failed to load Razorpay SDK');
            resolve(false);
        };
        document.body.appendChild(script);
    });
};
